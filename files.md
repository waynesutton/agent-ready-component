# Files manifest

Plain text map of every file in the `@waynesutton/agent-ready` repo. This is a Convex component with React and Svelte widgets. Regenerate by hand as files are added or removed.

## Root

- `README.md`: Project overview for the Convex component with React/Svelte widgets, hidden widget mode, `links` CLI command, canonical app developer install guide, demo commands, and submission-ready docs links
- `SETUP.md`: Author release guide for shipping the package to GitHub, npm, and Convex static hosting. Includes dev deployment configuration, component codegen, npm package checks, demo GitHub OAuth setup, and production deploy instructions
- `docs/install.md`: Lightweight install entry point that links readers to the canonical README install guide and fast-path verification commands including `npx agent-ready links`
- `docs/install.html`: Standalone HTML install entry point that links readers to the canonical README install guide
- `INTEGRATION.md`: LLM-optimized integration guide for the Convex component, covering React and Svelte widgets, hidden widget mode, the `links` CLI command, static hosting, and manual paths
- `CONTRIBUTING.md`: Widget contract, local dev flow, publishing rules
- `LICENSE`: Apache 2.0
- `package.json`: Root package manifest for the Convex component, publishes `@waynesutton/agent-ready` with subpath exports for React, Svelte, and the CLI
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
- `prds/setup-and-demo-redesign.md`: PRD covering the SETUP.md guide and the demo app redesign
- `prds/agent-readiness-v1.md`: PRD for the 10 agent-readiness features, widget tab visibility controls, CLI commands, and doc updates that turn any consumer app into an isitagentready.com pass
- `prds/setup-docs-split.md`: PRD for splitting author setup docs from consumer install docs and linking the install guide from both demos
- `prds/typecheck-component-circularity.md`: PRD for fixing packaged component codegen and TypeScript circular reference failures
- `prds/demo-component-wrapper-cors-fix.md`: PRD for fixing demo component API wrappers and `/llms-status` CORS failures
- `prds/settings-panel-export.md`: PRD for exporting the settings panel component, shipping Convex wrapper functions, and updating the CLI setup wizard
- `prds/widget-v2-config.md`: PRD for widget v2 features: center position, HUMAN tab AI chat links, MACHINE tab Phosphor icons, status visibility toggle, and custom hex colors
- `prds/security-hardening.md`: PRD for auth integration, demo lockdown, bounded analytics queries, and cron worker `internal.*` fix
- `prds/widget-display-modes.md`: PRD for widget display mode options: clean mode, tab visibility, and per-provider chat link toggles
- `prds/github-oauth-demo-app-recovery.md`: PRD documenting the GitHub OAuth demo app login fixes, root causes, verification steps, and future app checklist
- `prds/docs-submission-readiness.md`: PRD documenting the final docs pass before Convex components directory submission
- `prds/svelte-check-cleanup.md`: PRD documenting the Svelte demo typecheck cleanup for auth, settings, analytics, and generated Convex bindings
- `prds/setup-widget-prompt.md`: PRD for setup wizard widget install guidance, framework selection, mount location defaults, and verification
- `prds/agent-ready-integration-feedback.md`: PRD documenting widget URL intent (endpoint vs public), expanded route ownership, thin content readiness checks, `import` and `discover` CLI commands, optional page sections, dynamic content sync wrappers, and verification steps
- `prds/widget-mobile-collapse.md`: PRD documenting the mobile collapsed presentation for the widget: matchMedia breakpoint detection, collapsed-by-default behavior, inline Phosphor caret toggle, mobile-safe width clamp, edge insets, and the new `mobileCollapse`, `mobileBreakpoint`, and `defaultMobileCollapsed` props on both React and Svelte widgets
- `prds/widget-desktop-collapse.md`: PRD for the desktop collapse opt-in: new `desktopCollapse` prop and `widgetDesktopCollapse` config setting, shared `collapseActive` flag that drives the Phosphor caret toggle and panel visibility on desktop without changing widget width or insets, demo `agent-ready.config.json` defaults, and the CLI setup wizard prompt
- `prds/widget-hidden-links-cli.md`: PRD for hiding the widget while keeping generated files live, adding the setup wizard visibility choice, and adding the `npx agent-ready links` command
- `prds/rss-feed.md`: PRD for opt-in RSS 2.0 feed at `/feed.xml` generated from pages table, integrated with CLI setup, widgets, and readiness checks
- `mockup-react.html`: Standalone HTML mockup of the React demo's agent-readiness control panel. Shows the score ring, per-check grid, response headers, schema toggles, and the 3-tab widget with SCORE active
- `mockup-svelte.html`: Standalone HTML mockup of the Svelte demo's analytics dashboard with agent-readiness signals layered in. Shows the 4-card metric grid (including markdown-negotiation count and readiness scans), agent and file breakdowns, signals panel, and 3-tab widget

