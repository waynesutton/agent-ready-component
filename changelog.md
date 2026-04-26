# Changelog

All notable changes to `@waynesutton/agent-ready` (formerly `@convex-dev/llms-txt`) are tracked here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Agent readiness v1 (M31 through M45) implementing Cloudflare's agent readiness standards
- `Content-Signal` response header on all content routes with configurable `aiTrain`, `search`, `aiInput` signals
- `x-markdown-tokens` response header reporting estimated token count for each file
- RFC 8288 `Link` discovery headers pointing to `llms.txt`, `agents.md`, and `sitemap.xml`
- `GET /robots.txt` route with AI bot directives, configurable allow/disallow
- `GET /sitemap.xml` route with XML escaping and per-page URL generation
- `GET /.well-known/agent-skills` endpoint advertising pages and API endpoints as agent skills
- `GET /llms-readiness` self-score endpoint with 11 checks across discoverability, content, bots, and protocol
- SCORE tab in React and Svelte widgets with readiness polling (60s), color-coded score, and check list
- `npx agent-ready agent-ready` CLI command enables all readiness flags, syncs, and regenerates
- `npx agent-ready scan` CLI command audits deployment endpoints and prints a pass/fail table
- `Vary: Accept` header for markdown content negotiation support
- 9 new optional settings: `contentSignals`, `markdownNegotiation`, `discoveryHeaders`, `robotsTxtEnabled`, `robotsTxtAllowAiBots`, `robotsTxtDisallowPaths`, `sitemapEnabled`, `agentSkillsEnabled`, `readinessEndpointEnabled`
- File type union expanded to include `robots.txt`, `sitemap.xml`, `agent-skills.json`
- Security: `escapeXml()`, `sanitizePath()` helpers, testMode gating on readiness endpoint
- Both example app configs updated with readiness flags enabled by default
- Both example wrapper validators updated for new `getCacheStatus` return shape

- Exported `<AgentReadySettingsPanel />` from `@waynesutton/agent-ready/react`. Drop-in settings panel for managing pages, cache status, and actions. Framework-agnostic design: consumers pass Convex query results and mutation callbacks as props. Ships with inline styles and needs no external CSS
- CLI `npx agent-ready setup` now scaffolds Convex wrapper files at `convex/agentReady/content.ts` and `convex/agentReady/analytics.ts` automatically. These bridge the component API to browser clients so consumers do not have to write them from scratch. Existing files are not overwritten
- Added copy-paste Convex wrapper code to INTEGRATION.md for consumers who skip the CLI wizard
- README now shows `npm i @waynesutton/agent-ready` as the install command and documents the settings panel with a full usage example
- PRD: `prds/settings-panel-export.md`
- Widget v2: `floating-center` position pins the widget to the bottom center of the viewport
- Widget v2: HUMAN tab now shows file URLs with copy buttons followed by "Open in ChatGPT", "Open in Claude", and "Open in Perplexity" links that pass the `llms.txt` URL to each AI chat service
- Widget v2: MACHINE tab shows file links with Phosphor ArrowSquareOut inline SVG icons for opening raw files in a new tab
- Widget v2: `showStatus` prop (defaults `true`) lets consumers hide the status row in the MACHINE tab
- Widget v2: `colors` prop accepts a `Partial<WidgetColors>` with optional hex values for `bg`, `border`, `textActive`, `textInactive`, `tabActiveBg`, and `accent`. Values are set as CSS custom properties inline so they override external stylesheets
- Widget visibility is now config-driven: `widgetShowFiles`, `widgetShowAppName`, `widgetShowDescription`, `widgetShowMeta`, and `widgetStatusVisible` in `agent-ready.config.json` control the widget at runtime via the `/llms-status` endpoint. No code changes needed; just edit the config and run `npx agent-ready sync`. Explicit props still override config values
- Added `widgetStatusVisible`, `widgetShowFiles`, `widgetShowAppName`, `widgetShowDescription`, `widgetShowMeta`, and `widgetColors` to `AgentReadySettings`, `AgentReadyStatus`, component schema, validators, and the setup wizard defaults
- Added `WidgetColors` type export from `src/client/types.ts`
- Both example configs (`example-react`, `example-svelte`) now include all widget visibility flags and `widgetColors` with default hex values
- Build script now copies `.svelte` source to `dist/svelte/` so the Svelte widget ships correctly in the published package
- PRD: `prds/widget-v2-config.md`
- Added `example-react/.env.production.local` for persisting production Convex URLs across deploys
- Added `deploy:full` script to `example-react/package.json` that runs backend deploy, sync, regenerate, and static upload in one command
- Added batch upload functions (`generateUploadUrls`, `recordAssets`) to both demo `staticHosting.ts` files so static-hosting v0.1.3 CLI deploys succeed

