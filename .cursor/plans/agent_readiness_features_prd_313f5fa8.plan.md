---
name: Agent readiness features PRD
overview: Write a comprehensive PRD for 10 agent-readiness features that turn @convex-dev/llms-txt into a one-install solution for making any Convex app score high on isitagentready.com, plus widget tab visibility controls, the `npx llms-txt agent-ready` command, security hardening, and documentation updates for both authors and consumers.
todos:
  - id: write-prd
    content: Write prds/agent-readiness-v1.md with all 10 features, widget visibility, CLI commands, security, and docs plan
    status: completed
  - id: update-task-md
    content: Add M31 through M45 milestones to TASK.md under a new 'Agent Readiness' section
    status: completed
  - id: update-changelog
    content: Add Unreleased entries to changelog.md for planned agent-readiness features
    status: completed
  - id: update-files-md
    content: Add entries to files.md for the new CLI commands and PRD file
    status: completed
isProject: false
---

# Agent readiness features for @convex-dev/llms-txt

## Scope

Write a single PRD at `prds/agent-readiness-v1.md` covering all 10 features, widget tab visibility, the CLI command, security, and documentation. Then update project tracking files (`TASK.md`, `changelog.md`, `files.md`). Two separate doc sections: one for the component author (SETUP.md additions), one for consumers (INTEGRATION.md additions).

## Key files to create

- `prds/agent-readiness-v1.md` (the PRD, ~400 lines)

## Key files to edit

- [TASK.md](TASK.md): add new milestone block "Agent Readiness (M31 through M45)"
- [changelog.md](changelog.md): add Unreleased entries for the planned features
- [files.md](files.md): add entries for new files that will be created during implementation

## PRD structure (10 features + extras)

### Feature 1: Content-Signal response headers

- New `contentSignals` object in settings schema and config
- Append `Content-Signal` header to every file route response in [src/client/index.ts](src/client/index.ts)
- Default: `ai-train=yes, search=yes, ai-input=yes`
- Config override per signal: `{ aiTrain: boolean, search: boolean, aiInput: boolean }`

### Feature 2: x-markdown-tokens header

- Compute `Math.ceil(content.length / 4)` for every cached file response
- Add `x-markdown-tokens` header alongside ETag in `buildFileRoute` in [src/client/index.ts](src/client/index.ts)
- Zero config, always on

### Feature 3: Markdown content negotiation

- New `markdownNegotiation` boolean in `RegisterRoutesOptions`
- When enabled, register additional route handlers that check `Accept: text/markdown`
- Look up page by path from the `pages` table, return `fullContent` as `text/markdown`
- Include `x-markdown-tokens`, `Content-Signal`, `Vary: Accept` headers
- New setting: `markdownNegotiationPaths: string[]` for which page paths to intercept

### Feature 4: Discovery Link headers

- Add RFC 8288 `Link` headers to `/llms-status` and optionally all file routes
- Points to `/llms.txt`, `/agents.md` with correct `rel` and `type`
- New boolean setting: `discoveryHeaders: true`

### Feature 5: robots.txt generation

- New `robotsTxt` config section: `{ enabled: boolean, allowAiBots: boolean, customRules: string[] }`
- New HTTP route: `GET /robots.txt` (path configurable)
- Generated content includes `User-agent` directives for known AI bots, `Sitemap` pointer
- CLI command: `npx llms-txt robots` prints the recommended fragment
- Security: never expose internal paths, only public page paths

### Feature 6: Sitemap generation

- New `sitemap` config section: `{ enabled: boolean }`
- New HTTP route: `GET /sitemap.xml` (path configurable)
- Generated from published pages with `lastmod` from `generatedAt`
- Standard XML sitemap format
- Linked from robots.txt when both are enabled

### Feature 7: /.well-known/agent-skills endpoint

- New HTTP route: `GET /.well-known/agent-skills`
- JSON generated from `pages` + `apiEndpoints` tables
- Format follows emerging agent-skills spec: `{ name, description, skills: [...] }`
- New boolean setting: `agentSkillsEnabled: true`

