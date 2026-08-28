# Agent readiness v2 for any Convex app

Status: in progress
Date: 2026-08-25
Supersedes: prds/agent-readiness-v1.md (kept as history)

## Problem

The component ships strong agent discovery files, but simple mode leaves the highest value checks off by default. A fresh `app.use(agentReady)` install serves `llms.txt`, `agents.md`, and the site markdown file, yet returns 404 for `robots.txt` and `sitemap.xml` because `robotsTxtEnabled` and `sitemapEnabled` are opt in. Public scanners grade exactly those files:

- Cloudflare `isitagentready.com` checks robots.txt with AI bot rules, sitemap.xml, Content-Signal (header and robots.txt), Link discovery headers, and well-known endpoints.
- Ora `is-agentic.com` checks agent experience: markdown negotiation on real pages, recoverable 404s, discoverable developer resources, and honest HTTP behavior.

Second problem: users pairing this component with `@convex-dev/static-hosting` can silently break every discovery route by using static-hosting 0.2's suggested `defineApp({ httpPrefix: "/api" })`, which moves `/llms.txt` to `/api/llms.txt` where no scanner looks.

## Hosting matrix

| Setup | Where agent files live | Works | Notes |
| --- | --- | --- | --- |
| Convex HTTP only (most apps) | `https://<deployment>.convex.site` | Yes, primary path | Unknown paths already return real 404s. Scan this origin. |
| Convex + static hosting, app owned root routing | Same `.convex.site` origin as the SPA | Yes, supported | Mount order: `registerRoutes`, then `registerMarkdownRoutes`, then `registerStaticRoutes`. Exact paths win over the SPA catch-all. |
| Convex + static hosting with `httpPrefix: "/api"` | `/api/llms.txt` and friends | No | Never pair this component with `httpPrefix`. The wizard warns when it detects one. |
| Split origin (Vercel or Netlify frontend + Convex backend) | Backend origin only | Partially | Scanners of the marketing domain miss Convex routes. Documented follow-up: emit `public/` copies or a proxy snippet. Not part of v2. |

SPA 404 limit: with `spaFallback: true`, `/this-does-not-exist` returns 200 with `index.html`. That fails Ora's essential 404 check, the same way Vercel SPA rewrites do. We do not break client routing to chase it. v2 documents the limit and adds an opt-in `/404.md` markdown route agents can use for recovery.

## Proposed solution

### Simple mode defaults flip (on unless explicitly disabled)

Resolution moves to shared helpers so `undefined` means on and only explicit `false` turns a feature off. No data migration needed because stored settings keep their optional shape.

- `robotsTxtEnabled` and `robotsTxtAllowAiBots`: default on
- `sitemapEnabled`: default on
- `discoveryHeaders`: default on (richer Link header in addition to the always-on describedby link)
- `contentSignals`: default `{ aiTrain: true, search: true, aiInput: true }` (header already defaulted; robots.txt now also carries a `Content-Signal:` block)
- Zero-config fallbacks: before any settings exist, `/robots.txt` and `/sitemap.xml` serve minimal request-derived bodies, matching the existing `llms.txt` fallback behavior
- Enabled-but-not-yet-generated fallbacks: upgraded installs serve settings-derived robots.txt and sitemap.xml until the next regeneration
- `skipRoutes` unchanged, so apps that own these paths keep opting out

### Markdown output upgrades

- Page twin markdown gains YAML frontmatter (`title`, `description`) matching Cloudflare's Markdown for Agents shape
- Markdown twin responses gain `x-original-tokens` (estimated tokens of the HTML twin) next to `x-markdown-tokens`
- HTML twins keep their existing JSON-LD

### Advanced additions (off by default, flipped on by `npx agent-ready agent-ready`)

- `/.well-known/agent-skills/index.json`: SHA-256 digest index over the existing agent-skills document, gated by `agentSkillsEnabled`; `/.well-known/agent-skills` stays
- `/.well-known/api-catalog` (RFC 9727 linkset JSON): new `apiCatalogEnabled` setting, served when at least one API endpoint exists
- `/404.md`: new `notFoundPageEnabled` setting; generated markdown with links to `llms.txt`, `sitemap.xml`, and `/markdown`; linked from `llms.txt` when enabled; documented that SPA catch-alls still return 200 for arbitrary paths
- Canonical path negotiation: new `registerCanonicalPageRoutes(http, component, { paths })` helper registers exact routes for listed page paths and serves markdown for `Accept: text/markdown`, the HTML twin for browsers, `Vary: Accept`, and 406 when the client rejects every offered type. Explicit opt in because it shadows SPA routes for those paths.
- Existing markdown routes gain 406 handling when Accept rejects every offered type