### Fixed

- Fixed CLI wrapper (`cli/lib/convex.mjs`) to use `--component agentReady` and positional JSON args instead of the removed `--args` flag. All CLI commands (sync, regenerate, go-live, status, etc.) now work with current Convex CLI
- Fixed `example-react/setup.mjs` and `example-svelte/setup.mjs` to pass `--component agentReady` and use positional args for `convex run`
- Fixed `SETUP.md` production deploy instructions: replaced manual `export` commands with `.env.production.local`, added `--prod` flag to `go-live`, `sync`, and `regenerate` commands, documented the one-command `npm run deploy:full` flow
- Fixed `agent-ready.config.json` appUrl to use the real production deployment URL

### Changed

- Bumped `@convex-dev/crons` to `^0.2.0` so it supports the current Convex 1.36 dev dependency
- Bumped `@convex-dev/workpool` to `^0.3.0` and added `convex-helpers` as its peer dependency
- Updated the Svelte example to use SvelteKit 2.58, `@sveltejs/adapter-static` 3.0, and `@sveltejs/vite-plugin-svelte` 5.1 for Vite 6 compatibility
- Added an npm `cookie` override to use the patched `cookie` package and bring `npm audit` to 0 vulnerabilities
- Split `SETUP.md` into an author-only release guide and moved consumer install instructions into `docs/install.md` and `docs/install.html`
- Added the packaged Convex component codegen step to `SETUP.md` before build and typecheck
- Added the missing Convex dev deployment configuration step before packaged component codegen in `SETUP.md`
- Updated `SETUP.md` after real setup testing so authors run root `npx convex dev --once` before root component codegen
- Removed the unsupported `"use node"` directive from `src/component/generation.ts` because packaged Convex components cannot contain Node runtime files
- Renamed the component cron worker from `src/component/crons.ts` to `src/component/cronWorker.ts` so Convex does not treat it as the reserved native cron config file
- Moved internal content action helpers to `src/component/contentInternal.ts` to remove generated API circular type references while preserving public `agentReady:content:*` CLI function names
- Added shared component validators in `src/component/validators.ts` and replaced loose `v.any()` return validators in the content and analytics surfaces
- Added CORS headers and OPTIONS support to the public `/llms-status` route so widgets can poll it from local Vite origins
- Updated demo static hosting references to `components.selfHosting`, matching the generated component binding name
- Updated `README.md` to point consumers to the Markdown and HTML install guides
- Fixed the author clone instructions to use `cd agent-ready-component`
- Updated npm package contents so `cli/`, `docs/`, and `SETUP.md` are included with the published package. This keeps `npx agent-ready` available after install
- Renamed package from `@convex-dev/llms-txt` to `@waynesutton/agent-ready`
- Updated repository URL from `github.com/waynesutton/llms-txt` to `github.com/waynesutton/agent-ready-component` across all source, docs, examples, mockups, and widgets
- Renamed CLI binary from `llms-txt` to `agent-ready`. Running `npx agent-ready` with no command now runs the setup wizard (default flow)
- Renamed Convex component identifier from `llmsTxt` to `agentReady`. Update wire-up to `app.use(agentReady)` and `components.agentReady`
- Renamed React widget exports: `LlmsTxtWidget` → `AgentReadyWidget`, `useLlmsTxtStatus` → `useAgentReadyStatus`
- Renamed Svelte widget exports: `LlmsTxtWidget` → `AgentReadyWidget`, `createLlmsTxtStatusStore` → `createAgentReadyStatusStore`
- Renamed config file from `llms-txt.config.json` to `agent-ready.config.json`. CLI still reads the legacy filename when the new one is absent
- Renamed env vars: `LLMS_ANALYTICS_SECRET` → `AGENT_READY_ANALYTICS_SECRET` and `LLMS_READINESS_SECRET` → `AGENT_READY_READINESS_SECRET`. Old names still resolved as fallbacks so existing deployments keep working
- Public web routes (`/llms.txt`, `/agents.md`, `/llms-full.txt`, `/llms-status`, `/llms-analytics`) are unchanged. They are public web standards and stay as-is
- Rewrote `mockup-react.html` and `mockup-svelte.html` to demo the v1 agent-readiness surface: score panel with conic-gradient ring and 11-row check grid, response headers panel (Content-Signal, x-markdown-tokens, Link, Vary, ETag), schema toggle grid, sidebar with NEW tags on `robots.txt` / `sitemap.xml` / `agent-skills.json` / `/llms-readiness`, and a third widget tab (HUMAN | MACHINE | SCORE)
- Updated package name and component identifier in both mockups (`@waynesutton/agent-ready`, `components.agentReady`)

