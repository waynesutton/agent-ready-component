# Files manifest

Plain text map of every file in the repo. Regenerate by hand as files are added or removed.

## Root

- `README.md`: Project overview, install quick start, demo commands, and links to consumer install docs
- `SETUP.md`: Author release guide for shipping the package to GitHub, npm, and Convex static hosting, including dev deployment configuration before component codegen and npm package checks
- `docs/install.md`: Consumer install guide for adding `@waynesutton/agent-ready` to a Convex app
- `docs/install.html`: Standalone HTML version of the consumer install guide
- `INTEGRATION.md`: LLM-optimized integration guide covering React, Svelte, static hosting, and manual paths
- `CONTRIBUTING.md`: Widget contract, local dev flow, publishing rules
- `LICENSE`: Apache 2.0
- `package.json`: Root package manifest, publishes `@waynesutton/agent-ready` with subpath exports plus CLI and docs package contents
- `package-lock.json`: npm lockfile for the root workspace and example apps, including dependency updates used to resolve npm audit and peer dependency conflicts
- `tsconfig.json`: Base TypeScript config for component source
- `tsconfig.build.json`: Build config for the publishable package
- `convex.json`: Root Convex config pointing functions to `convex/`
- `task.md`: Milestone tracker, aligned with `prds/convex-llms-txt-prd-v6.md`
- `changelog.md`: Keep a Changelog formatted release notes
- `files.md`: This file
- `.gitignore`: Git ignore patterns
- `.npmignore`: Extra ignores for npm publish
- `prds/convex-llms-txt-prd-v6.md`: Source of truth for the component design
- `prds/setup-and-demo-posthog-redesign.md`: PRD covering the SETUP.md guide and the PostHog-inspired demo redesign
- `prds/agent-readiness-v1.md`: PRD for the 10 agent-readiness features, widget tab visibility controls, CLI commands, and doc updates that turn any consumer app into an isitagentready.com pass
- `prds/setup-docs-split.md`: PRD for splitting author setup docs from consumer install docs and linking the install guide from both demos
- `prds/typecheck-component-circularity.md`: PRD for fixing packaged component codegen and TypeScript circular reference failures
- `prds/demo-component-wrapper-cors-fix.md`: PRD for fixing demo component API wrappers and `/llms-status` CORS failures
- `prds/settings-panel-export.md`: PRD for exporting the settings panel component, shipping Convex wrapper functions, and updating the CLI setup wizard
- `prds/widget-v2-config.md`: PRD for widget v2 features: center position, HUMAN tab AI chat links, MACHINE tab Phosphor icons, status visibility toggle, and custom hex colors
- `mockup-react.html`: Standalone HTML mockup of the React demo's agent-readiness control panel. Shows the score ring, per-check grid, response headers, schema toggles, and the 3-tab widget with SCORE active
- `mockup-svelte.html`: Standalone HTML mockup of the Svelte demo's analytics dashboard with agent-readiness signals layered in. Shows the 4-card metric grid (including markdown-negotiation count and readiness scans), agent and file breakdowns, signals panel, and 3-tab widget

## Component source — `src/`

- `src/client/index.ts`: Public package entry, exports `registerRoutes`, `AgentReady` class client, `createTypedAgentReadyClient`, types, CORS handling, and all agent readiness routes (`/robots.txt`, `/sitemap.xml`, `/.well-known/agent-skills`, `/llms-readiness`)
- `src/client/types.ts`: Shared type definitions for settings, pages, endpoints, cached files, route names, event payloads, `WidgetColors`, widget position, `ContentSignals`, `ReadinessReport`, `ReadinessCheck`, and `AgentReadyStatus` with readiness fields
- `src/component/convex.config.ts`: Component declaration via `defineComponent("agentReady")`
- `src/component/_generated/`: Generated Convex component bindings created by `npx convex codegen --component-dir ./src/component`
- `src/component/schema.ts`: `settings`, `pages`, `apiEndpoints`, `cachedFiles`, `agentRequests`, `pageVersions` tables with indexes. Settings include 9 agent readiness fields
- `src/component/content.ts`: Public settings, page, endpoint, cache, and version functions. `getCacheStatus` returns widget visibility and readiness feature flags
- `src/component/contentInternal.ts`: Internal action support for settings reads, page reads, sync application (handles readiness fields), cache invalidation, and generation scheduling
- `src/component/analytics.ts`: `recordRequest` public mutation (called across the boundary from `registerRoutes`), `getSummary`, `getTimeSeries`, `cleanupOldRequests`, `cleanupOrphanedCacheEntries`
- `src/component/generation.ts`: Workpool-backed generation of `llms.txt`, `agents.md`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `agent-skills.json`
- `src/component/cronWorker.ts`: Dynamic cron worker that refreshes content and trims analytics via `api.analytics.cleanupOldRequests`
- `src/component/lib.ts`: Shared helpers: SHA-256 hashing, user-agent classification, origin check, config diffing, `escapeXml`, `sanitizePath`, `estimateTokens`, `buildContentSignalHeader`, `buildDiscoveryLinkHeader`, `KNOWN_AI_BOTS`
- `src/component/validators.ts`: Shared Convex validators for component documents, sync config payloads, content signals, and typed action/query return values