### Scan and readiness retune

- `npx agent-ready scan` splits checks into essential (llms.txt, agents.md, robots.txt, sitemap.xml, markdown negotiation, 404 probe) and optional (agent-skills, feed, markdown index, readiness, status, api-catalog, 404.md). Score comes from essential checks only, so a missing optional protocol endpoint no longer fails a site.
- New probes: random path 404 probe (200 becomes a warning that names the SPA fallback limit, not a failure), homepage Link header check, thin homepage HTML and missing H1 warning.
- `/llms-readiness` uses the new default-on resolution for robots, sitemap, and discovery headers, and adds zero-point bonus checks for the new advanced routes so existing scores do not shift.

## Flags

| Flag | Before | After |
| --- | --- | --- |
| `robotsTxtEnabled` | off unless true | on unless false |
| `robotsTxtAllowAiBots` | allow unless false (unchanged) | allow unless false |
| `sitemapEnabled` | off unless true | on unless false |
| `discoveryHeaders` | off unless true | on unless false |
| `contentSignals` | header defaulted all yes | same, plus robots.txt block |
| `agentSkillsEnabled` | off unless true | unchanged, now also gates index.json |
| `apiCatalogEnabled` | n/a | new, off unless true |
| `notFoundPageEnabled` | n/a | new, off unless true |
| `rssEnabled`, `fullTxtEnabled`, `markdownNegotiation`, `markdownSiteEnabled`, `readinessEndpointEnabled`, `analyticsEnabled`, `aiDescriptionsEnabled` | unchanged | unchanged |

## Files to change

- `src/component/lib.ts`: resolver helpers (`resolveRobotsTxtEnabled`, `resolveSitemapEnabled`, `resolveDiscoveryHeaders`, `resolveContentSignals`), YAML frontmatter in `buildMarkdownTwinBody`
- `src/component/generation.ts`: default-on gating for robots and sitemap, Content-Signal block inside robots.txt, 404.md link in llms.txt when enabled
- `src/component/schema.ts`, `src/component/validators.ts`: optional `apiCatalogEnabled` and `notFoundPageEnabled` settings fields
- `src/component/content.ts`, `src/component/contentInternal.ts`: pass through the new fields, default-on values in `getCacheStatus`, new `getPageTwinByPath` query
- `src/client/index.ts`: default-on gating, zero-config and settings-derived fallbacks for robots and sitemap, agent-skills index route, api-catalog route, 404.md route, `registerCanonicalPageRoutes`, 406 handling, `x-original-tokens`, readiness retune
- `src/client/types.ts`: new settings fields, new options, new skippable routes
- `cli/commands/scan.mjs`: essential and optional buckets, 404 probe, homepage Link and thin HTML checks
- `cli/commands/agent-ready.mjs`: flip the two new flags on
- `cli/commands/setup.mjs`: warn when `convex.config.ts` contains `httpPrefix`
- `README.md`, `INTEGRATION.md`, `task.md`, `changelog.md`, `files.md`: docs sync

## Edge cases

- Apps that deliberately never enabled robots.txt because the host serves its own: they must set `robotsTxtEnabled: false` or `skipRoutes: ["/robots.txt"]`. The wizard already prompts for path ownership; README calls out the default change.
- Existing deployments upgrade without regeneration: the settings-derived fallback serves robots.txt and sitemap.xml until the next cron or manual regenerate.
- `registerCanonicalPageRoutes` on a static-hosted app shadows those SPA paths with the HTML twin. Documented as intentional and opt in.
- Draft publish state still gates every route, including the new ones.
- The agent-skills index digest is computed at request time from the cached document, so it never drifts from the served file.

## Verification

HTTP only (primary):

1. Fresh Convex app, `app.use(agentReady)` plus `registerRoutes`, no settings synced
2. `curl -i https://<dev>.convex.site/robots.txt` returns 200 with AI bot rules and a Content-Signal block
3. `curl -i https://<dev>.convex.site/sitemap.xml` returns 200
4. `curl -s -o /dev/null -w "%{http_code}" https://<dev>.convex.site/no-such-path` returns 404
5. `npx agent-ready scan --url https://<dev>.convex.site` passes every essential check

Static hosting (supported):

1. Demo mount order unchanged: `registerRoutes`, `registerMarkdownRoutes`, `registerStaticRoutes`
2. Same curls pass for the exact discovery files
3. `/no-such-path` returns 200 through the SPA fallback; scan prints the documented warning instead of failing
4. `/llms.txt` is not swallowed by `index.html`

No score claims for isitagentready.com or is-agentic.com until a live scan of a deployed demo runs after this ships.