### Planned (Agent readiness v1)

Tracked in `prds/agent-readiness-v1.md`, milestones M31 through M45 in `TASK.md`. Nothing shipped yet, just announcing the surface area:

- `Content-Signal` response header on every file route, with per-signal config (`aiTrain`, `search`, `aiInput`)
- `x-markdown-tokens` header on `/llms.txt`, `/agents.md`, `/llms-full.txt`, and any negotiated markdown response
- RFC 8288 `Link` discovery headers, opt-in via `discoveryHeaders` setting
- `GET /robots.txt` route generated from published pages and known AI bots, with `disallowPaths` config and sanitization
- `GET /sitemap.xml` route with XML escaping
- `GET /.well-known/agent-skills` route built from `pages` plus `apiEndpoints`
- `GET /llms-readiness` self-score endpoint with checks across discoverability, content, bots, and protocol categories. Optional bearer auth via `AGENT_READY_READINESS_SECRET` (legacy `LLMS_READINESS_SECRET` still works)
- Markdown content negotiation helper `mountMarkdownNegotiation(http, components.agentReady)` for serving `Accept: text/markdown` requests directly from `pages.fullContent`
- React and Svelte widget gain a third `SCORE` tab plus `showHumanTab`, `showMachineTab`, `showScoreTab`, `defaultTab`, and `tabs` props for full visibility control. Tab strip collapses to a single panel when only one tab is visible
- New CLI commands: `npx agent-ready` (default flow: one-shot enable plus regenerate plus score), `npx agent-ready scan [--url]` (HTTP audit with CI-friendly exit codes), `npx agent-ready robots` (prints recommended fragment)
- New optional schema fields on the `settings` table: `contentSignals`, `markdownNegotiation`, `discoveryHeaders`, `robotsTxtEnabled`, `robotsTxtAllowAiBots`, `robotsTxtDisallowPaths`, `sitemapEnabled`, `agentSkillsEnabled`, `readinessEndpointEnabled`. All `v.optional()` for backward compatibility
- New `fileType` literals on the `cachedFiles` table: `robots.txt`, `sitemap.xml`, `agent-skills.json`
- `SETUP.md` gains a new section 14 for enabling agent readiness on the demos
- `INTEGRATION.md` gains eight new consumer-facing sections covering quick start, Content-Signal, markdown negotiation, robots and sitemap, agent-skills, readiness score, widget tab configuration, and a security reference

### Changed

- Bumped Convex peer dependency minimum from `^1.17.0` to `^1.28.0` (component deploy unification)
- Bumped Convex dev dependency and example apps from `^1.17.0` to `^1.36.0` for latest CLI features (`ctx.meta`, `--inline-query`, `--start` flag, component `httpPrefix`, local backend improvements)
- Fixed `Date.now()` usage in `analytics.getSummary` and `analytics.getTimeSeries` queries. Both now accept a required `now` argument from the caller to preserve Convex query caching and reactivity
- Updated React and Svelte analytics pages to pass a rounded `now` timestamp (per minute granularity) so subscriptions stay stable
- Updated CLI `analytics` command to pass `now: Date.now()` to the summary query
- Example dev scripts now use `npx convex dev --start 'vite'` to run Convex and the frontend in a single process (Convex 1.35.0 feature)
- Added `.convex/` to `.gitignore` for local backend data storage (Convex 1.32.0+)
- `SETUP.md` prerequisites updated to require Node 20+ and Convex 1.36+, dev command examples now show the `--start` flag