## Public assets — `public/`

- `public/human-agent-ready-demo.png`: Screenshot of the widget HUMAN tab showing app name and AI chat links
- `public/agent-agent-ready-demo.png`: Screenshot of the widget MACHINE tab showing file links and status
- `public/score-agent-ready-demo.png`: Screenshot of the widget SCORE tab showing 100/100 readiness with 11 passing checks

## Component source — `src/`

- `src/client/index.ts`: Public package entry, exports `registerRoutes`, `AgentReady` class client, `createTypedAgentReadyClient`, types, CORS handling, and all agent readiness routes (`/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/.well-known/agent-skills`, `/llms-readiness`). Supports `skipRoutes` option to avoid conflicts with host app routes
- `src/client/types.ts`: Shared type definitions for settings, pages, endpoints, cached files, route names, event payloads, `WidgetColors`, widget position, `ContentSignals`, `ReadinessReport`, `ReadinessCheck`, `AgentReadyStatus` with readiness fields including `rssEnabled`, `widgetVisible`, `widgetShowScoreTab`, widget display mode fields, and `SkippableRoute` type for `skipRoutes` (includes `/feed.xml`)
- `src/component/convex.config.ts`: Component declaration via `defineComponent("agentReady")`
- `src/component/_generated/`: Generated Convex component bindings created by `npx convex codegen --component-dir ./src/component`
- `src/component/schema.ts`: `settings`, `pages`, `apiEndpoints`, `cachedFiles`, `agentRequests`, `pageVersions` tables with indexes. Settings include 10 agent readiness fields (including `rssEnabled`), `widgetVisible`, `widgetShowScoreTab`, and widget display mode fields. File type union covers 7 values: `llms.txt`, `agents.md`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `agent-skills.json`, `rss.xml`
- `src/component/content.ts`: Public settings, page, endpoint, cache, and version functions. `getCacheStatus` returns top-level widget visibility, widget display flags, and readiness feature flags
- `src/component/contentInternal.ts`: Internal action support for settings reads, page reads, sync application (handles readiness fields), cache invalidation, and generation scheduling
- `src/component/analytics.ts`: `recordRequest` public mutation (called across the boundary from `registerRoutes`), `getSummary`, `getTimeSeries`, `cleanupOldRequests`, `cleanupOrphanedCacheEntries`, plus `internalCleanupOldRequests` internalMutation for server-to-server use by the cron worker. All `.collect()` calls bounded with `.take()`
- `src/component/generation.ts`: Workpool-backed generation of `llms.txt`, `agents.md`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `agent-skills.json`, `rss.xml`
- `src/component/cronWorker.ts`: Dynamic cron worker that refreshes content and trims analytics via `internal.analytics.internalCleanupOldRequests`
- `src/component/lib.ts`: Shared helpers: SHA-256 hashing, user-agent classification, origin check, config diffing, `escapeXml`, `sanitizePath`, `estimateTokens`, `buildContentSignalHeader`, `buildDiscoveryLinkHeader`, `KNOWN_AI_BOTS`
- `src/component/validators.ts`: Shared Convex validators for component documents, sync config payloads, content signals, and typed action/query return values

## Root Convex scaffolding — `convex/`

- `convex/README.md`: Convex generated starter README
- `convex/schema.ts`: Empty root Convex schema for the author scaffold
- `convex/tsconfig.json`: Convex generated TypeScript config for the root deployment scaffold
- `convex/_generated/`: Generated root Convex app bindings and AI guidelines from `npx convex dev --once`

## React widget — `src/react/`

- `src/react/index.ts`: Barrel export for widget, hooks, and settings panel
- `src/react/AgentReadyWidget.tsx`: HUMAN, MACHINE, SCORE toggle widget with terminal aesthetic. SCORE tab shows readiness score, color dot, and check list from `/llms-readiness`. Supports `visible`, `cleanMode`, `showHumanTab`, `showMachineTab`, `showChatLinks`, `showChatGPT`, `showClaude`, `showPerplexity` props and config-driven equivalents. Renders nothing when `visible` or `widgetVisible` resolves to `false`, while generated files stay live. Renders a compact mobile presentation below `mobileBreakpoint` (default 480px) and desktop collapse via the shared `collapseActive` flag
- `src/react/useAgentReadyReadiness.ts`: Hook that polls `/llms-readiness` every 60 seconds and returns `ReadinessReport | null`
- `src/react/AgentReadySettingsPanel.tsx`: Optional drop-in settings panel for managing pages, cache, and actions. Framework-agnostic design: consumers pass Convex query results and mutation callbacks as props. Ships with inline styles so it works without external CSS
- `src/react/useAgentReadyStatus.ts`: Live subscription hook for cached file status and staleness detection
- `src/react/UpdateBanner.tsx`: Optional banner wrapper on top of `useAgentReadyStatus` for version change notifications