### Feature 8: Agent readiness self-score endpoint

- New HTTP route: `GET /llms-readiness`
- JSON response with pass/fail per check:
  - llms.txt exists and returns 200
  - agents.md exists and returns 200
  - Content-Signal headers present
  - x-markdown-tokens header present
  - robots.txt configured for AI bots
  - sitemap.xml exists
  - agent-skills endpoint active
  - Markdown negotiation enabled
  - Discovery Link headers enabled
  - testMode is off
- Numeric score 0 to 100
- New boolean setting: `readinessEndpointEnabled: true`

### Feature 9: npx llms-txt agent-ready command

- New CLI command that enables all agent-readiness features with sensible defaults
- Reads current `llms-txt.config.json`, patches in:
  - `contentSignals: { aiTrain: true, search: true, aiInput: true }`
  - `robotsTxt: { enabled: true, allowAiBots: true }`
  - `sitemap: { enabled: true }`
  - `agentSkillsEnabled: true`
  - `readinessEndpointEnabled: true`
  - `discoveryHeaders: true`
  - `markdownNegotiation: true`
- Runs sync automatically
- Prints readiness score after

### Feature 10: npx llms-txt scan command

- New CLI command that runs readiness checks against a live deployment
- Accepts `--url` flag or reads `appUrl` from config
- Curls each endpoint, checks headers, prints terminal report with pass/fail
- No Convex function needed, pure HTTP checks from the CLI

### Feature 11: Widget tab visibility controls

- New props on React and Svelte widgets:

```typescript
type LlmsTxtWidgetProps = {
  // ...existing props...
  showHumanTab?: boolean; // default true
  showMachineTab?: boolean; // default true
  showScoreTab?: boolean; // default false
  defaultTab?: "HUMAN" | "MACHINE" | "SCORE";
  tabs?: Array<"HUMAN" | "MACHINE" | "SCORE">; // explicit ordering
};
```

- New SCORE tab fetches `/llms-readiness` and displays:
  - Numeric score with color indicator (green >= 80, yellow >= 50, red < 50)
  - Expandable checklist of pass/fail items
  - "Run `npx llms-txt agent-ready` to improve" hint when score < 80
- If only one tab is shown, hide the tab bar entirely
- If a tab is hidden, it cannot be the default
- Both React and Svelte widgets updated

### Security features

All new endpoints follow existing security patterns:

1. **testMode gate**: All new routes (`robots.txt`, `sitemap.xml`, `agent-skills`, `readiness`) respect `testMode`, returning 403 for non-localhost when enabled
2. **Rate limiting on readiness**: The `/llms-readiness` endpoint is cached (max-age=300) to prevent abuse as a free scanner
3. **No internal path leakage**: robots.txt and sitemap only expose paths from the `pages` table with status `published`. No internal Convex paths, no admin routes
4. **Content-Signal opt-out**: Each signal is individually toggleable. Default is all-yes but operators can disable `aiTrain` to signal "do not train on this content"
5. **Readiness endpoint auth**: Optional `LLMS_READINESS_SECRET` env var for Bearer token auth, same pattern as analytics
6. **Input sanitization**: All config values that end up in generated XML/JSON are escaped. Path values validated against injection
7. **robots.txt Disallow patterns**: Support `disallowPaths: string[]` in config to explicitly block paths from crawlers
8. **Markdown negotiation scope**: Only serves markdown for paths explicitly registered in the `pages` table. Requests for unregistered paths fall through to the normal handler

### Documentation updates

**SETUP.md** additions (Part 1 author docs, after section 13):

- New section: "14. Enable agent readiness features"
- Covers running `npx llms-txt agent-ready`
- Verify with `npx llms-txt scan`

**INTEGRATION.md** additions (consumer docs):

- New SECTION: Agent readiness quick start
- New SECTION: Content-Signal configuration
- New SECTION: Markdown content negotiation
- New SECTION: robots.txt and sitemap
- New SECTION: Agent skills endpoint
- New SECTION: Readiness score endpoint
- New SECTION: Widget tab configuration
- New SECTION: Security reference for agent-readiness routes

