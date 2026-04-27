---
name: agent ready feedback
overview: Adopt the best suggestions from the markdown blog integration feedback with a staged, developer friendly upgrade. The plan prioritizes correctness, migration safety, and clear setup flow for new developers, vibe coders, Convex users, and apps that already have rich discovery files.
todos:
  - id: prd
    content: Create `prds/agent-ready-integration-feedback.md` with problem, root cause, proposed changes, edge cases, and verification steps
    status: completed
  - id: p0-url-conflicts
    content: Fix widget URL base resolution, separate endpoint URL from public URL, and expand route conflict handling for core discovery files
    status: completed
  - id: thin-content-defaults
    content: Improve full text defaults and warn when generated discovery content is too thin
    status: completed
  - id: import-discover-cli
    content: Add import and discover CLI commands for migrating existing discovery files into config
    status: completed
  - id: section-grouping
    content: Add optional page sections and render grouped `llms.txt` content
    status: completed
  - id: dynamic-sync-docs
    content: Document dynamic content sync examples for blog, wiki, and content pipeline apps
    status: completed
  - id: docs-demo-cli
    content: Update README, setup docs, integration docs, demo app instructions, and CLI help for changed flows
    status: completed
  - id: verify-docs
    content: Run checks and update `task.md`, `changelog.md`, and `files.md`
    status: completed
isProject: false
---

# Agent Ready Feedback Plan

## What I found

The feedback is valid, but a few items are already partly implemented:

- `src/component/generation.ts` already renders generated page, sitemap, robots, and agent skills URLs from `settings.appUrl`.
- `src/component/content.ts` already returns `appUrl` from `/llms-status`.
- `cli/commands/setup.mjs` already detects `/robots.txt`, `/sitemap.xml`, and `public/robots.txt` conflicts, but it does not cover `public/llms.txt`, `public/agents.md`, or `public/llms-full.txt`.

The gaps worth fixing are domain normalization, widget URL intent, content import/discovery, richer grouping, clearer route conflict warnings, and safer defaults.

The newer widget feedback adds an important distinction: the widget has two URL jobs. It needs an endpoint base URL to fetch `/llms-status`, and it needs a public app URL for visible file links and AI chat prompts. Those are often the same URL, but not always. In Vite builds, `.env.local` can accidentally bake a dev Convex `.site` URL into production, so the plan needs guardrails for that.

## Recommended implementation

1. Create a PRD first at `prds/agent-ready-integration-feedback.md`, then add scoped tasks to `task.md`.

2. Add compatibility guardrails before feature work:

- Treat Convex static hosting as optional. The package must work for Vercel, Netlify, Cloudflare Pages, custom domains, plain Convex HTTP routes, and Convex static hosting.
- Preserve existing defaults and config shapes wherever possible. New fields should be optional and backward compatible.
- Do not assume `public/` files are served by Convex. Use them only for local migration/import detection when they exist.
- Keep `skipRoutes` additive. Existing `registerRoutes(http, components.agentReady)` installs must keep working.
- Keep the existing `appUrl` widget prop working as the legacy endpoint base URL. Do not silently break apps where the component routes live on `*.convex.site` while the frontend lives elsewhere.
- Add tests or fixtures around URL generation, route skipping, and config sync so core behavior does not regress.

3. Fix P0 URL and conflict DX:

- Add a shared `normalizeBaseUrl()` helper in `src/component/lib.ts` or `src/client/index.ts` and use it wherever URLs are rendered.
- Update React and Svelte widgets to split URL intent:
  - `appUrl` remains the legacy endpoint base used to fetch `/llms-status` and `/llms-readiness`.
  - Add an optional `publicAppUrl` prop for visible file links and AI chat prompts.
  - Visible URL precedence should be `publicAppUrl` prop, then `status.appUrl` from component settings, then `window.location.origin`, then legacy `appUrl`.
  - Endpoint URL precedence should remain `appUrl`, then `window.location.origin`.
- Add a development-only console warning when the visible URL and endpoint URL clearly disagree in a risky way, such as browser origin being a custom domain while visible links resolve to a different `*.convex.site` deployment.
- Add a setup wizard prompt for Convex `.site` URLs: ask whether users will access the app through a custom production domain. If yes, store that custom domain in `settings.appUrl` and print Vite guidance for `VITE_SITE_URL`.
- Expand setup conflict detection in `cli/commands/setup.mjs` to include `public/llms.txt`, `public/agents.md`, and `public/llms-full.txt` when present, but label this as “local static files detected” instead of assuming self hosting.
- Expand `skipRoutes` so users can intentionally keep existing core discovery files, not just robots, sitemap, and agent skills.
- Update `README.md` and `INTEGRATION.md` with route ownership guidance for common hosting setups: Convex HTTP routes only, Convex static hosting, Vercel/Netlify/Cloudflare frontend hosting, and custom domains.
- Document the recommended Vite pattern:
  - Use `VITE_SITE_URL` for the public production domain.
  - Use `VITE_CONVEX_SITE_URL` for local endpoint access when needed.
  - In production, fall back to `window.location.origin` only when no explicit public site URL is configured.