## Svelte widget — `src/svelte/`

- `src/svelte/index.ts`: Barrel export
- `src/svelte/AgentReadyWidget.svelte`: HUMAN, MACHINE, SCORE toggle widget matching the React widget. SCORE tab polls `/llms-readiness` every 60s, shows color-coded score and check list. Config-driven visibility, center positioning, custom color support, and widget display mode props (`visible`, `cleanMode`, `showHumanTab`, `showMachineTab`, `showChatLinks`, `showChatGPT`, `showClaude`, `showPerplexity`). Mirrors the React mobile collapsed presentation and desktop collapse behavior
- `src/svelte/store.ts`: `createAgentReadyStatusStore()` Svelte store for live status subscription

## CLI — `cli/`

- `cli/bin.mjs`: CLI entry, resolves subcommand
- `cli/index.mjs`: CLI dispatcher and shared helpers
- `cli/commands/setup.mjs`: Interactive first-run wizard. Writes `agent-ready.config.json`, scaffolds Convex wrapper files at `convex/agentReady/content.ts` and `convex/agentReady/analytics.ts`, detects existing discovery routes and static files to avoid conflicts, asks whether the widget should be visible or hidden, skips widget install guidance when hidden, prompts for desktop collapse when visible, syncs config to the deployment, and prints next steps including the `skipRoutes` snippet when conflicts are detected
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
- `cli/commands/agent-ready.mjs`: One-command flag flip that enables every agent-readiness feature (including `rssEnabled`), syncs config, and regenerates files
- `cli/commands/scan.mjs`: Pure HTTP auditor that checks every agent-readiness endpoint (including `/feed.xml`) and prints a pass/fail table. Exits non-zero when score drops below 80 for CI use
- `cli/commands/import.mjs`: Migrates an existing `llms.txt` from `public/`, `static/`, or the project root into `agent-ready.config.json`. Parses H1, blockquote, H2 sections, and bullet links. Supports `--from`, `--overwrite`, and `--dry-run`
- `cli/commands/discover.mjs`: Prints a local discovery report from `convex/http.ts`, `public/llms.txt`, `public/agents.md`, and `public/llms-full.txt`. Suggests `npx agent-ready import` next steps without writing config
- `cli/commands/links.mjs`: Prints copyable generated file URLs (including `/feed.xml` when enabled) and AI chat URLs from `agent-ready.config.json` or `--url`, independent of whether the widget is visible
- `cli/lib/banner.mjs`: Reusable block-style ASCII banner printed by CLI setup and help output
- `cli/lib/prompts.mjs`: Prompt helpers for the setup wizard
- `cli/lib/convex.mjs`: Convex deployment helpers, auto-detects `agentReady:` prefix and converts to `--component agentReady` for the current Convex CLI

## React demo — `example-react/`

A Convex app (React + Vite) that shows the component and React widget in action.

