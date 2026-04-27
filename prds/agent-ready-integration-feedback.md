# Agent ready integration feedback

Created: 2026-04-26 18:30 UTC
Last Updated: 2026-04-26 18:30 UTC
Status: In Progress

## Problem

Two pieces of integration feedback came in from the markdown sync app, both pointing at developer experience traps that are easy to miss but hard to debug once the app ships:

1. The component generates `llms.txt`, `agents.md`, and `llms-full.txt`, but apps that already have rich discovery files end up with thinner output. The config schema does not group content, the wizard never seeds content, and the widget can quietly point at the wrong production URL.
2. The widget's visible URLs come from a single `appUrl` prop. Vite apps that read `VITE_CONVEX_SITE_URL` from `.env.local` accidentally bake a dev Convex deployment URL into production bundles. The generated files use the right custom domain. The widget does not.

These were filed as `prds/agent-ready-improvements.md` and `prds/agent-ready-widget-url-feedback.md` in the host app.

## Root cause

- The widget conflates two URL jobs: the endpoint base used to fetch `/llms-status` and `/llms-readiness`, and the public app URL shown to humans and AI agents.
- `cli/commands/setup.mjs` only seeds `appName`, `appUrl`, and `description`. Pages and endpoints stay empty unless the user knows to populate them by hand.
- There is no migration path from an existing `public/llms.txt` into the component config.
- The route registration silently overrides existing files served under `/llms.txt`, `/agents.md`, or `/llms-full.txt`.
- The schema flattens wiki sections, knowledge bases, and API groups into one `pages` array.
- `fullTxtEnabled` defaults to `false`, so the most useful discovery file is off by default.

## Proposed solution

Stage the work so we keep the package safe to upgrade for existing apps. Treat Convex static hosting as one of several frontend hosting options. Do not assume `public/` files are served by Convex.

### Compatibility guardrails

- Keep `appUrl` working as the legacy endpoint base in the React and Svelte widgets.
- Keep `registerRoutes(http, components.agentReady)` calls working without code changes.
- All new config fields are optional with safe fallbacks.
- All new CLI commands are additive.

### URL split (P0)

- Add a shared `normalizeBaseUrl()` helper for trimming trailing slashes consistently.
- Add `publicAppUrl` prop to `AgentReadyWidget` (React and Svelte). Visible URL precedence: `publicAppUrl` prop, then `status.appUrl` from `/llms-status`, then `window.location.origin`, then legacy `appUrl`. Endpoint URL precedence stays `appUrl`, then `window.location.origin`.
- Dev only console warning when visible URL host clearly differs from browser origin host (production builds stay quiet).
- Setup wizard prompt: when the entered `appUrl` looks like `*.convex.site`, ask "Will users access this app through a custom production domain?" and offer to store the custom domain instead, plus print Vite guidance for `VITE_SITE_URL`.

### Route conflict DX

- Detect `public/llms.txt`, `public/agents.md`, and `public/llms-full.txt` in setup. Label as "local static files detected" instead of assuming self hosting.
- Expand `SkippableRoute` to include `/llms.txt`, `/agents.md`, and `/llms-full.txt` so apps with existing static files can opt out cleanly.
- Setup wizard offers keep, replace, or skip for each detected core file.

### Setup defaults

- `fullTxtEnabled` defaults to `true` for new configs.
- After setup writes the config, if `pages` and `endpoints` are both empty, print next-step suggestions: `npx agent-ready import --from public/llms.txt` or `npx agent-ready discover`.
- Readiness scoring stays as is for backward compatibility, but a "thin content" warning prints to the wizard output when the only seeded content is app name plus description.

### Migration path: import and discover

- `npx agent-ready import --from <path>`: parse a Markdown llms.txt-shaped file. Pull pages out of `## Pages`, `## Optional`, and any `## <Section>` headers. Pull endpoints out of `## API` or `## Endpoints` blocks when present. Merge into existing `agent-ready.config.json`.
- `npx agent-ready discover`: best effort scan of `convex/http.ts` for `http.route(...)` calls and existing `public/llms.txt` content. Suggest endpoints and pages without overwriting anything that exists.
- Both commands are local and file based. They never query the Convex deployment for arbitrary tables.

