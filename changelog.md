# Changelog

All notable changes to `@waynesutton/agent-ready` (formerly `@convex-dev/llms-txt`) are tracked here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Agent readiness v2 (`prds/agent-readiness-v2.md`). Simple mode defaults flipped on: `robots.txt` with AI bot rules and a Content-Signal block, `sitemap.xml`, the `Content-Signal` header (all-yes default), and discovery `Link` headers now serve without any flags, with zero-config fallbacks before the first sync. Set `robotsTxtEnabled: false`, `sitemapEnabled: false`, or `discoveryHeaders: false` to opt out
- YAML frontmatter (`title`, `description`) on every markdown twin, matching Cloudflare's Markdown for Agents shape. Frontmatter is stripped before HTML twin rendering
- `x-original-tokens` response header on markdown twins alongside `x-markdown-tokens`, so agents can compare markdown versus original HTML token cost
- `/.well-known/agent-skills/index.json`: SHA-256 digest index for the agent-skills endpoint, served whenever `agentSkillsEnabled` is on
- Optional `/.well-known/api-catalog` (RFC 9727) built from synced `apiEndpoints`, behind the new `apiCatalogEnabled` flag
- Agent-friendly 404 page at `/404.md` behind the new `notFoundPageEnabled` flag, linked from `llms.txt` under an Errors section, pointing agents at the sitemap, `llms.txt`, and `/markdown`
- `registerCanonicalPageRoutes(http, component, { paths })`: canonical-path `Accept: text/markdown` negotiation on real page URLs (not only `/markdown/*`), with `Vary: Accept` and `406 Not Acceptable` when the client rejects every offered type. Explicit opt in because these routes shadow SPA paths under static hosting
- `406 Not Acceptable` responses on `/markdown` and `/markdown/*` when the request's `Accept` header rejects both markdown and HTML
- Setup wizard now inspects `convex/convex.config.ts`: warns when `httpPrefix` is set (it moves `/llms.txt` and every discovery route under the prefix where scanners never look) and prints the app-owned root routing mount order when `@convex-dev/static-hosting` is detected
- `npx agent-ready agent-ready` also enables `apiCatalogEnabled` and `notFoundPageEnabled`
- Backward compatibility audit for the 0.2.x to 0.3.0 upgrade, documented in `prds/backward-compat-0-3-0.md`. Verified safe: draft installs stay draft (`testMode: true` resolves to `publish: "draft"` everywhere), live installs stay live, old config files sync correctly, `/llms-status` keeps the deprecated `testMode` mirror for older widgets, stored `fullTxtEnabled` values win over the new-install default flip, the per-site markdown route is collision-guarded with a `siteMdPath: false` opt-out, and legacy env var names still resolve
- `cacheStatusValidator` exported from the package root as the single source of truth for the `getCacheStatus` return shape. The component query, the setup wizard scaffold, both demo wrappers, and the INTEGRATION.md snippet now share it, so consumer wrapper validators can never go stale on future upgrades. Import with `import { cacheStatusValidator } from "@waynesutton/agent-ready"`
- Stale wrapper detection in the CLI (`cli/lib/wrappers.mjs`). `npx agent-ready sync` and `npx agent-ready setup` now scan `convex/agentReady/content.ts` for wrappers scaffolded by 0.2.x, list the exact missing validator fields, and print the import-based fix. This is the one real 0.3.0 upgrade break: inlined `cacheStatusValidator` copies throw `ReturnsValidationError` once the component returns `publish`, `siteSlug`, and the markdown fields
- `docs/upgrading.md`: what's new in 0.3.0, a 0.2.x vs 0.3.0 comparison table, backward compatibility guarantees, upgrade steps, the wrapper validator fix, route opt-outs, and verification commands. Linked from the README intro and Documentation section and shipped in the npm package
- "Quick release with folder checks" section at the top of `SETUP.md`: a five-step fast path with an explicit `cd` and `pwd` check per step covering commit and tag, npm publish, React demo redeploy via `deploy:full`, Svelte demo redeploy via `deploy:static`, and production curl verification of the describedby Link header, markdown negotiation, and `publish: "live"`
- Release guide checks in `SETUP.md` for the new backward compatibility pieces: a build-step grep that confirms `cacheStatusValidator` is exported from `dist/client`, an npm pack spot-check that `docs/upgrading.md` and `cli/lib/wrappers.mjs` ship in the tarball, and final checklist items for the README upgrading link, the stale wrapper warning on `sync`, and `go-live` updating the local config