4. Make generated files less thin by default:

- Change new setup defaults so `fullTxtEnabled` is recommended and defaults to `true` for new configs.
- Add a setup warning when `pages` and `endpoints` are empty after setup, with next commands like `npx agent-ready import --from public/llms.txt` and `npx agent-ready discover`.
- Add readiness checks for “thin content” so `llms.txt` with only title and description warns instead of silently looking successful.

5. Add migration friendly content import and discovery:

- Add `cli/commands/import.mjs` for `npx agent-ready import --from public/llms.txt`.
- Add `cli/commands/discover.mjs` for local discovery from `convex/http.ts`, `public/llms.txt`, `public/agents.md`, and existing `agent-ready.config.json`.
- Keep v1 discovery local and file based. Avoid querying arbitrary host app tables automatically because Convex apps name content tables differently and auth rules vary.
- Register both commands in `cli/index.mjs` and document them in `README.md` and `INTEGRATION.md`.

6. Add lightweight grouping for wiki and knowledge base content:

- Add optional `section?: string` to `AgentReadyPage`, the page validator, schema, sync payload, and generated config shape.
- Render `llms.txt` pages grouped by section, with unsectioned pages under `Pages` and optional pages under `Optional`.
- Keep endpoint grouping as the existing `group?: string` field.
- Avoid a separate nested `sections` table for now. A flat optional field is easier for Convex users and safer for package upgrades.

7. Add sync helpers for dynamic apps:

- Add a documented app wrapper example that calls the existing component `sync` action after a blog/wiki publish pipeline changes content.
- Add a small convenience CLI path if useful: `npx agent-ready sync --config agent-ready.config.json` already exists, so the main improvement is examples, not a new backend surface.

8. Update docs, demo instructions, and CLI guidance:

- Update `README.md` when install, setup, widget props, public URL handling, route ownership, import, discover, or scan behavior changes.
- Update `INTEGRATION.md` with copyable examples for React, Svelte, Vite public URL setup, custom domains, non static hosting deployments, and dynamic content sync.
- Update `SETUP.md` only for author or demo release instructions that change, especially production env files and bundle checks.
- Update `docs/install.md` if the app developer install entry point needs to mention new commands or route ownership.
- Update React and Svelte demo app instructions and configs if the recommended widget URL pattern changes.
- Update CLI help in `cli/index.mjs` and command output for any new commands, flags, prompts, warnings, or examples.
- Add CLI examples for `setup`, `sync`, `scan`, `import`, and `discover` where those commands are part of the final implementation.
- Keep all docs clear for new developers: name the file to edit, show the exact command, and explain when a setting is for the public app domain versus the Convex endpoint domain.

9. Verify with package and demo checks:

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `node --check` on changed CLI files.
- Run `npx agent-ready import --from public/llms.txt --dry-run` against a sample fixture.
- Add a production bundle guard in demo verification: set `.env.local` to a dev Convex site URL, set `.env.production.local` or equivalent to a custom `VITE_SITE_URL`, build, and confirm the dev deployment name does not appear in `dist`.
- Verify widget machine links and ChatGPT, Claude, and Perplexity prompts use the public domain while status/readiness polling still works against the endpoint base.
- If Convex source changes, run `npx convex codegen --component-dir ./src/component` and `npx convex-doctor@latest`.

10. Finish docs sync:

- Move completed tasks in `task.md`.
- Add a Keep a Changelog entry in `changelog.md`.
- Update `files.md` for any new CLI commands or PRD files.

## What else to consider

- Add config validation before sync so bad URLs, duplicate paths, missing descriptions, and malformed endpoint methods fail with human friendly CLI messages.
- Add path collision reporting for duplicate pages and endpoints before generation.
- Add a “migration mode” prompt in setup for apps that already have `public/llms.txt`.
- Add fixtures for rich `llms.txt` imports so future changes do not regress the markdown blog use case.
- Add `npx agent-ready scan` URL mismatch checks. Compare scanned URL, `/llms-status` `appUrl`, generated `llms.txt` links, and visible widget guidance when detectable. Warn when they point to different public origins.
- Keep automatic database discovery as a later feature. The safe first version should produce editable config from local files, then let app authors wire their own content sync from their real tables.
