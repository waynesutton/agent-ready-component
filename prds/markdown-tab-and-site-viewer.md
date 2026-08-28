# Markdown tab and site viewer

Created: 2026-05-25 22:00 UTC
Last Updated: 2026-05-26 02:07 UTC
Status: Done

## Problem

Per-page markdown twins from the Dualmark plan are not shipped yet. Humans and agents have no browsable markdown site. The widget only exposes aggregate files (`llms.txt`, `agents.md`) on the MACHINE tab, not individual pages.

## Proposed solution

1. **`pageTwins` table** — cached markdown + HTML per published page
2. **`registerMarkdownRoutes`** — `/markdown` index, `/markdown/*` pages with Accept negotiation, `/llms-markdown-index` JSON for the widget
3. **MARKDOWN widget tab** — page list + "Open markdown site" link
4. **`widgetShowMarkdownTab`** config flag, independent from `markdownSiteEnabled`, so `/markdown` can stay live while the widget tab is hidden

## Convex routing note

Convex HTTP cannot register dynamic per-page routes from the DB. Use fixed prefixes:

- `/markdown` and `/markdown/*` for human HTML + agent markdown via Accept header
- Raw `.md` suffix URLs require CDN rewrite (documented limitation)

## Verification

- `curl https://<site>/llms-markdown-index` returns JSON page list
- `curl https://<site>/markdown` returns HTML index with meta tags
- `curl -H "Accept: text/markdown" https://<site>/markdown/settings` returns markdown
- `npx agent-ready scan --url https://<site> --strict` verifies markdown index and page negotiation
- Widget MARKDOWN tab lists pages and opens site

## Task completion log

- [x] Backend: pageTwins + generation + HTTP routes (2026-05-25)
- [x] Widget: React + Svelte MARKDOWN tab (2026-05-25)
- [x] Discovery: `llms.txt`, sitemap, robots comments, agent skills, and Link headers reference `/markdown` (2026-05-25)
- [x] CLI: `links`, setup defaults, and `scan --strict` understand markdown routes (2026-05-25)
- [x] Demos: React, Svelte, and Expo docs/config coverage (2026-05-25)
- [x] Setup wizard asks separately for markdown site and MARKDOWN widget tab; `agent-ready` preserves hidden tab preference (2026-05-26)