### Changed

- `npx agent-ready scan` retuned: essential checks (discovery files, markdown negotiation, a real 404 probe) are scored; optional protocol endpoints (agent-skills, api-catalog, `404.md`, RSS, readiness) are reported but never lower the score. An SPA fallback answering 200 for unknown paths is reported as a known limit and not counted against the site. New informational homepage checks: `llms.txt` Link header, thin HTML, missing `<h1>`
- `/llms-readiness` now reports unscored bonus checks for the agent-skills digest index, API catalog, and `404.md`, and resolves default-on flags (robots, sitemap, discovery headers) the same way the routes do
- `scan --strict` verifies a real page markdown twin and prints its `x-original-tokens` value
- INTEGRATION.md documents route ownership for static hosting: required mount order (`registerRoutes`, `registerMarkdownRoutes`, `registerStaticRoutes`), the `httpPrefix` trap, and the SPA fallback 404 tradeoff. README simple-vs-advanced table updated for the new defaults and flags

### Fixed

- `npx agent-ready go-live` now also updates `agent-ready.config.json` (or the legacy `llms-txt.config.json`) to `publish: "live"`, so a later `npx agent-ready sync` no longer silently flips the site back to draft
- INTEGRATION.md wrapper snippet was stale: its inlined `getCacheStatus` validator was missing every widget field added since 0.2.x and its page validator was missing `section`. Both now match the component, and the cache status validator is imported from the package
- README widget display modes table now documents `widgetStatusVisible`, `widgetShowFiles`, `widgetShowAppName`, `widgetShowDescription`, and `widgetShowMeta`, and corrects the `widgetShowMarkdownTab` default: unset, it follows `markdownSiteEnabled`, so the MARKDOWN tab is hidden in simple mode

## [0.3.0] - 2026-08-15

### Added

- Simple mode first: zero-config install now serves `/llms.txt`, `/agents.md`, and the per-site markdown file immediately after `app.use(agentReady)` plus `registerRoutes`, with generated fallback content when no settings exist yet
- `publish` setting with values `live` and `draft`. New installs default to `live`. `publish: "draft"` returns 404 with a short body on public discovery routes while localhost preview keeps working. `npx agent-ready go-live` flips a draft install live
- Per-site markdown route at `/{site-name}.md`. The slug comes from `appName` (lowercase, hyphenated), an explicit `siteMdPath` option on `registerRoutes`, or the `AGENT_READY_SITE_SLUG` env var, with `/site.md` as the fallback. Served with ETag/304 caching and a collision guard against existing routes. New `site.md` file type in the generation pipeline (`renderSiteMd`), schema, validators, and client types. `siteSlug` and `siteMdPath` are exposed on `/llms-status`
- Always-on RFC 8288 discovery header: every component-served response now includes `Link: </llms.txt>; rel="describedby"; type="text/markdown"`, appended to richer discovery links when `discoveryHeaders` is enabled, including on 304 responses and markdown site pages
- `Accept: text/markdown` content negotiation wired into `/markdown` and `/markdown/*`: agents asking for markdown get raw markdown, browsers get the HTML twin, and every negotiated response sets `Vary: Accept`
- `AgentLinks` footer component for React (`@waynesutton/agent-ready/react`) and Svelte (`@waynesutton/agent-ready/svelte`): two muted anchors for `llms.txt` and the per-site markdown file, optional `className`/`class` override, and automatic `<link rel="alternate" type="text/markdown">` head injection (deduped by href). Plain HTML snippet documented in the README
- Shared browser-safe head-injection util (`injectMarkdownAlternateLink`); the React and Svelte widgets inject the alternate link tag on mount (`injectAlternateLink` prop, default on)
- Collapsible Advanced section on the widget MACHINE tab linking to the README advanced docs, in both React and Svelte widgets
- One-time console nudge after the first codegen on dev deployments, pointing at the live files, the alternate link tag, and the advanced docs; recorded via `nudgePrintedAt` on the settings singleton
- PRD: `prds/simple-mode-first-migration.md`

### Changed