## Root Convex scaffolding — `convex/`

- `convex/README.md`: Convex generated starter README
- `convex/schema.ts`: Empty root Convex schema for the author scaffold
- `convex/tsconfig.json`: Convex generated TypeScript config for the root deployment scaffold
- `convex/_generated/`: Generated root Convex app bindings and AI guidelines from `npx convex dev --once`

## React widget — `src/react/`

- `src/react/index.ts`: Barrel export for widget, hooks, and settings panel
- `src/react/AgentReadyWidget.tsx`: HUMAN, MACHINE, SCORE toggle widget with terminal aesthetic. SCORE tab shows readiness score, color dot, and check list from `/llms-readiness`
- `src/react/useAgentReadyReadiness.ts`: Hook that polls `/llms-readiness` every 60 seconds and returns `ReadinessReport | null`
- `src/react/AgentReadySettingsPanel.tsx`: Optional drop-in settings panel for managing pages, cache, and actions. Framework-agnostic design: consumers pass Convex query results and mutation callbacks as props. Ships with inline styles so it works without external CSS
- `src/react/useAgentReadyStatus.ts`: Live subscription hook for cached file status and staleness detection
- `src/react/UpdateBanner.tsx`: Optional banner wrapper on top of `useAgentReadyStatus` for version change notifications

## Svelte widget — `src/svelte/`

- `src/svelte/index.ts`: Barrel export
- `src/svelte/AgentReadyWidget.svelte`: Svelte widget counterpart to the React widget with config-driven visibility, center positioning, and custom color support. All `show*` props resolve identically to the React widget
- `src/svelte/store.ts`: `createAgentReadyStatusStore()` Svelte store for live status subscription

## CLI — `cli/`

- `cli/bin.mjs`: CLI entry, resolves subcommand
- `cli/index.mjs`: CLI dispatcher and shared helpers
- `cli/commands/setup.mjs`: Interactive first-run wizard. Writes `agent-ready.config.json`, scaffolds Convex wrapper files at `convex/agentReady/content.ts` and `convex/agentReady/analytics.ts`, syncs config to the deployment, and prints next steps including the optional settings panel
- `cli/commands/sync.mjs`: Reads `agent-ready.config.json`, applies to deployment
- `cli/commands/status.mjs`: Prints cache and job state
- `cli/commands/regenerate.mjs`: Queues a `regenerateAll` workpool job
- `cli/commands/rollback.mjs`: Restores `previousContent` for a given file
- `cli/commands/go-live.mjs`: Disables `testMode` with confirmation prompt
- `cli/commands/generate-descriptions.mjs`: AI fills empty descriptions
- `cli/commands/publish-page.mjs`: Sets page status to published
- `cli/commands/draft-page.mjs`: Sets page status to draft
- `cli/commands/archive-page.mjs`: Archives a page
- `cli/commands/restore-page.mjs`: Restores a soft-deleted page
- `cli/commands/analytics.mjs`: Prints agent request summary
- `cli/commands/cleanup.mjs`: Runs analytics and cache cleanup
- `cli/commands/versions.mjs`: Shows version history for a page
- `cli/commands/agent-ready.mjs`: One-command flag flip that enables every agent-readiness feature, syncs config, and regenerates files
- `cli/commands/scan.mjs`: Pure HTTP auditor that checks every agent-readiness endpoint and prints a pass/fail table. Exits non-zero when score drops below 80 for CI use
- `cli/lib/prompts.mjs`: Prompt helpers for the setup wizard
- `cli/lib/convex.mjs`: Convex deployment helpers, auto-detects `agentReady:` prefix and converts to `--component agentReady` for the current Convex CLI

