# Agent readiness features for @waynesutton/agent-ready

## Problem

The component generates `llms.txt`, `agents.md`, and `llms-full.txt` today, which covers the content layer of agent readiness. But the broader agent readiness ecosystem now expects more:

- Cloudflare's [Markdown for Agents](https://blog.cloudflare.com/markdown-for-agents/) is shipping `Accept: text/markdown` content negotiation across the web. Coding agents already send these headers.
- [isitagentready.com](https://isitagentready.com/) scans sites across five categories: Discoverability, Content Accessibility, Bot Access Control, Protocol Discovery, and Commerce. Today this component only covers a subset of category 2.
- Sites need `Content-Signal` headers, `robots.txt` rules for AI bots, sitemap entries, well-known endpoints (`agent-skills`), and discoverable metadata to be considered "agent ready".

A consumer who installs `@waynesutton/agent-ready` should get all of this for free with one command.

## Goals

- Ship 10 features that bring any Convex app from "has llms.txt" to "passes 90%+ on isitagentready.com".
- One command (`npx llms-txt agent-ready`) enables the full set with sensible defaults.
- Widget gets a third `SCORE` tab that surfaces the readiness score and per-check status. All three tabs (`HUMAN`, `MACHINE`, `SCORE`) can be individually shown or hidden.
- Every new endpoint follows existing security patterns: `testMode` gate, optional bearer token auth, no internal path leakage, content sanitization.
- Two doc surfaces stay separate: `SETUP.md` for the package author, `INTEGRATION.md` for consumers.

## Non-goals

- Implementing a full MCP server, A2A agent card, OAuth discovery, or x402 commerce protocol. These are listed in the long-tail backlog at the bottom of the doc but not part of v1.
- Adding new dependencies. Everything below uses what the component already has: Convex schema, HTTP routes, workpool, crons.
- Migrating existing deployments. All schema changes are `v.optional()` so existing settings rows continue to work without backfill.

## Proposed solution

10 features grouped into four buckets: response headers, new HTTP routes, new CLI commands, widget upgrades. Each feature is independently togglable. The `agent-ready` command flips them all on.

### Feature 1: Content-Signal response headers

[Content Signals](https://contentsignals.org/) lets sites declare how their content can be used by AI systems. Cloudflare's Markdown for Agents already emits this header on every converted response.

**Behavior:**

- Append `Content-Signal: ai-train=yes, search=yes, ai-input=yes` to every response from the file routes (`/llms.txt`, `/agents.md`, `/llms-full.txt`) and the new routes added by this PRD.
- Each signal is individually configurable. Operators who want to allow search but block training can set `aiTrain: false`.
- Default is all-yes since the operator already opted into publishing `llms.txt`.

**Schema change:**

```typescript
// settings table
contentSignals: v.optional(
  v.object({
    aiTrain: v.boolean(),
    search: v.boolean(),
    aiInput: v.boolean(),
  }),
),
```

**Code change:**

In `src/client/index.ts`, add a `buildContentSignalHeader(settings)` helper. Append the result to every response that serves agent-targeted content. When the field is omitted, fall back to all-yes.

### Feature 2: x-markdown-tokens header

Cloudflare's converted responses include `x-markdown-tokens` so agents can plan chunking and context budget before reading the body.

**Behavior:**

- Estimate tokens with `Math.ceil(content.length / 4)`. This matches Cloudflare's approximation and avoids an external tokenizer dependency.
- Always on. No config knob.
- Added on `/llms.txt`, `/agents.md`, `/llms-full.txt`, and on any markdown response from the new negotiation handler.

**Code change:**

```typescript
// inside buildFileRoute
const tokens = Math.ceil(cached.content.length / 4);
return new Response(cached.content, {
  status: 200,
  headers: {
    ETag: etag,
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": contentType,
    "x-markdown-tokens": String(tokens),
    "Content-Signal": buildContentSignalHeader(settings),
  },
});
```

### Feature 3: Markdown content negotiation

Coding agents like Claude Code and OpenCode send `Accept: text/markdown` headers. Cloudflare intercepts this at the CDN. For Convex-hosted apps that do not sit behind Cloudflare, this component can do the same at the app layer.

**Behavior:**

- New `markdownNegotiation` boolean in `RegisterRoutesOptions` and on the `settings` row.
- When enabled, install a single shared HTTP middleware that runs before the SPA fallback (or any catch-all). The middleware checks:
  - Method is `GET`
  - `Accept` header includes `text/markdown` (with quality value parsing)
  - Path matches a registered page in the `pages` table with `status === "published"` and `fullContent` set
- If matched, return `fullContent` with `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept`, `x-markdown-tokens`, and `Content-Signal`.
- If not matched, return `null` so downstream handlers run.

**Schema change:**

```typescript
// settings table
markdownNegotiation: v.optional(v.boolean()),
```

**Note:** The component does not own the host app's HTTP catch-all. Consumers wire the middleware by calling a new helper `mountMarkdownNegotiation(http, components.agentReady)` documented in `INTEGRATION.md`. The helper registers a wildcard route only for `markdownNegotiationPaths` so the host's existing routes are untouched.

### Feature 4: Discovery Link headers

RFC 8288 `Link` response headers tell agents where to find related resources without parsing HTML. The isitagentready.com scanner checks for them under "Discoverability".

**Behavior:**

- New boolean setting `discoveryHeaders`.
- When enabled, every response from a registered route adds:

```
Link: </llms.txt>; rel="alternate"; type="text/plain",
      </agents.md>; rel="alternate"; type="text/markdown",
      </sitemap.xml>; rel="sitemap"; type="application/xml"
```

- The `</sitemap.xml>` segment is only included when `sitemapEnabled` is true.

**Schema change:**

```typescript
discoveryHeaders: v.optional(v.boolean()),
```

### Feature 5: robots.txt generation

isitagentready.com checks for AI bot allow-rules in `robots.txt`.

**Behavior:**

- New HTTP route `GET /robots.txt` (path configurable via `robotsTxtPath`).
- Generated content includes:
  - `User-agent: *` plus any `disallowPaths` from config.
  - `User-agent` directives for known AI bots from `KNOWN_AGENTS` in `lib.ts`. Each one gets `Allow: /` (or `Disallow: /` if `allowAiBots` is `false`).
  - `Sitemap: https://<appUrl>/sitemap.xml` when `sitemapEnabled` is true.
  - `Sitemap: https://<appUrl>/llms.txt` always (this is what llmstxt.org recommends).
- Cached in `cachedFiles` like the other generated files. Regenerated on `regenerateAll`.

**Schema change:**

```typescript
robotsTxtEnabled: v.optional(v.boolean()),
robotsTxtAllowAiBots: v.optional(v.boolean()),
robotsTxtDisallowPaths: v.optional(v.array(v.string())),
```

Add a new `fileType` literal `"robots.txt"` to the schema's union and to the `cachedFiles` discriminator. This requires updating:

- `src/component/schema.ts` (file type union)
- `src/component/generation.ts` (new `renderRobotsTxt` function, hash, write)
- `src/client/types.ts` (add `"robots.txt"` to `LlmsFileType`)

**Security:** Only emit paths from the `pages` table with `status === "published"`. Never reflect raw config values into the output without sanitization. Strip `\n` and `\r` from any path that goes into a `Disallow:` line.

**CLI:**

```bash
npx llms-txt robots
```

Prints the recommended fragment for the operator to inspect. Does not require a Convex deployment.

### Feature 6: sitemap.xml generation

Companion to robots.txt. Standard XML sitemap format.

**Behavior:**

- New HTTP route `GET /sitemap.xml` (path configurable).
- Generated from published pages in the `pages` table with `lastmod` set to the page's most recent version timestamp (from `pageVersions`) or `cachedFiles.generatedAt` as a fallback.
- Cached in `cachedFiles` with `fileType: "sitemap.xml"`.

**Schema change:**

```typescript
sitemapEnabled: v.optional(v.boolean()),
```

Add `"sitemap.xml"` to the `fileType` union.

**Security:** Escape XML special characters (`&`, `<`, `>`, `'`, `"`) in every URL written into the output. Use a dedicated `escapeXml(value: string): string` helper in `lib.ts`.

### Feature 7: /.well-known/agent-skills endpoint

The isitagentready.com scanner checks for this. It is an emerging convention for advertising what an app can do for an agent.

**Behavior:**

- New HTTP route `GET /.well-known/agent-skills`.
- JSON body generated from `pages` and `apiEndpoints` tables. Format:

```json
{
  "name": "<settings.appName>",
  "description": "<settings.description>",
  "skills": [
    {
      "name": "<page.title>",
      "description": "<page.description>",
      "type": "page",
      "url": "<settings.appUrl><page.path>"
    },
    {
      "name": "<endpoint.method> <endpoint.path>",
      "description": "<endpoint.description>",
      "type": "api",
      "method": "<endpoint.method>",
      "url": "<settings.appUrl><endpoint.path>"
    }
  ]
}
```

- Cached in `cachedFiles` with `fileType: "agent-skills.json"`.

**Schema change:**

```typescript
agentSkillsEnabled: v.optional(v.boolean()),
```

### Feature 8: Agent readiness self-score endpoint

Built-in version of isitagentready.com scoped to this deployment.

**Behavior:**

- New HTTP route `GET /llms-readiness`.
- JSON response shape:

```typescript
type ReadinessReport = {
  score: number; // 0 to 100
  checks: Array<{
    id: string;
    label: string;
    category: "discoverability" | "content" | "bots" | "protocol";
    status: "pass" | "fail" | "warn";
    detail?: string;
  }>;
  generatedAt: number;
};
```

- Checks (each contributes to the score):
  - `llms_txt_present` (10 pts)
  - `agents_md_present` (10 pts)
  - `content_signals_header` (10 pts)
  - `markdown_tokens_header` (5 pts)
  - `markdown_negotiation` (10 pts)
  - `discovery_link_headers` (5 pts)
  - `robots_txt_present` (10 pts)
  - `sitemap_xml_present` (10 pts)
  - `agent_skills_endpoint` (10 pts)
  - `test_mode_off` (15 pts)
  - `etag_supported` (5 pts)
- Score is the sum of points for `pass` checks. `warn` returns half points.
- Caching: `Cache-Control: public, max-age=300` to prevent abuse as a free scanner.
- Auth: optional `AGENT_READY_READINESS_SECRET` env var (legacy `LLMS_READINESS_SECRET` is also honored as a fallback). When set, requests must include `Authorization: Bearer <secret>`. When unset, the endpoint is public (operator decides).

**Schema change:**

```typescript
readinessEndpointEnabled: v.optional(v.boolean()),
```

### Feature 9: npx llms-txt agent-ready command

One command to enable everything.

**Behavior:**

```bash
npx llms-txt agent-ready
```

- Reads `llms-txt.config.json`.
- Patches the `settings` block with:

```json
{
  "contentSignals": { "aiTrain": true, "search": true, "aiInput": true },
  "markdownNegotiation": true,
  "discoveryHeaders": true,
  "robotsTxtEnabled": true,
  "robotsTxtAllowAiBots": true,
  "sitemapEnabled": true,
  "agentSkillsEnabled": true,
  "readinessEndpointEnabled": true
}
```

- Writes the file back.
- Calls `agentReady:content:sync` with the new config.
- Calls `agentReady:content:regenerateAll` to rebuild cached files.
- Curls `/llms-readiness` and prints the score.

**File:** `cli/commands/agent-ready.mjs`.

### Feature 10: npx llms-txt scan command

Run readiness checks from the developer's terminal against any deployment.

**Behavior:**

```bash
npx llms-txt scan                          # uses appUrl from llms-txt.config.json
npx llms-txt scan --url https://my.app    # one-off URL
```

- Pure HTTP from the CLI. No Convex function involved.
- Curls each endpoint, inspects status codes and response headers.
- Prints a table:

```
PASS  llms.txt           200 OK   etag: "a3f8...", tokens: 412
PASS  agents.md          200 OK   etag: "92cc...", tokens: 87
FAIL  Content-Signal     header missing on /llms.txt
PASS  robots.txt         200 OK
WARN  sitemap.xml        404 Not Found (sitemap is optional)
PASS  agent-skills       200 OK
...
Score: 75 / 100
```

- Returns exit code 1 if score is below 80 so it can run in CI.

**File:** `cli/commands/scan.mjs`.

### Feature 11: Widget tab visibility controls and SCORE tab

The widget gets a third tab plus full visibility control over all three.

**New props (React and Svelte):**

```typescript
type LlmsTxtWidgetProps = {
  // ...existing props...
  showHumanTab?: boolean; // default true
  showMachineTab?: boolean; // default true
  showScoreTab?: boolean; // default true once readiness endpoint is enabled, otherwise false
  defaultTab?: "HUMAN" | "MACHINE" | "SCORE";
  tabs?: Array<"HUMAN" | "MACHINE" | "SCORE">; // explicit ordering, overrides individual show flags
};
```

**Behavior:**

- If only one tab is visible, hide the tab strip entirely and render that panel directly.
- If all tabs are hidden, render nothing (return `null`).
- If `defaultTab` references a hidden tab, fall back to the first visible tab.
- The `tabs` prop is the canonical list when provided. Individual `showXxxTab` props are ignored when `tabs` is set.
- The widget reads `readinessEndpointEnabled` from the status payload. If the endpoint is not enabled and `showScoreTab` was not explicitly set to `true`, hide the SCORE tab automatically.

**SCORE tab content:**

- Numeric score in large mono type with a colored dot:
  - Green when score >= 80
  - Yellow when 50 <= score < 80
  - Red when score < 50
- Below the score, an expandable list of checks with `pass` or `fail` status and short detail text.
- When score < 80, a hint line: ``Run `npx llms-txt agent-ready` to improve``.
- The SCORE tab fetches `/llms-readiness` on mount and re-fetches every 60 seconds while visible.

**Files to change:**

- `src/react/LlmsTxtWidget.tsx`
- `src/react/useAgentReadyStatus.ts` (add an optional `useAgentReadyReadiness()` hook for the score)
- `src/svelte/LlmsTxtWidget.svelte`
- `src/svelte/store.ts` (add `createAgentReadyReadinessStore()`)

## Security

All new surfaces follow the existing patterns from the v6 PRD. Specific guarantees:

1. **testMode gate.** All new HTTP routes (`/robots.txt`, `/sitemap.xml`, `/.well-known/agent-skills`, `/llms-readiness`) check `settings.testMode` and return `403` for non-localhost requests when enabled. Same code path as `/llms.txt`.
2. **No internal path leakage.** robots.txt, sitemap.xml, and agent-skills only emit paths from the `pages` table where `status === "published"` and `deletedAt` is unset. The component never reflects internal Convex paths or admin routes.
3. **Output sanitization.** XML output (sitemap) escapes `& < > ' "`. JSON output (agent-skills, readiness) uses `JSON.stringify` for everything. robots.txt output strips control characters and `\n` `\r` from any path that lands on a `Disallow:` or `Allow:` line.
4. **Bearer token on readiness.** `AGENT_READY_READINESS_SECRET` (legacy `LLMS_READINESS_SECRET` honored) is optional but recommended. When set, requests without `Authorization: Bearer <secret>` get 401. The widget does not include the secret; it falls back to a public read when the endpoint allows it.
5. **Content-Signal opt-out.** Operators control each signal independently. Disabling `aiTrain` flips the header to `ai-train=no`, which is the documented way to refuse training use.
6. **Rate-aware caching.** `/llms-readiness` returns `Cache-Control: public, max-age=300`. `/robots.txt`, `/sitemap.xml`, and `/.well-known/agent-skills` use the same `public, max-age=3600` as the existing file routes.
7. **Markdown negotiation scope.** The negotiation handler only matches paths registered in the `pages` table. Unregistered paths fall through to the host app's normal handlers. The handler refuses to serve drafts or archived pages.
8. **Permissive mode preserved.** `permissiveMode === true && NODE_ENV !== "production"` continues to bypass auth checks for local development. Production deploys always enforce the secrets.
9. **No new env vars required by default.** All features work without secrets when the operator wants public endpoints. Secrets gate access for operators who want it.
10. **Audit log via `onEvent`.** The existing `onEvent` callback fires for the new routes too, so consumers can log every readiness check or robots fetch.

## Documentation updates

Two surfaces, kept separate:

### SETUP.md (author docs)

Add a new section after section 13 "Test the UpdateBanner refresh flow":

- **14. Enable agent readiness on the demos**
  - Run `npx agent-ready` inside `example-react` and `example-svelte`.
  - Verify with `npx agent-ready scan`.
  - Check the SCORE tab in the widget now shows a score of 90+.
  - Update screenshots if they ship in the README.

Renumber the existing "14. Announce checklist" to "15. Announce checklist" and add new bullets for:

- `/robots.txt`, `/sitemap.xml`, `/.well-known/agent-skills`, `/llms-readiness` return `200 OK` on both demos.
- `Content-Signal` and `x-markdown-tokens` headers present on `/llms.txt`.
- Widget SCORE tab is visible by default and shows the live readiness score.

### INTEGRATION.md (consumer docs)

Add new sections in this order, after the existing widget sections:

- **SECTION: Agent readiness quick start.** One-paragraph pitch, single command (`npx llms-txt agent-ready`), one-line verification with `scan`.
- **SECTION: Content-Signal configuration.** Schema example, defaults, how to refuse training use, link to contentsignals.org.
- **SECTION: Markdown content negotiation.** How to enable, what `mountMarkdownNegotiation` does, what the response looks like, link to Cloudflare's announcement.
- **SECTION: robots.txt and sitemap.** Config knobs, security note about path leakage, example output.
- **SECTION: agent-skills endpoint.** Format, where the data comes from, how to keep it in sync.
- **SECTION: Readiness score endpoint.** JSON shape, score calculation, caching behavior, optional bearer token via `AGENT_READY_READINESS_SECRET` (legacy `LLMS_READINESS_SECRET` honored).
- **SECTION: Widget tab configuration.** All three tabs, visibility flags, the `tabs` array prop, how the SCORE tab degrades when the readiness endpoint is disabled.
- **SECTION: Agent readiness security reference.** Single page index of what each new route does, who can hit it, what headers it returns, what env vars it reads.

## Files to change

### Create

- `prds/agent-readiness-v1.md` (this file)
- `cli/commands/agent-ready.mjs`
- `cli/commands/scan.mjs`
- `cli/commands/robots.mjs`

### Edit

- `src/component/schema.ts` (new optional fields, expanded `fileType` union)
- `src/component/content.ts` (new fields in `applySyncConfig`, queries for readiness data, sanitization helpers)
- `src/component/generation.ts` (`renderRobotsTxt`, `renderSitemap`, `renderAgentSkills`, hash and write paths)
- `src/component/lib.ts` (`escapeXml`, `buildContentSignalHeader`, `estimateTokens`, expand `KNOWN_AGENTS` if needed)
- `src/component/analytics.ts` (record readiness endpoint hits with a new `routeKind` field, optional)
- `src/client/index.ts` (new routes, headers on every response, `mountMarkdownNegotiation` helper)
- `src/client/types.ts` (new types for settings, options, readiness report, widget props)
- `src/react/LlmsTxtWidget.tsx` (SCORE tab, visibility props, tab bar collapse)
- `src/react/useLlmsTxtStatus.ts` (split into status + readiness hooks)
- `src/svelte/LlmsTxtWidget.svelte` (matching SCORE tab + visibility props)
- `src/svelte/store.ts` (add readiness store)
- `cli/index.mjs` (register `agent-ready`, `scan`, `robots`)
- `cli/commands/setup.mjs` (offer to enable agent-readiness defaults at the end of the wizard)
- `SETUP.md` (new section 14 author docs)
- `INTEGRATION.md` (new consumer sections)
- `README.md` (feature list update, "now passes isitagentready.com" line)
- `TASK.md` (new milestones M31 through M45)
- `changelog.md` (new Unreleased entries)
- `files.md` (new entries for the three CLI commands and this PRD)
- `example-react/llms-txt.config.json` (turn on the new flags so the demo serves as a reference)
- `example-svelte/llms-txt.config.json` (same)
- `example-react/convex/http.ts` (add `mountMarkdownNegotiation` after `registerRoutes`)
- `example-svelte/convex/http.ts` (same)

## Implementation order

Mirrors the milestone block added to `TASK.md`. Each step is independently shippable.

| Milestone | Title | Estimate |
|-----------|-------|----------|
| M31 | Content-Signal headers on existing routes | 30 min |
| M32 | x-markdown-tokens header | 15 min |
| M33 | Discovery Link headers | 30 min |
| M34 | Widget tab visibility props plus SCORE tab skeleton | 2 hrs |
| M35 | robots.txt route plus generation plus sanitization | 1.5 hrs |
| M36 | sitemap.xml route plus XML escaping | 1 hr |
| M37 | /.well-known/agent-skills route | 1 hr |
| M38 | Markdown content negotiation helper | 2 hrs |
| M39 | Readiness self-score endpoint | 2 hrs |
| M40 | Wire SCORE tab to readiness endpoint | 1 hr |
| M41 | `npx llms-txt agent-ready` command | 1 hr |
| M42 | `npx llms-txt scan` command | 1.5 hrs |
| M43 | Security hardening pass across all new routes | 1 hr |
| M44 | SETUP.md and INTEGRATION.md updates | 1 hr |
| M45 | Svelte widget parity for SCORE tab and visibility props | 1 hr |

Total: roughly 18 hours of implementation work, plus tests.

## Edge cases

- **Existing deployments without new fields.** All new schema fields are `v.optional()`. The `getSettings` query returns the row as-is. Renderers default to safe values (Content-Signal all-yes, all features off) when fields are absent.
- **`fullTxtEnabled` interaction with markdown negotiation.** Negotiation reads from the `pages.fullContent` field, which is independent of the `llms-full.txt` cached file. Pages without `fullContent` fall through to the normal handler even when negotiation is enabled.
- **SCORE tab when readiness endpoint is disabled.** The widget detects the 503 (or missing endpoint) and hides the SCORE tab gracefully. No console errors, no broken layouts.
- **CI runs of `scan`.** The command reads `appUrl` from `llms-txt.config.json` by default. CI pipelines can pass `--url` explicitly. Exit code 1 when score < 80 makes it usable as a deploy gate.
- **Single-tab widget.** When only HUMAN is visible (a marketing site might want this), the tab strip disappears. Visual width of the widget stays the same.
- **All-tabs-off widget.** Widget renders nothing. No empty box, no border. Operators can hide the widget entirely without uninstalling it.
- **`tabs` array shorter than visible flags.** The `tabs` prop wins. If `tabs={["HUMAN"]}` is set, only HUMAN renders even if `showMachineTab={true}`.
- **Stale readiness score.** The endpoint caches for 300 seconds. The widget's polling cycle is 60 seconds. Operators see at most a 5-minute lag after running `agent-ready`.
- **Bot Disallow rules.** When `robotsTxtAllowAiBots` is `false`, the file emits `Disallow: /` for every known AI bot in `KNOWN_AGENTS`. This is the explicit opt-out path.
- **No emoji or em dashes.** Per the project's write rule. All generated content (robots.txt, sitemap, agent-skills, readiness) uses ASCII text with hyphens only inside identifiers, never as sentence punctuation.
- **No new external dependencies.** Token estimation is `Math.ceil(content.length / 4)`. XML escaping is a hand-rolled helper. Bearer auth uses `req.headers.get("authorization")`. Everything stays in the existing dependency surface.

## Long-tail backlog (out of scope for v1)

These appear on isitagentready.com but are deferred:

- **MCP Server Card** at `/.well-known/mcp.json`. Useful when the host app exposes an MCP server. Tracked as a future milestone.
- **A2A Agent Card** at `/.well-known/a2a.json`. Google A2A protocol, niche today.
- **OAuth discovery** at `/.well-known/oauth-authorization-server`. Belongs in the auth layer (Clerk, Convex Auth, WorkOS), not in this component.
- **OAuth Protected Resource** at `/.well-known/oauth-protected-resource`. Same.
- **Web Bot Auth** signed agent verification. Spec is still moving.
- **WebMCP** browser-side MCP exposure. Not stable.
- **x402 / MPP / UCP / ACP commerce protocols.** Forward-looking, not ready for general adoption.
- **API Catalog** advertisement. Partial overlap with `agents.md` already.
- **JSON-LD structured data.** Could be a v2 feature. Add a separate route or content negotiation handler.

When any of these stabilize and isitagentready.com starts checking them, write a v2 PRD that adds the matching route plus a config flag, plus a check in the readiness score.