- Publishing is live by default. New installs no longer require `npx agent-ready go-live`; the command remains for draft installs
- Draft gating returns 404 instead of 403 so unpublished sites do not advertise the component
- Setup wizard defaults: `publish` defaults to `live` with `draft` as an opt-in, and `fullTxtEnabled` defaults to `false` for new installs
- `npx agent-ready status` prints the publish state first with go-live guidance when in draft
- README rewritten around the zero-config quick start, copy-this-prompt block, simple vs advanced table, `AgentLinks`, and the `#advanced` anchor. INTEGRATION.md, SETUP.md, docs/install.md, docs/install.html, and the npm `description` updated to match
- Demos: React, Svelte, and Expo configs switched to `publish: "live"`; React and Svelte demos add the alternate `<link>` tag, the `AgentLinks` footer, and pass `siteMdPath` to `registerRoutes`

### Deprecated

- `testMode` is now a deprecated alias for `publish`. `testMode: true` maps to `publish: "draft"` and existing configs keep working; the two fields stay in sync on patch and sync operations

### Fixed

- `generationInProgress` no longer sticks at `true` after a regeneration where file content did not change. `writeGenerationResult` now resets rows marked `generating` by `invalidateCache` back to `current` when the content hash matches
- Demo wrapper `getCacheStatus` validators updated to accept the new `publish` and `siteSlug` fields so the wrapper query does not throw after upgrading

### Added