## React demo — `example-react/`

- `example-react/package.json`: Scripts for dev, build, deploy, and `deploy:full` one-command production deploy via `static-hosting`
- `example-react/vite.config.ts`: Vite config
- `example-react/tsconfig.json`: TS config for the demo
- `example-react/index.html`: Vite entry HTML
- `example-react/setup.mjs`: Idempotent seed script that runs before dev, uses `--component agentReady` for Convex CLI
- `example-react/agent-ready.config.json`: Starter config consumed by `sync`, appUrl set to the production deployment. Includes all widget visibility flags (`widgetShowFiles`, `widgetShowAppName`, `widgetShowDescription`, `widgetShowMeta`, `widgetStatusVisible`) and `widgetColors` with default hex values
- `example-react/.env.production.local`: Production Convex URLs for Vite build (git-ignored)
- `example-react/convex/convex.config.ts`: Uses `crons`, `workpool`, `agentReady`, `staticHosting`
- `example-react/convex/schema.ts`: Host app schema (empty tables allowed)
- `example-react/convex/_generated/`: Generated Convex app bindings for the React demo
- `example-react/convex/tsconfig.json`: Convex function TypeScript config for the React demo
- `example-react/convex/agentReady/content.ts`: App-facing content wrappers around `components.agentReady.content` for browser clients
- `example-react/convex/agentReady/analytics.ts`: App-facing analytics wrappers around `components.agentReady.analytics` for browser clients
- `example-react/convex/http.ts`: `registerRoutes` for agent-ready plus `registerStaticRoutes` for the demo through `components.selfHosting`
- `example-react/convex/staticHosting.ts`: Re-exports `exposeUploadApi` against `components.selfHosting` including batch upload functions
- `example-react/convex/myApp.ts`: Example callbacks for `onGenerationComplete`, `onAnalyticsThreshold`
- `example-react/src/main.tsx`: React root
- `example-react/src/App.tsx`: Landing page with PostHog-inspired window chrome, sidebar, tabs, widget, and install guide links
- `example-react/src/Settings.tsx`: Settings panel with tabbed pages, cache status, and actions
- `example-react/src/Analytics.tsx`: Analytics dashboard with metric grid plus agent and file breakdown
- `example-react/src/index.css`: Global styles with PostHog cream palette, window chrome, tabs, buttons, pills
- `example-react/src/components/Window.tsx`: Shared window-chrome wrapper
- `example-react/src/components/Sidebar.tsx`: File-style navigation sidebar
- `example-react/src/components/Tabs.tsx`: Tab strip with active orange underline
- `example-react/src/components/Button.tsx`: Primary and ghost button variants

## Svelte demo — `example-svelte/`

- `example-svelte/package.json`: Scripts for dev, build, deploy via `static-hosting`
- `example-svelte/svelte.config.js`: Uses `@sveltejs/adapter-static`
- `example-svelte/vite.config.ts`: Vite config
- `example-svelte/tsconfig.json`: TS config
- `example-svelte/setup.mjs`: Idempotent seed script, uses `--component agentReady` for Convex CLI
- `example-svelte/agent-ready.config.json`: Starter config with all widget visibility flags and `widgetColors` defaults
- `example-svelte/convex/convex.config.ts`: Component wiring
- `example-svelte/convex/schema.ts`: Host app schema
- `example-svelte/convex/agentReady/content.ts`: App-facing content wrappers around `components.agentReady.content` for browser clients
- `example-svelte/convex/agentReady/analytics.ts`: App-facing analytics wrappers around `components.agentReady.analytics` for browser clients
- `example-svelte/convex/http.ts`: `registerRoutes` plus static routes through `components.selfHosting`
- `example-svelte/convex/staticHosting.ts`: Upload API re-exports against `components.selfHosting` including batch upload functions
- `example-svelte/src/app.html`: SvelteKit HTML shell
- `example-svelte/src/app.css`: Global styles
- `example-svelte/src/routes/+layout.svelte`: Root layout with widget and install guide topbar link
- `example-svelte/src/routes/+page.svelte`: Landing page with usage panels and install guide links
- `example-svelte/src/routes/settings/+page.svelte`: Settings panel
- `example-svelte/src/routes/analytics/+page.svelte`: Analytics page