### Section grouping

- Add optional `section?: string` field to `AgentReadyPage`, the validators, the schema, and the sync payload.
- Generation groups pages by section in `llms.txt`. Pages without a section land under `## Pages`. Optional pages still land under `## Optional`.
- Endpoints keep using the existing `group?: string`.

### Dynamic content sync

- No new backend surface. Document the pattern: define an internal mutation in the host app that calls `ctx.runAction(components.agentReady.content.sync, { config })` after a publish event.
- Show one React and one Svelte example.

### Docs and CLI updates

- Update `README.md` install, widget props, and route ownership sections.
- Update `INTEGRATION.md` with public URL setup for Vite, custom domains, non Convex frontends, and dynamic sync examples.
- Update demo app instructions and `agent-ready.config.json` files where the recommended widget URL pattern changes.
- Update CLI help text in `cli/index.mjs` for new commands and flags.

## Files to change

Component:

- `src/component/lib.ts`: add `normalizeBaseUrl()`.
- `src/component/schema.ts`: add optional `section` to `pages`.
- `src/component/validators.ts`: add `section` to page validators and sync payload.
- `src/component/content.ts`: pass `section` through `upsertPage`, `loadBundle`, and `getCacheStatus` (no return shape change).
- `src/component/contentInternal.ts`: pass `section` through `applySyncConfig`.
- `src/component/generation.ts`: render sections in `renderLlmsTxt`.

Client:

- `src/client/types.ts`: add `publicAppUrl` to widget props, `section` to `AgentReadyPage`, expand `SkippableRoute` to include `/llms.txt`, `/agents.md`, `/llms-full.txt`.
- `src/client/index.ts`: honor expanded `skipRoutes` for the three core files. Use `normalizeBaseUrl()` consistently.

Widgets:

- `src/react/AgentReadyWidget.tsx`: split URL intent, add `publicAppUrl`, dev only warning, ChatGPT/Claude/Perplexity prompts use visible URL.
- `src/svelte/AgentReadyWidget.svelte`: same split.

CLI:

- `cli/commands/setup.mjs`: detect `public/llms.txt`, `public/agents.md`, `public/llms-full.txt`. Convex `.site` URL prompt. Default `fullTxtEnabled` to `true` for new configs. Print next-step suggestions when content is empty.
- `cli/commands/import.mjs`: new file.
- `cli/commands/discover.mjs`: new file.
- `cli/index.mjs`: register `import` and `discover`. Update help.

Docs:

- `README.md`, `INTEGRATION.md`, `SETUP.md`, `docs/install.md`, demo app docs.
- `task.md`, `changelog.md`, `files.md` after the work lands.

## Edge cases

- Existing apps that pass only `appUrl` keep working without any changes.
- Apps that already have `/llms.txt` or `/agents.md` registered in `convex/http.ts` keep working when they pass `skipRoutes`.
- Apps that store `appUrl` as a `*.convex.site` URL keep working. The custom domain prompt is opt in.
- Vite apps that do not set `VITE_SITE_URL` fall back to `window.location.origin` in production. They never silently keep the dev URL.
- Imported llms.txt files with non standard headers fall back to a flat list under `## Pages`.

## Verification steps

1. `npm run typecheck` clean.
2. `npm run build` clean.
3. `node --check` on every changed `cli/**/*.mjs`.
4. `npx convex codegen --component-dir ./src/component` succeeds.
5. Demo apps still build with current configs.
6. Widget renders correct visible URLs when `publicAppUrl` is omitted, set, or differs from `appUrl`.
7. Production bundle of the React demo with `.env.local` set to a dev URL and `.env.production.local` set to `VITE_SITE_URL=...` does not contain the dev deployment name in `dist`.
8. `npx agent-ready import --from <fixture>` produces a populated `agent-ready.config.json` without overwriting unrelated fields.

## Task completion log

- [x] PRD drafted
- [ ] Compatibility guardrails verified
- [ ] URL split shipped
- [ ] Route conflict DX shipped
- [ ] Setup defaults shipped
- [ ] Import and discover commands shipped
- [ ] Section grouping shipped
- [ ] Dynamic sync docs shipped
- [ ] Docs and CLI guidance updated
- [ ] Project docs synced