- Markdown site viewer with per-page twins for SEO, AEO, and GEO. New `pageTwins` table stores cached markdown and HTML per published page. `registerMarkdownRoutes(http, component, options)` (alias `mountMarkdownNegotiation`) serves `/markdown` (human HTML index), `/markdown/*` (per-page HTML with Accept negotiation for agents), and `/llms-markdown-index` (JSON for the widget). Settings: `markdownSiteEnabled` and `widgetShowMarkdownTab` (default on when `markdownNegotiation` is true). Generation writes `markdown-site.html` and page twins when both flags are enabled. Raw markdown responses include `Content-Signal`, `x-markdown-tokens`, and `X-Robots-Tag: noindex`; HTML pages are indexable with canonical URLs, JSON-LD, and meta tags. `llms.txt`, `sitemap.xml`, `robots.txt`, `/.well-known/agent-skills`, and discovery `Link` headers now reference the markdown site
- MARKDOWN tab on React and Svelte widgets. Lists the markdown site link and up to six page links from `/llms-markdown-index`. New hook `useAgentReadyMarkdownIndex`. Props: `showMarkdownTab`, `markdownIndexPath`, `markdownSitePath`. Tab order: HUMAN, MACHINE, MARKDOWN, SCORE. Panel widens to 320px on desktop when MARKDOWN is active
- Expo widget export at `@waynesutton/agent-ready/expo` with HUMAN, MACHINE, and MARKDOWN tabs for React Native apps. New `example-expo` demo reads `EXPO_PUBLIC_AGENT_READY_URL` and opens the same Convex `.site` discovery and markdown routes as the web demos
- Demo wiring: React and Svelte call `registerMarkdownRoutes` before static SPA fallback. React, Svelte, and Expo configs include `markdownSiteEnabled`, `widgetShowMarkdownTab`, and sample `fullContent` on pages
- CLI: `npx agent-ready setup` asks separately about the `/markdown` site and the MARKDOWN widget tab, so pages can stay live while the tab is hidden. `npx agent-ready links` prints `/markdown` and `/llms-markdown-index`. `npx agent-ready agent-ready` enables the markdown site while preserving an existing hidden MARKDOWN tab. `npx agent-ready scan --strict` checks `/markdown`, `/llms-markdown-index`, and one real page markdown response with `noindex`
- PRD: `prds/markdown-tab-and-site-viewer.md`
- `.codex/skills/`: Single deduplicated Codex skills bundle (46 skills) consolidated from `.agents/skills`, `.claude/skills`, and `.cursor/skills`, plus `agent-ready-interface` pointing at project design context in `references/system.md`
- Opt-in RSS 2.0 feed at `/feed.xml` generated from the pages table. Enable with `rssEnabled: true` in `agent-ready.config.json` or run `npx agent-ready agent-ready` to enable everything. The feed includes all published pages with XML-escaped titles, descriptions, and permanent links. Route is skippable via `skipRoutes: ["/feed.xml"]` for apps that already serve their own feed. Threaded through component schema, validators, generation pipeline (`renderRssFeed`), cached file storage, HTTP route registration, `getCacheStatus` query, `applySyncConfig` mutation, `AgentReadySettings` and `AgentReadyStatus` client types, React and Svelte widget MACHINE tabs, both example configs and wrapper validators, CLI setup wizard, `npx agent-ready agent-ready` one-command enable, `npx agent-ready scan` endpoint check, `npx agent-ready links` URL output, and readiness self-score (bonus check, zero points so existing scores are unchanged). Discovery `Link` headers include the feed URL when both `discoveryHeaders` and `rssEnabled` are true. Content type is `application/rss+xml`
- PRD: `prds/rss-feed.md`
- Updated INTEGRATION.md, docs/install.md, docs/install.html, and SETUP.md with `/feed.xml` route references, `rssEnabled` in the readiness feature table, and `skipRoutes` examples. Updated Svelte settings page fileType union to include `rss.xml`
- Hidden widget mode for React and Svelte widgets. New optional `widgetVisible` config setting and `visible` prop let apps hide the entire widget while generated files and HTTP routes keep working. Existing configs omit the field and keep the widget visible. Threaded through component schema, validators, `getCacheStatus`, sync, client types, setup scaffolding, React widget, Svelte widget, demo wrappers, and demo configs. CLI setup now asks whether the widget should be `visible` or `hidden` before showing install guidance, skips widget install prompts when hidden, and preserves existing hidden configs on rerun
- `npx agent-ready links [--url <url>]` prints copyable URLs for `llms.txt`, `agents.md`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `/.well-known/agent-skills`, `/llms-readiness`, `/llms-status`, plus ChatGPT, Claude, and Perplexity links. It reads `agent-ready.config.json` by default and works whether the widget is visible or hidden
- PRD: `prds/widget-hidden-links-cli.md`
- Desktop collapse for the React and Svelte `AgentReadyWidget`, on by default. New `desktopCollapse` prop and `widgetDesktopCollapse` setting render the same Phosphor caret toggle on desktop viewports without changing widget width or insets. The widget starts collapsed (using `defaultMobileCollapsed`) and tabs become compact so HUMAN/MACHINE/SCORE plus the toggle fit inside 280px. Resolution order: prop, then config, then `true`. Pass `desktopCollapse={false}` (React) or `desktopCollapse={false}` (Svelte) or set `widgetDesktopCollapse: false` in `agent-ready.config.json` to keep the widget always expanded on desktop. Threaded through component schema, validators, `getCacheStatus` (defaults to `true`), `applySyncConfig`, `_generated/component.ts`, `AgentReadySettings`, `AgentReadyStatus`, both demo `agent-ready.config.json` files, and both demo `cacheStatusValidator` wrappers. CLI `npx agent-ready setup` prompts "Allow widget collapse on desktop?" with a `true` default and preserves existing values
- Mobile collapsed presentation for the React and Svelte `AgentReadyWidget`. Below `mobileBreakpoint` (default `480px`) the widget renders a compact tab strip with HUMAN, MACHINE, and optional SCORE labels plus an inline Phosphor caret toggle. Tabs still switch when tapped; the caret expands or collapses the active panel. Defaults to collapsed. Three new optional props on both widgets: `mobileCollapse` (default `true`), `mobileBreakpoint` (default `480`), `defaultMobileCollapsed` (default `true`). Width clamps to `min(280px, calc(100vw - 24px))` on mobile and edge insets shrink from 24px to 12px so the widget never overflows narrow screens. Existing installs pick up the new default behavior with no code changes
- `publicAppUrl` prop on the React and Svelte widgets for the public production domain shown in copy links and AI chat prompts. `appUrl` continues to act as the endpoint base used to fetch `/llms-status` and `/llms-readiness`. When `publicAppUrl` is omitted, the widget falls back to `status.appUrl`, then `window.location.origin`, then `appUrl`. Added a development-only console warning when the visible URL points at a Convex `.site` URL while the browser is on a custom production domain
- `normalizeBaseUrl` and `sameHost` helpers in `src/component/lib.ts` so widgets, renderers, and CLI commands produce identical link prefixes
- Expanded `SkippableRoute` and `registerRoutes` `skipRoutes` to cover `/llms.txt`, `/agents.md`, and `/llms-full.txt` for apps that already serve those files from their static host or own router
- Setup wizard improvements in `cli/commands/setup.mjs`: detection of `public/llms.txt`, `public/agents.md`, `public/llms-full.txt`, and `public/sitemap.xml` files in addition to the existing `public/robots.txt` and `convex/http.ts` checks; a custom production domain prompt when the deployment URL is `*.convex.site` with Vite `VITE_SITE_URL` guidance; default `fullTxtEnabled: true` for new configs; and a thin-content warning that points users to `npx agent-ready import` and `npx agent-ready discover` when the config has no pages or endpoints
- Two new readiness checks (`llms_txt_has_content`, `agents_md_has_content`) that warn when generated `llms.txt` or `agents.md` is suspiciously small (under 400 bytes), so empty configs no longer look "ready"
- `npx agent-ready import [--from <path>] [--overwrite] [--dry-run]` for migrating an existing `llms.txt` into `agent-ready.config.json`. Parses H1 title, blockquote description, H2 sections, and `- [Title](path): description` bullets. Skips discovery files that the component generates
- `npx agent-ready discover` for printing a local discovery report by scanning `convex/http.ts`, `public/llms.txt`, `public/agents.md`, and `public/llms-full.txt`. Suggests `import` next steps without auto-writing config
- Optional `section?: string` field on pages, threaded through `AgentReadyPage`, the page validator, schema, sync payload, both example wrapper validators, and `renderLlmsTxt` so pages render under grouped H2 sections in `llms.txt` (default heading `Pages`, optional pages still under `Optional`)
- `INTEGRATION.md` now documents route ownership for Convex HTTP routes only, Convex static hosting, Vercel/Netlify/Cloudflare frontend hosting, custom domains, and existing `public/llms.txt` migration scenarios. Added a dedicated dynamic content sync section with copyable wrappers for blogs, wikis, and content pipelines that call the component `upsertPage`, `deletePage`, and `archivePage` mutations
- PRD: `prds/agent-ready-integration-feedback.md`
- `skipRoutes` option on `registerRoutes()` lets apps skip registration of `/robots.txt`, `/sitemap.xml`, or `/.well-known/agent-skills` when the host app already owns those paths. Prevents the fatal "Path already in use" error at deploy time
- `SkippableRoute` type export from `@waynesutton/agent-ready` for type-safe `skipRoutes` arrays
- CLI setup wizard route conflict detection. `npx agent-ready setup` now scans `convex/http.ts` for existing `/sitemap.xml` and `/robots.txt` routes and checks for `public/robots.txt` (common with `@convex-dev/self-hosting`). When conflicts are found, the wizard prompts: keep existing route (agent-ready skips it), replace with agent-ready's route, or skip for now. The chosen flags are written to `agent-ready.config.json` and the next steps output prints the matching `skipRoutes` snippet