- `example-react/package.json`: Scripts for dev, build, deploy, and `deploy:full` one-command production deploy via `static-hosting`
- `example-react/vite.config.ts`: Vite config
- `example-react/tsconfig.json`: TS config for the demo
- `example-react/index.html`: Vite entry HTML
- `example-react/setup.mjs`: Idempotent seed script that runs before dev, uses `--component agentReady` for Convex CLI
- `example-react/agent-ready.config.json`: Starter config consumed by `sync`, appUrl set to the production deployment. Includes `widgetVisible`, all widget visibility flags, `widgetShowScoreTab`, widget display mode flags, `widgetColors` defaults, agent readiness flags, and `rssEnabled`
- `example-react/.env.production.local`: Production Convex URLs for Vite build (git-ignored)
- `example-react/convex/convex.config.ts`: Uses `auth`, `crons`, `workpool`, `agentReady`, `staticHosting`
- `example-react/convex/schema.ts`: Host app schema (empty tables allowed, auth tables isolated in the auth component)
- `example-react/convex/auth.ts`: Auth config using `@robelest/convex-auth` with the GitHub OAuth provider
- `example-react/convex/auth.config.ts`: Convex JWT trust config for `@robelest/convex-auth`
- `example-react/convex/auth/core.ts`: Lightweight auth context for queries and mutations
- `example-react/convex/functions.ts`: `authQuery`, `authMutation`, `authAction` custom function wrappers using `auth.ctx()` and `convex-helpers`
- `example-react/convex/_generated/`: Generated Convex app bindings for the React demo
- `example-react/convex/tsconfig.json`: Convex function TypeScript config for the React demo
- `example-react/convex/agentReady/content.ts`: App-facing content wrappers. Read-only queries are public, admin mutations use `authMutation`/`authAction`
- `example-react/convex/agentReady/analytics.ts`: App-facing analytics wrappers around `components.agentReady.analytics` for browser clients
- `example-react/convex/http.ts`: `auth.http.add(http)` for auth routes, `registerRoutes` for agent-ready, `registerStaticRoutes` for the demo through `components.selfHosting`
- `example-react/convex/staticHosting.ts`: Re-exports `exposeUploadApi` against `components.selfHosting` including batch upload functions
- `example-react/convex/myApp.ts`: Example callbacks for `onGenerationComplete`, `onAnalyticsThreshold`
- `example-react/src/main.tsx`: React root with ConvexProvider
- `example-react/src/auth.tsx`: Auth client hook (`useAuth`) and `AuthGate` component for protecting admin routes with GitHub OAuth sign-in
- `example-react/src/App.tsx`: Landing page with window chrome, sidebar, tabs, widget, README install guide links, internal README-style Docs page with hidden widget and `links` command guidance, and Resources cards. Settings and Analytics routes wrapped in `AuthGate`
- `example-react/src/Settings.tsx`: Settings panel with tabbed pages, cache status, and actions
- `example-react/src/Analytics.tsx`: Analytics dashboard with metric grid plus agent and file breakdown
- `example-react/src/index.css`: Global styles with cream palette, window chrome, tabs, buttons, pills
- `example-react/src/components/Window.tsx`: Shared window-chrome wrapper
- `example-react/src/components/Sidebar.tsx`: File-style navigation sidebar with Project links, internal Docs route, live file links, and Resources route
- `example-react/src/components/Tabs.tsx`: Tab strip with active orange underline
- `example-react/src/components/Button.tsx`: Primary and ghost button variants

## Svelte demo — `example-svelte/`

A Convex app (SvelteKit) that shows the component and Svelte widget in action.

- `example-svelte/package.json`: Scripts for dev, build, deploy via `static-hosting`
- `example-svelte/.gitignore`: Ignores local Svelte demo artifacts such as `.env.local` and `.svelte-kit`
- `example-svelte/svelte.config.js`: Uses `@sveltejs/adapter-static`
- `example-svelte/vite.config.ts`: Vite config
- `example-svelte/tsconfig.json`: TS config
- `example-svelte/setup.mjs`: Idempotent seed script, uses `--component agentReady` for Convex CLI
- `example-svelte/agent-ready.config.json`: Starter config with `widgetVisible`, all widget visibility flags, `widgetShowScoreTab`, widget display mode flags, `widgetColors` defaults, agent readiness flags, and `rssEnabled` enabled
- `example-svelte/convex/convex.config.ts`: Component wiring
- `example-svelte/convex/schema.ts`: Host app schema
- `example-svelte/convex/_generated/`: Generated Convex app bindings for the Svelte demo
- `example-svelte/convex/agentReady/content.ts`: App-facing content wrappers around `components.agentReady.content` for browser clients
- `example-svelte/convex/agentReady/analytics.ts`: App-facing analytics wrappers around `components.agentReady.analytics` for browser clients
- `example-svelte/convex/http.ts`: `registerRoutes` plus static routes through `components.selfHosting`
- `example-svelte/convex/staticHosting.ts`: Upload API re-exports against `components.selfHosting` including batch upload functions
- `example-svelte/convex/auth.ts`: Auth config using `@robelest/convex-auth` with the GitHub OAuth provider
- `example-svelte/convex/auth.config.ts`: Convex JWT trust config for `@robelest/convex-auth`
- `example-svelte/convex/auth/core.ts`: Lightweight auth context for queries and mutations
- `example-svelte/src/lib/AuthGate.svelte`: Auth gate component for protecting admin routes with GitHub OAuth sign-in
- `example-svelte/src/app.html`: SvelteKit HTML shell
- `example-svelte/src/app.css`: Global styles for the demo shell, cards, tables, metrics, and README-style docs page
- `example-svelte/src/routes/+layout.svelte`: Root layout with widget, README install guide topbar link, internal Docs route, and Resources route
- `example-svelte/src/routes/+page.svelte`: Landing page with usage panels, README install guide link, and internal Docs link
- `example-svelte/src/routes/docs/+page.svelte`: README-style docs page for installing and wiring the component in a Convex app, including hidden widget and `links` command guidance, with Diffs by Pierre as a reference link
- `example-svelte/src/routes/settings/+page.svelte`: Settings panel
- `example-svelte/src/routes/analytics/+page.svelte`: Analytics page
- `example-svelte/src/routes/resources/+page.svelte`: Resources page with internal Agent Ready docs, Diffs by Pierre, Convex docs, component docs, auth docs, and agent discovery specs
