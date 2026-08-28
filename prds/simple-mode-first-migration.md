# Simple-mode-first migration to 0.3.0

Created: 2026-08-16 03:40 UTC
Last Updated: 2026-08-16 03:40 UTC
Status: In Progress

## Problem

Version 0.2.6 gates every public file behind `testMode: true` by default. A zero-config
install silently serves nothing until the developer runs `npx agent-ready go-live`. The
served files come from public config the developer chooses, so the gate protects almost
nothing while taxing every install with a second step. Comparable tools (Mintlify,
robots.txt and sitemap generators) publish on write.

Discoverability is also incomplete. The RFC 8288 `Link` header only fires behind the
`discoveryHeaders` flag and only on cached file routes. There is no per-site markdown
file at the root, no HTML alternate tag guidance, and the Accept negotiation helpers
exist in the code but are never wired to routes.

## Proposed solution

Ship simple mode as the default and make it live by default.

1. New `publish` setting: `"live"` (default) or `"draft"`. Draft returns 404 with a short
   body on public routes. `testMode: true` keeps working as a deprecated alias for draft.
   `npx agent-ready go-live` now sets `publish: "live"`.
2. Per-site markdown route. New cached file type `site.md` rendered on every generation.
   Route resolution order (Convex http routes need static paths at registration):
   - `siteMdPath` option on `registerRoutes`
   - `AGENT_READY_SITE_SLUG` env var, set automatically by `npx agent-ready sync`
   - stable `/site.md` fallback so zero-config serves immediately
   The resolved path is exposed on `/llms-status` so the widget, AgentLinks, and docs all
   reference the same value.
3. Always-on `Link: </llms.txt>; rel="describedby"; type="text/markdown"` on every
   component-served response. The existing `discoveryHeaders` flag keeps appending its
   richer alternate links on top.
4. Content negotiation wired on `/markdown` and `/markdown/*`: `Accept: text/markdown`
   returns markdown, browsers get the stored HTML twin, `Vary: Accept` always set.
5. HTML alternate tag, three paths: README copy-paste for the root layout, widget
   `document.head` injection fallback (deduped by href), and direct tags in both demo
   layouts covering the Convex static hosting case.
6. Advanced-mode discovery UX: `AgentLinks` component for React and Svelte plus a plain
   HTML snippet, one display-only collapsible Advanced line in the widget linking to the
   README `#advanced` anchor, and a one-time console nudge after first codegen (guarded
   by a `nudgePrintedAt` flag on settings, dev deployments only).
7. Advanced surface stays the existing flat flags (`fullTxtEnabled`, `robotsTxtEnabled`,
   `sitemapEnabled`, `agentSkillsEnabled`, `readinessEndpointEnabled`, `rssEnabled`,
   `analyticsEnabled`, `markdownSiteEnabled`, `contentSignals`). No nested `advanced`
   block. All stay off unless enabled.

## Files to change

- `src/component/schema.ts`, `src/component/validators.ts`: `publish`, `nudgePrintedAt`,
  `site.md` file type
- `src/component/lib.ts`: `appNameToSlug`, publish resolution helper
- `src/component/content.ts`, `src/component/contentInternal.ts`: insert defaults,
  status payload with `publish` and slug
- `src/component/generation.ts`: render `site.md`, console nudge
- `src/client/types.ts`, `src/client/index.ts`: publish gating (404), site.md route,
  always-on Link header, Accept negotiation, status closure with `siteMdPath`
- `src/client/headInjection.ts`: shared alternate-link injector
- `src/react/AgentLinks.tsx`, `src/svelte/AgentLinks.svelte`, entry exports
- `src/react/AgentReadyWidget.tsx`, `src/svelte/AgentReadyWidget.svelte`: head injection
  fallback, Advanced section
- `cli/commands/go-live.mjs`, `cli/commands/setup.mjs`, `cli/commands/sync.mjs`,
  `cli/commands/status.mjs`
- Demos: `example-react`, `example-svelte`, `example-expo` (head tag, AgentLinks footer,
  live configs, siteMdPath)
- Docs: `README.md`, `INTEGRATION.md`, `SETUP.md`, `docs/install.md`, `docs/install.html`,
  `package.json` description
- `package.json` version 0.3.0, `changelog.md`, `task.md`, `files.md`

## Edge cases

- Existing installs with stored `testMode: true` keep gating (mapped to draft)
- Existing installs upgrade without redeploy surprises: draft gate status code changes
  403 to 404 (documented in changelog)
- Slug collisions: `siteMdPath` never overwrites an existing route; exact-path
  registration makes collisions a deploy-time router error, and `skipRoutes` plus the
  option cover conflicts
- `appName` changes: `npx agent-ready sync` refreshes `AGENT_READY_SITE_SLUG`
- Downstream caches that ignore `Vary: Accept`: `.md` suffix path documented as the
  fallback URL
- The nudge prints once per deployment lifetime; ephemeral dev environments may see it
  again after reset (acceptable, documented)

## Verification steps

- `npm run typecheck` and `npm run build` pass
- curl checklist: Link header on `/llms.txt`, ETag then 304, `/{slug}.md` 200 with
  `text/markdown`, `Accept: text/markdown` on `/markdown` returns markdown with
  `Vary: Accept`, draft blocks with 404, `testMode: true` behaves like draft, advanced
  routes 404 in simple mode

## Task completion log

- 2026-08-16: PRD written, implementation started