### Changed

- React and Svelte demo `dev` scripts now use the current Convex CLI `--run-sh` flag instead of the removed `--start` flag. Setup now runs after Convex pushes the updated component functions, so new settings like `markdownSiteEnabled` validate correctly on first local run
- Made `README.md` the canonical app developer install guide. `docs/install.md` and `docs/install.html` now point readers back to the README install section. Added internal README-style `/docs` pages to both demo apps, pointed demo `Docs` links to those pages, and kept `https://diffs.com/docs` as a Diffs by Pierre reference resource
- Expanded GitHub OAuth setup docs across `SETUP.md`, `docs/install.md`, `docs/install.html`, `INTEGRATION.md`, and `README.md` with the production login recovery checklist: Convex callback URL, `SITE_URL`, production auth secrets, root auth initialization, `state.isAuthenticated`, `ADMIN_EMAILS`, and wrapper validator parity
- Simplified SETUP.md production deploy instructions for both React and Svelte demos. Replaced `cat > <<'EOF'` heredoc with plain "create a file" instructions. Replaced `export` shell variables in the Svelte section with a persistent `.env.production.local` file. Added one sentence explaining why the file matters. Written for new developers who may not know shell tricks
- Clarified docs, demos, and configs to make it clear this is a Convex component with React and Svelte widgets. Updated opening lines, hero text, section headings, and descriptions across README.md, SETUP.md, INTEGRATION.md, CONTRIBUTING.md, docs/install.md, docs/install.html, files.md, and package.json. Both demo app landing pages, configs, and HTML titles updated to say "Convex component" and name the widget framework. No functional changes
- Removed all PostHog references from the codebase. Renamed `prds/setup-and-demo-posthog-redesign.md` to `prds/setup-and-demo-redesign.md`. Updated all file path references in changelog, task.md, and files.md. Replaced "PostHog-inspired" with neutral terms in PRD content, changelog entries, and task entries
- Reduced install.html h1 font size from `clamp(2rem, 5vw, 3.5rem)` to `clamp(1.75rem, 4vw, 2.5rem)` so the package name fits on one line

