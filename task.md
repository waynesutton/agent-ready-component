# Task tracker for @waynesutton/agent-ready

Source of truth: `prds/convex-llms-txt-prd-v6.md`. Agent readiness work tracked in `prds/agent-readiness-v1.md`.

## In progress

- [ ] M0: Scaffold repo structure, docs, and placeholder files (no Convex deploy, no install yet)

## Next up

- [ ] Follow `SETUP.md` end to end once you are ready to deploy: install, wire, sync, verify, publish, go-live, refresh test
- [ ] Capture screenshots of the PostHog-inspired demos for the README marketing section
- [ ] Replace placeholder `@convex-dev/crons` + `@convex-dev/workpool` peer versions with the real pinned versions once resolved
- [ ] Kick off Agent Readiness v1 (M31). PRD at `prds/agent-readiness-v1.md`

## To do

### Core component (M1 through M10)

- [ ] M1: Flesh out schema indexes and validators to match PRD section "Backend spec"
- [ ] M2: Implement `registerRoutes(http, component, options)` with per-route handlers and `onEvent` catch-all
- [ ] M3: Add ETag support to all three file HTTP handlers, return `304 Not Modified` on `If-None-Match` match
- [ ] M4: Implement `testMode` origin check, `403` for non-localhost until `go-live`
- [ ] M5: Wire `@convex-dev/workpool` with `maxParallelism: 1` for `regenerateAll`
- [ ] M6: Wire `@convex-dev/crons` for dynamic interval updates, cleanup step
- [ ] M7: `createTypedAgentReadyClient()` factory with typed function refs
- [ ] M8: Content status model: draft, published, archived, soft-delete, restore
- [ ] M9: Event callbacks `onGenerationComplete`, `onAnalyticsThreshold` via `registerRoutes`
- [ ] M10: Data retention: `cleanupOldRequests`, `cleanupOrphanedCacheEntries`, retention cron

### First-run and CLI (M11 through M19)

- [ ] M11: `setup.mjs` first-run script for demo apps, idempotent seed
- [ ] M12: `npx agent-ready` interactive wizard (default flow), writes `agent-ready.config.json`, syncs config
- [ ] M13: `permissiveMode` dev versus prod guard, throws at startup in production
- [ ] M14: Cache rollback with `previousContent`, `rollbackCache`, `CacheJobId`
- [ ] M15: Analytics pipeline, agent taxonomy, threshold callback
- [ ] M16: React widget with HUMAN or MACHINE toggle, `useAgentReadyStatus()` hook, staleness detection
- [ ] M17: Svelte widget with `createAgentReadyStatusStore()`
- [ ] M18: `sync` action callable from CI/CD, reads `agent-ready.config.json`
- [ ] M19: CLI commands: `setup`, `sync`, `status`, `regenerate`, `rollback`, `go-live`, `generate-descriptions`, `publish-page`, `draft-page`, `archive-page`, `restore-page`, `analytics`, `cleanup`, `versions`

### Advanced features (M20 through M26)

- [ ] M20: AI descriptions with Claude and OpenAI, 100 item cap, 1 call per second
- [ ] M21: `llms-full.txt` handler, 500KB cap, CDN redirect option
- [ ] M22: Auto-discovery router wrapper and route interception
- [ ] M23: `/llms-status` public JSON endpoint
- [ ] M24: `pageVersions` opt-in version history, 90 day trim
- [ ] M25: `INTEGRATION.md` LLM-optimized with every integration path
- [ ] M26: Dashboard docs section on component tables

### Demos and release (M27 through M30)

- [ ] M27: React demo at `/example-react` running on `@convex-dev/static-hosting`
- [ ] M28: Svelte demo at `/example-svelte` running on `@convex-dev/static-hosting`
- [ ] M29: `convex-test` full coverage
- [ ] M30: npm publish, Convex components directory submission, `PUBLISHING.md`

### Agent readiness v1 (M31 through M45)

PRD: `prds/agent-readiness-v1.md`. Each milestone is independently shippable.

- [ ] M31: `Content-Signal` response headers on existing file routes plus optional per-signal config (`aiTrain`, `search`, `aiInput`)
- [ ] M32: `x-markdown-tokens` response header on `/llms.txt`, `/agents.md`, `/llms-full.txt`
- [ ] M33: RFC 8288 `Link` discovery headers wired through `discoveryHeaders` setting
- [ ] M34: Widget tab visibility props (`showHumanTab`, `showMachineTab`, `showScoreTab`, `defaultTab`, `tabs`) and SCORE tab skeleton in React widget
- [ ] M35: `GET /robots.txt` route, `renderRobotsTxt` generator, sanitization, CLI fragment printer
- [ ] M36: `GET /sitemap.xml` route, `renderSitemap` with `escapeXml` helper, cached file plumbing
- [ ] M37: `GET /.well-known/agent-skills` route returning JSON built from pages plus endpoints
- [ ] M38: Markdown content negotiation helper (`mountMarkdownNegotiation`) plus `markdownNegotiation` setting
- [ ] M39: `GET /llms-readiness` self-score endpoint with optional `AGENT_READY_READINESS_SECRET` bearer auth (legacy `LLMS_READINESS_SECRET` honored as fallback)
- [ ] M40: Wire SCORE tab to `/llms-readiness` with 60 second polling and color thresholds
- [ ] M41: `npx agent-ready` default flow that flips all flags, syncs config, regenerates, prints score
- [ ] M42: `npx agent-ready scan` command that curls every agent-readiness endpoint and prints a pass or fail table
- [ ] M43: Security hardening pass across all new routes: testMode gate, output escaping, secret handling, no path leakage
- [ ] M44: `SETUP.md` and `INTEGRATION.md` updates split into author docs (one section) and consumer docs (eight sections)
- [ ] M45: Svelte widget parity: SCORE tab, visibility props, readiness store