### Added

- `SETUP.md` linear setup and publish guide at repo root covering prerequisites, local install, wire-up for host apps, setup wizard, local verification, both demo apps, GitHub publish via `gh`, npm publish with dry run, Convex deploy for both demos, `@convex-dev/static-hosting` upload, ETag behavior test, UpdateBanner refresh flow test, go-live flip, rollback, analytics, cleanup, versions
- PostHog-inspired redesign of both demo apps: cream background (`#eeefe9`), hard black borders, window chrome with title bar and macOS-style dot controls, file-style sidebar with primary nav + live files section, tab strip with orange active underline (`#f54e00`), orange primary CTAs with drop shadow, metric cards on analytics, pill-style status badges, and page footer
- Shared React demo components under `example-react/src/components/`: `Window.tsx`, `Sidebar.tsx`, `Tabs.tsx`, `Button.tsx`
- Metric cards on the analytics page showing total requests plus top agent and top file for the last 30 days
- PRD `prds/setup-and-demo-posthog-redesign.md` covering both deliverables
- Initial repo scaffold driven by `prds/convex-llms-txt-prd-v6.md`
- Root package manifest with workspace layout for `src/`, `cli/`, `example-react/`, `example-svelte/`
- Component backend scaffold in `src/component/`: `convex.config.ts`, `schema.ts`, `content.ts`, `analytics.ts`, `http.ts`, `generation.ts`, `cronWorker.ts`, `lib.ts`
- Client entry point `src/client/index.ts` with `registerRoutes`, class-based client, typed client factory, and shared types
- React widget entry at `src/react/`: `AgentReadyWidget`, `useAgentReadyStatus`, update staleness hook
- Svelte widget entry at `src/svelte/`: `AgentReadyWidget.svelte`, `createAgentReadyStatusStore()`
- CLI binary under `cli/` with commands: `setup`, `sync`, `status`, `regenerate`, `rollback`, `go-live`, `generate-descriptions`, `publish-page`, `draft-page`, `archive-page`, `restore-page`, `analytics`, `cleanup`, `versions`
- React demo at `example-react/` wired for `@convex-dev/static-hosting`
- Svelte demo at `example-svelte/` with `@sveltejs/adapter-static`
- `INTEGRATION.md` LLM-optimized integration guide in the repo root
- `README.md`, `CONTRIBUTING.md`, and `LICENSE`
- `task.md`, `files.md`, `changelog.md`

### Changed

- `SETUP.md` restructured into two parts. Part 1 walks the author through GitHub publish, npm publish, Convex deploy for both demo apps, and live verification. Part 2 walks a consumer through installing the component into their own app with full CLI reference and troubleshooting table
- `src/component/analytics.ts` flipped `recordRequest` from `internalMutation` to `mutation`. Registered routes run in the host app and call the mutation across the component boundary, so it must be public per the Convex component visibility rules
- `src/component/content.ts` flipped `invalidateCache` from `mutation` to `internalMutation`. It is only ever called from inside the component by `regenerateAll` and `sync`, both of which stay public
- `src/component/cronWorker.ts` references `api.analytics.cleanupOldRequests` instead of `internal.*` to match the public visibility of that mutation
- `package.json` exports now include `./convex.config`, `./_generated/component.js`, and `./_generated/api.js` so consumers and Convex tooling can reach the generated component module without a deep import path
- `example-react/src/App.tsx`, `Settings.tsx`, `Analytics.tsx`, `index.css`, `index.html` rewritten to use the window-chrome layout and PostHog palette
- `example-svelte/src/app.css`, `app.html`, `routes/+layout.svelte`, `routes/+page.svelte`, `routes/settings/+page.svelte`, `routes/analytics/+page.svelte` rewritten to mirror the React demo

### Removed

- `src/component/http.ts` legacy factory helpers. The real HTTP mounting path is `registerRoutes` in `src/client/index.ts`, the removed file was an unused alternate surface that could confuse a component review