- Switched both demo apps from password and anonymous auth to GitHub OAuth via `@robelest/convex-auth`. `convex/auth.ts` now configures the `github` provider with `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` environment variables. The React `AuthGate` and Svelte `AuthGate.svelte` now render a single "Sign in with GitHub" button instead of the email and password form
- Updated `SETUP.md` with step by step GitHub OAuth app creation, callback URL configuration, and environment variable setup for both demo apps
- Updated `INTEGRATION.md` securing admin routes section to show the GitHub provider instead of the password provider, with callback URL and env var instructions
- Updated `README.md` demo apps section to document the GitHub OAuth prerequisite
- `createAuth` import in both demo `convex/auth.ts` files changed from `@robelest/convex-auth/component` to `@robelest/convex-auth/server` to resolve a TypeScript export diagnostic in `0.0.4-preview.30`

### Added

- Block-style ASCII `agent-ready` logo for CLI setup and help output
- Setup wizard widget install guidance. `npx agent-ready setup` now asks whether to show widget code, asks for React or Svelte, asks where the widget will be mounted with root layout as the recommended default, and prints copyable code for the selected framework
- Clearer widget install output in `npx agent-ready setup`. Mount prompt now reads "Where will you add the widget? (root recommended)". The printed guide names the exact destination file per framework (`src/App.tsx` for React, `src/routes/+layout.svelte` for Svelte), shows a `File: <path>` header above the snippet, and suggests copying the whole block into Cursor, Claude, or any AI agent so it can wire the widget into the root layout automatically
- Synced `README.md` and `docs/install.md` wizard prompt descriptions to mention the new optional widget install guide step
- PRD: `prds/setup-widget-prompt.md`
- PRD: `prds/svelte-check-cleanup.md`
- PRD: `prds/github-oauth-demo-app-recovery.md`
- Widget display mode options: `widgetCleanMode`, `widgetShowHumanTab`, `widgetShowMachineTab`, `widgetShowChatLinks`, `widgetShowChatGPT`, `widgetShowClaude`, `widgetShowPerplexity`. Configurable via `agent-ready.config.json` settings or as direct widget props (React and Svelte). Clean mode strips the app name and description while keeping all functionality. Individual chat link toggles let consumers hide any combination of ChatGPT, Claude, and Perplexity links. Tab toggles let consumers show only HUMAN, only MACHINE, or both. Widget hides entirely when all tabs are disabled
- PRD: `prds/widget-display-modes.md`
- `@robelest/convex-auth` integration in both demo apps with GitHub OAuth. Admin mutations (`publishPage`, `draftPage`, `archivePage`, `rollbackCache`, `regenerateAll`) are gated behind `authMutation`/`authAction` from `convex-helpers` custom functions. Settings and Analytics routes require sign-in via `AuthGate` component
- `convex/auth.ts`, `convex/functions.ts`, and `src/auth.tsx` files in the React demo for auth wiring and GitHub sign-in UI
- `convex/auth.ts` and `src/lib/AuthGate.svelte` in the Svelte demo for auth wiring and GitHub sign-in UI
- `internalCleanupOldRequests` internalMutation in `src/component/analytics.ts` for server-to-server use by the cron worker
- PRD: `prds/security-hardening.md`

### Fixed