## Completed

- [x] 2026-04-26 00:30 UTC Resolved dependency install and audit blockers. Updated `@convex-dev/crons`, `@convex-dev/workpool`, `convex-helpers`, SvelteKit related packages, and the npm `cookie` override. Verification: `npm install`, `npm audit` returned 0 vulnerabilities
- [x] 2026-04-26 00:28 UTC Fixed packaged component typecheck circularity. Moved internal content helpers into `src/component/contentInternal.ts`, added shared validators in `src/component/validators.ts`, replaced loose `v.any()` returns in touched content and analytics APIs, and kept public CLI function names stable. PRD: `prds/typecheck-component-circularity.md`. Verification: `npx convex codegen --component-dir ./src/component`, `npm run typecheck`
- [x] 2026-04-26 00:27 UTC Fixed packaged component codegen blockers found while following `SETUP.md`. Removed unsupported `"use node"` from `src/component/generation.ts`, renamed reserved `src/component/crons.ts` to `src/component/cronWorker.ts`, regenerated component bindings, and verified `npx convex codegen --component-dir ./src/component`
- [x] 2026-04-25 Updated author setup docs so packaged component codegen receives a configured Convex deployment. `SETUP.md` now runs root `npx convex dev --once` before `npx convex codegen --component-dir ./src/component`. README/files/changelog descriptions call out the required dev deployment setup
- [x] 2026-04-25 23:39 UTC Split author setup from consumer install docs. `SETUP.md` is now author-only, fixes the clone directory, adds packaged Convex component codegen before build/typecheck, and keeps release steps focused on GitHub, npm, and Convex demo hosting. `docs/install.md` and `docs/install.html` cover consumer installation. `README.md`, React demo, and Svelte demo now link to the install guide. `package.json` includes `cli/`, `docs/`, and `SETUP.md` in the npm package so `npx agent-ready` works after publish. Verification: `npm pack --dry-run` passed and lints were clean for edited demo files. `npm run typecheck` is still blocked by existing missing Convex generated modules, and demo checks are blocked by missing local workspace dependencies
- [x] 2026-04-25 Renamed component from `@convex-dev/llms-txt` to `@waynesutton/agent-ready` across the codebase. CLI binary `llms-txt` → `agent-ready` with `npx agent-ready` as the default flow. Component identifier `llmsTxt` → `agentReady`. React widgets `LlmsTxtWidget` / `useLlmsTxtStatus` → `AgentReadyWidget` / `useAgentReadyStatus`. Svelte widgets and store renamed to match. Config file `llms-txt.config.json` → `agent-ready.config.json` with legacy filename fallback. Env vars `LLMS_ANALYTICS_SECRET` / `LLMS_READINESS_SECRET` → `AGENT_READY_*` with legacy fallbacks. Public web routes (`/llms.txt`, `/agents.md`, `/llms-full.txt`, `/llms-status`, `/llms-analytics`) preserved as web standards
- [x] 2026-04-25 Updated repo URL from `waynesutton/llms-txt` to `waynesutton/agent-ready-component` across package.json, SETUP.md, CONTRIBUTING.md, widgets, examples, and mockups
- [x] 2026-04-25 Rewrote `mockup-react.html` and `mockup-svelte.html` to demo the v1 agent-readiness surface (score ring, check grid, response headers, schema toggles, NEW file tags in sidebar, 3-tab widget with HUMAN | MACHINE | SCORE)
- [x] 2026-04-25 Updated Convex dependency from ^1.17.0 to ^1.36.0, fixed Date.now() in analytics queries, added .convex/ to gitignore, updated SETUP.md prerequisites and dev commands for Convex 1.36.x, switched example dev scripts to `npx convex dev --start`
- [x] 2026-04-17 Initial repo scaffold created: root docs, package config, component source, client API, React and Svelte widgets, CLI, both demo apps
- [x] 2026-04-17 Added `SETUP.md` linear setup and publish guide covering install, wire-up, local verification, GitHub publish, npm publish, Convex + static hosting deploy for both demos, ETag test, refresh banner test, and go-live
- [x] 2026-04-17 Redesigned both demo apps with a PostHog-inspired aesthetic: cream background, window chrome, file-style sidebar, tab strip with orange active underline, orange CTAs, metric grid, and a page footer. Widget remains dark and floating bottom-right for contrast
- [x] 2026-04-17 Added shared React demo components `Window`, `Sidebar`, `Tabs`, `Button` under `example-react/src/components/`
- [x] 2026-04-17 Wrote `prds/setup-and-demo-posthog-redesign.md` PRD covering both deliverables
- [x] 2026-04-17 Restructured `SETUP.md` into two parts. Part 1 is owner setup: clone, build, GitHub, npm, Convex deploy for both demos, live URL verification. Part 2 is consumer usage with the full CLI reference and troubleshooting table
- [x] 2026-04-17 Hardened the component for the Convex component review. Flipped `analytics.recordRequest` to public `mutation` (called across the boundary by `registerRoutes`), flipped `content.invalidateCache` to `internalMutation` (only called inside the component), updated `crons.ts` to use `api.analytics.cleanupOldRequests`, added `./convex.config`, `./_generated/component.js`, and `./_generated/api.js` to package exports, and removed the unused `src/component/http.ts` alternate factory