## Implementation order

These map to new milestones M31 through M45 in TASK.md:

- M31: Content-Signal headers (30 min)
- M32: x-markdown-tokens header (15 min)
- M33: Discovery Link headers (30 min)
- M34: Widget tab visibility props + SCORE tab skeleton (2 hrs)
- M35: robots.txt generation route + config (1.5 hrs)
- M36: sitemap.xml generation route + config (1 hr)
- M37: /.well-known/agent-skills route (1 hr)
- M38: Markdown content negotiation (2 hrs)
- M39: Readiness self-score endpoint (2 hrs)
- M40: SCORE tab wired to readiness endpoint (1 hr)
- M41: `npx llms-txt agent-ready` CLI command (1 hr)
- M42: `npx llms-txt scan` CLI command (1.5 hrs)
- M43: Security hardening pass across all new routes (1 hr)
- M44: SETUP.md and INTEGRATION.md updates (1 hr)
- M45: Svelte widget parity for SCORE tab and visibility props (1 hr)

## Schema changes

New fields on the `settings` table in [src/component/schema.ts](src/component/schema.ts):

```typescript
contentSignals: v.optional(v.object({
  aiTrain: v.boolean(),
  search: v.boolean(),
  aiInput: v.boolean(),
})),
robotsTxtEnabled: v.optional(v.boolean()),
robotsTxtAllowAiBots: v.optional(v.boolean()),
robotsTxtDisallowPaths: v.optional(v.array(v.string())),
sitemapEnabled: v.optional(v.boolean()),
agentSkillsEnabled: v.optional(v.boolean()),
readinessEndpointEnabled: v.optional(v.boolean()),
discoveryHeaders: v.optional(v.boolean()),
markdownNegotiation: v.optional(v.boolean()),
```

All new fields are `v.optional()` for backward compatibility. Existing deployments continue to work without migration.

## New HTTP routes summary

| Route                     | Method | Content-Type     | Auth                       | Default |
| ------------------------- | ------ | ---------------- | -------------------------- | ------- |
| /robots.txt               | GET    | text/plain       | testMode                   | off     |
| /sitemap.xml              | GET    | application/xml  | testMode                   | off     |
| /.well-known/agent-skills | GET    | application/json | testMode                   | off     |
| /llms-readiness           | GET    | application/json | testMode + optional secret | off     |

## New CLI commands summary

| Command        | Description                                          |
| -------------- | ---------------------------------------------------- |
| `agent-ready`  | Enable all agent-readiness features with one command |
| `scan [--url]` | Run readiness checks against a live deployment       |
| `robots`       | Print recommended robots.txt fragment                |

## Files that will be created during implementation

- `cli/commands/agent-ready.mjs`
- `cli/commands/scan.mjs`
- `cli/commands/robots.mjs`
- `prds/agent-readiness-v1.md` (the PRD itself)

## Files that will be modified during implementation

- `src/component/schema.ts` (new optional fields)
- `src/client/index.ts` (new routes, headers, negotiation)
- `src/client/types.ts` (new types for settings, options)
- `src/component/generation.ts` (robots.txt, sitemap, agent-skills renderers)
- `src/component/content.ts` (readiness score query, new settings fields)
- `src/react/LlmsTxtWidget.tsx` (SCORE tab, visibility props)
- `src/svelte/LlmsTxtWidget.svelte` (SCORE tab, visibility props)
- `src/react/useLlmsTxtStatus.ts` (readiness data)
- `cli/index.mjs` (register new commands)
- `SETUP.md` (author docs for agent readiness)
- `INTEGRATION.md` (consumer docs for agent readiness)
- `TASK.md` (new milestones M31 through M45)
- `changelog.md` (new entries)
- `files.md` (new file entries)
- `README.md` (feature list update)
- `example-react/llms-txt.config.json` (demo config with new fields)
- `example-svelte/llms-txt.config.json` (demo config with new fields)