- Fixed React and Svelte demo local dev auth bundling by moving both demos to `@robelest/convex-auth@0.0.4-preview.37`, restoring the lightweight `convex/auth/core.ts` context files, and mounting HTTP routes from `auth.http()` before agent-ready and static hosting routes. This resolves `Could not resolve "@robelest/convex-auth/core"`, missing GitHub provider files, and `auth.http.add is not a function` during `npm run dev`
- Fixed Svelte demo `npm run check` failures. Regenerated package component bindings and Svelte demo Convex bindings, updated `AuthGate.svelte` to use `state.isAuthenticated`, changed analytics and settings pages to read `convex-svelte` query result objects through `.data`, moved Svelte `{@const}` declarations to valid positions, and narrowed rollback file type arguments
- Fixed React demo GitHub OAuth gate so successful sign-ins unlock `/settings` and `/analytics`. The auth client now initializes at the app root to catch OAuth callback codes, and `AuthGate` checks `state.isAuthenticated` from `@robelest/convex-auth` instead of a nonexistent `state.userId`
- Fixed demo wrapper `getCacheStatus` return validators for React and Svelte so newer widget display mode fields from the component no longer trigger Convex `ReturnsValidationError`
- `src/component/cronWorker.ts` now uses `internal.analytics.internalCleanupOldRequests` instead of `api.analytics.cleanupOldRequests` for server-to-server calls (security: never use `api.*` for internal calls)
- Removed orphaned `src/component/analyticsInternal.ts` that was not recognized by Convex codegen. Its logic now lives in `analytics.ts` where the generated API already picks it up
- Bounded all analytics `.collect()` calls with `.take(10000)` or `.take(1000)` to prevent unbounded table scans in `getSummary`, `getTimeSeries`, `recordRequest`, `cleanupOldRequests`, and `cleanupOrphanedCacheEntries`
- Fixed `effect` / `ServiceMap` bundling error in the React demo by upgrading `@robelest/convex-auth` from `0.0.4-preview.27` to `0.0.4-preview.30`. The newer version dropped the `effect` dependency entirely, resolving the missing `ServiceMap` export in `effect@4.0.0-beta.57`

### Changed

- Set `permissiveMode: false` in both `example-react/agent-ready.config.json` and `example-svelte/agent-ready.config.json` to enforce production guards
- Set `testMode: true` in `example-react/agent-ready.config.json` to take the live demo offline until auth is deployed
- React demo `convex/convex.config.ts` now registers the `@robelest/convex-auth` component alongside existing components
- React demo `convex/http.ts` now wires `auth.http.add(http)` for OAuth callback and JWKS routes
- React demo `convex/agentReady/content.ts` admin mutations switched from plain `mutation`/`action` to `authMutation`/`authAction`. Read-only queries (`getCacheStatus`, `listPages`) remain public
- React demo `src/App.tsx` wraps `/settings` and `/analytics` routes in `<AuthGate>` requiring sign-in
- Upgraded `@robelest/convex-auth` from `^0.0.4-preview.27` to `^0.0.4-preview.30` in `example-react/package.json`

- `widgetShowScoreTab` config option to independently control SCORE tab visibility in the widget. Defaults to `false`. The readiness endpoint can stay enabled for CI scanning while the tab stays hidden. Added to validators, component schema, status query, sync handler, client types, React widget, Svelte widget, and both example configs
- Widget preview screenshots in README (`public/human-agent-ready-demo.png`, `public/agent-agent-ready-demo.png`) using absolute GitHub raw URLs so they render on both GitHub and npm

### Fixed

- Build error in `src/client/index.ts` where `"agent-skills.json"` (file type) was passed directly as a route name. Added a lookup table mapping file types to route names
- Build error in `src/component/generation.ts` where `versions[i]` had `string | undefined` type due to array access. Added non-null assertion since the arrays are always the same length
- Missing `dist/` folder preventing the example app from picking up updated validators, causing `ArgumentValidationError: Object contains extra field agentSkillsEnabled` on sync

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
- Redesign of both demo apps: cream background (`#eeefe9`), hard black borders, window chrome with title bar and macOS-style dot controls, file-style sidebar with primary nav + live files section, tab strip with orange active underline (`#f54e00`), orange primary CTAs with drop shadow, metric cards on analytics, pill-style status badges, and page footer
- Shared React demo components under `example-react/src/components/`: `Window.tsx`, `Sidebar.tsx`, `Tabs.tsx`, `Button.tsx`
- Metric cards on the analytics page showing total requests plus top agent and top file for the last 30 days
- PRD `prds/setup-and-demo-redesign.md` covering the setup guide and demo redesign
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
- `example-react/src/App.tsx`, `Settings.tsx`, `Analytics.tsx`, `index.css`, `index.html` rewritten to use the window-chrome layout and cream palette
- `example-svelte/src/app.css`, `app.html`, `routes/+layout.svelte`, `routes/+page.svelte`, `routes/settings/+page.svelte`, `routes/analytics/+page.svelte` rewritten to mirror the React demo

### Removed

- `src/component/http.ts` legacy factory helpers. The real HTTP mounting path is `registerRoutes` in `src/client/index.ts`, the removed file was an unused alternate surface that could confuse a component review
