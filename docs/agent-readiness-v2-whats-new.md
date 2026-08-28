# Agent readiness v2, what this version will do

Status: implemented, not yet deployed or published to npm.

`@waynesutton/agent-ready` is a Convex component that makes any Convex app readable by AI agents. Version 2 upgrades the defaults so a plain install passes the checks that public scanners like isitagentready.com and is-agentic.com run, and adds an advanced tier for agent experience features.

## Works for any Convex app

Agent files are Convex HTTP routes on `https://<deployment>.convex.site`. No static hosting required, no peer dependencies. `@convex-dev/static-hosting` is an optional same origin bonus when the frontend also lives on `.convex.site`.

## New in simple mode, on by default after install

These now serve with zero flags. Set the flag to `false` to opt out.

| Feature | Route or header | Flag |
| --- | --- | --- |
| robots.txt with AI bot rules and a Content-Signal block | `/robots.txt` | `robotsTxtEnabled` |
| sitemap.xml | `/sitemap.xml` | `sitemapEnabled` |
| Content-Signal header, all yes default | every content route | `contentSignals` |
| Discovery Link headers (RFC 8288) | every content route | `discoveryHeaders` |
| Token count headers | `x-markdown-tokens` and new `x-original-tokens` | always on |
| YAML frontmatter on markdown twins | title and description per page | always on |

Zero config fallbacks serve robots.txt and sitemap.xml on the first `npx convex dev`, before any sync runs.

## New in advanced mode

Enable everything with one command:

```bash
npx agent-ready agent-ready
```

New additions in this version:

| Feature | Route | Flag |
| --- | --- | --- |
| Agent skills digest index with SHA-256 hashes | `/.well-known/agent-skills/index.json` | `agentSkillsEnabled` |
| API catalog (RFC 9727) built from synced endpoints | `/.well-known/api-catalog` | `apiCatalogEnabled` |
| Agent friendly 404 page linked from llms.txt | `/404.md` | `notFoundPageEnabled` |
| Canonical path markdown negotiation | your real page URLs | `registerCanonicalPageRoutes` in `convex/http.ts` |

Canonical negotiation means an agent sending `Accept: text/markdown` to `/pricing` gets the markdown twin with `Vary: Accept`. Clients that reject every offered type get `406 Not Acceptable`. The `/markdown` routes gained the same 406 handling.

## Smarter scan command

```bash
npx agent-ready scan --url https://your-deployment.convex.site
```

The scan now scores essential checks only: discovery files, markdown negotiation, and a real 404 probe. Optional protocol endpoints (agent skills, api-catalog, RSS, readiness) are reported but never lower the score, matching how public scanners treat missing MCP style extras.

Two behaviors worth knowing:

- An SPA fallback that answers 200 for unknown paths is reported as a known limit, not a failure. You should not break client routing to chase that check.
- New informational homepage checks: llms.txt Link header, thin HTML, and missing `<h1>`.

`scan --strict` also verifies a real page serves markdown and prints its `x-original-tokens` value. `/llms-readiness` gained unscored bonus checks for the three new advanced routes.

## Static hosting guidance

If you pair this component with `@convex-dev/static-hosting`:

- Use app owned root routing. Never set `httpPrefix` in `convex/convex.config.ts`. It moves every discovery route under the prefix where scanners never look.
- Required mount order: `registerRoutes`, then `registerMarkdownRoutes`, then `registerStaticRoutes`. Exact paths with extensions win over the SPA fallback.
- The setup wizard now detects `httpPrefix` and static hosting in your config and prints the correct snippet.

## Quick start

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

```ts
// convex/convex.config.ts
import agentReady from "@waynesutton/agent-ready/convex.config.js";
app.use(agentReady);
```

```ts
// convex/http.ts
import { registerRoutes } from "@waynesutton/agent-ready";
registerRoutes(http, components.agentReady);
```

Run `npx convex dev` and your deployment serves `llms.txt`, `agents.md`, a per site markdown file, robots.txt, sitemap.xml, Content-Signal, and discovery headers immediately.

## What stayed off on purpose

DNS-AID, `auth.md`, ARD, WebMCP, A2A, Web Bot Auth, and x402/MPP/UCP/ACP commerce protocols stay out of both modes. They are early stage specs and none of the scanners require them to pass.

## Verification before claiming scores

Live scan numbers come after deploy. The check list:

```bash
curl -i https://<deployment>.convex.site/robots.txt     # 200 with AI bots and Content-Signal
curl -i https://<deployment>.convex.site/sitemap.xml    # 200
curl -s -o /dev/null -w "%{http_code}" https://<deployment>.convex.site/no-such-path   # 404
npx agent-ready scan --url https://<deployment>.convex.site
```
