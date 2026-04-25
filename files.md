# Files manifest

Plain text map of every file in the repo. Regenerate by hand as files are added or removed.

## Root

- `README.md`: Project overview, install and quick start
- `SETUP.md`: Linear step-by-step setup and publish guide covering install, wire-up, demo deploy, GitHub + npm publish, ETag test, refresh banner test, go-live
- `INTEGRATION.md`: LLM-optimized integration guide covering React, Svelte, static hosting, and manual paths
- `CONTRIBUTING.md`: Widget contract, local dev flow, publishing rules
- `LICENSE`: Apache 2.0
- `package.json`: Root package manifest, publishes `@waynesutton/agent-ready` with subpath exports
- `tsconfig.json`: Base TypeScript config for component source
- `tsconfig.build.json`: Build config for the publishable package
- `task.md`: Milestone tracker, aligned with `prds/convex-llms-txt-prd-v6.md`
- `changelog.md`: Keep a Changelog formatted release notes
- `files.md`: This file
- `.gitignore`: Git ignore patterns
- `.npmignore`: Extra ignores for npm publish
- `prds/convex-llms-txt-prd-v6.md`: Source of truth for the component design
- `prds/setup-and-demo-posthog-redesign.md`: PRD covering the SETUP.md guide and the PostHog-inspired demo redesign
- `prds/agent-readiness-v1.md`: PRD for the 10 agent-readiness features, widget tab visibility controls, CLI commands, and doc updates that turn any consumer app into an isitagentready.com pass
- `mockup-react.html`: Standalone HTML mockup of the React demo's agent-readiness control panel. Shows the score ring, per-check grid, response headers, schema toggles, and the 3-tab widget with SCORE active
- `mockup-svelte.html`: Standalone HTML mockup of the Svelte demo's analytics dashboard with agent-readiness signals layered in. Shows the 4-card metric grid (including markdown-negotiation count and readiness scans), agent and file breakdowns, signals panel, and 3-tab widget

## Component source — `src/`

- `src/client/index.ts`: Public package entry, exports `registerRoutes`, `AgentReady` class client, `createTypedAgentReadyClient`, types
- `src/client/types.ts`: Shared type definitions for settings, pages, endpoints, cached files, route names, event payloads
- `src/component/convex.config.ts`: Component declaration via `defineComponent("agentReady")`
- `src/component/schema.ts`: `settings`, `pages`, `apiEndpoints`, `cachedFiles`, `agentRequests`, `pageVersions` tables with indexes
- `src/component/content.ts`: Queries and mutations for settings, pages, endpoints, cached files, plus `regenerateAll`, `generateDescriptions`, `sync` actions. `invalidateCache` is internal, called by the public action wrappers only
- `src/component/analytics.ts`: `recordRequest` public mutation (called across the boundary from `registerRoutes`), `getSummary`, `getTimeSeries`, `cleanupOldRequests`, `cleanupOrphanedCacheEntries`
- `src/component/generation.ts`: Workpool-backed generation of `llms.txt`, `agents.md`, `llms-full.txt`
- `src/component/crons.ts`: Dynamic cron worker that refreshes content and trims analytics via `api.analytics.cleanupOldRequests`
- `src/component/lib.ts`: Shared helpers: SHA-256 hashing, user-agent classification, origin check, config diffing

## React widget — `src/react/`

- `src/react/index.ts`: Barrel export
- `src/react/AgentReadyWidget.tsx`: HUMAN or MACHINE toggle widget, terminal aesthetic
- `src/react/useAgentReadyStatus.ts`: Live subscription hook for cached file status and staleness detection
- `src/react/UpdateBanner.tsx`: Optional banner wrapper on top of `useAgentReadyStatus` for version change notifications

## Svelte widget — `src/svelte/`

- `src/svelte/index.ts`: Barrel export
- `src/svelte/AgentReadyWidget.svelte`: Svelte widget counterpart to the React widget
- `src/svelte/store.ts`: `createAgentReadyStatusStore()` Svelte store for live status subscription

## CLI — `cli/`

- `cli/bin.mjs`: CLI entry, resolves subcommand
- `cli/index.mjs`: CLI dispatcher and shared helpers
- `cli/commands/setup.mjs`: Interactive first-run wizard
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
- `cli/commands/agent-ready.mjs`: Planned. One-command flag flip that enables every agent-readiness feature, syncs config, regenerates files, and prints the readiness score
- `cli/commands/scan.mjs`: Planned. Pure HTTP auditor that curls every agent-readiness endpoint and prints a pass-fail table. Exits non-zero when score drops below 80 so it works in CI
- `cli/commands/robots.mjs`: Planned. Prints the recommended `robots.txt` fragment for the operator to inspect. No deployment required
- `cli/lib/prompts.mjs`: Prompt helpers for the setup wizard
- `cli/lib/convex.mjs`: Convex deployment helpers (env parsing, run command)

## React demo — `example-react/`

- `example-react/package.json`: Scripts for dev, build, deploy via `static-hosting`
- `example-react/vite.config.ts`: Vite config
- `example-react/tsconfig.json`: TS config for the demo
- `example-react/index.html`: Vite entry HTML
- `example-react/setup.mjs`: Idempotent seed script that runs before dev
- `example-react/agent-ready.config.json`: Starter config consumed by `sync`
- `example-react/convex/convex.config.ts`: Uses `crons`, `workpool`, `agentReady`, `staticHosting`
- `example-react/convex/schema.ts`: Host app schema (empty tables allowed)
- `example-react/convex/http.ts`: `registerRoutes` for agent-ready plus `registerStaticRoutes` for the demo
- `example-react/convex/staticHosting.ts`: Re-exports `exposeUploadApi`
- `example-react/convex/myApp.ts`: Example callbacks for `onGenerationComplete`, `onAnalyticsThreshold`
- `example-react/src/main.tsx`: React root
- `example-react/src/App.tsx`: Landing page with PostHog-inspired window chrome, sidebar, tabs, and widget
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
- `example-svelte/setup.mjs`: Idempotent seed script
- `example-svelte/agent-ready.config.json`: Starter config
- `example-svelte/convex/convex.config.ts`: Component wiring
- `example-svelte/convex/schema.ts`: Host app schema
- `example-svelte/convex/http.ts`: `registerRoutes` plus static routes
- `example-svelte/convex/staticHosting.ts`: Upload API re-exports
- `example-svelte/src/app.html`: SvelteKit HTML shell
- `example-svelte/src/app.css`: Global styles
- `example-svelte/src/routes/+layout.svelte`: Root layout with widget
- `example-svelte/src/routes/+page.svelte`: Landing page
- `example-svelte/src/routes/settings/+page.svelte`: Settings panel
- `example-svelte/src/routes/analytics/+page.svelte`: Analytics page
