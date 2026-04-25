Created: 2026-04-25 23:39 UTC
Last Updated: 2026-04-25 23:39 UTC
Status: Done

# Setup docs split

## Problem

`SETUP.md` mixes package author release steps with consumer install steps. That makes the author path longer than needed and hides the integration guide a Convex user needs after installing `@waynesutton/agent-ready`.

The author section also contains an incorrect clone directory command: it clones `agent-ready-component` but runs `cd llms-txt`.

## Proposed solution

Keep `SETUP.md` focused on the package author workflow: GitHub, npm, demo deploys, live file checks, and release checklist.

Move consumer install instructions into `docs/install.md` and `docs/install.html`. Link those docs from `README.md` and both demo apps so a Convex user can quickly find the install path.

Fix package publishing metadata so the npm tarball includes the CLI files it exposes through `bin`.

## Files to change

- `SETUP.md`
- `README.md`
- `package.json`
- `docs/install.md`
- `docs/install.html`
- `example-react/src/App.tsx`
- `example-svelte/src/routes/+layout.svelte`
- `task.md`
- `changelog.md`
- `files.md`

## Edge cases

- Do not remove author release checks from `SETUP.md`.
- Keep the consumer setup copy accurate for React and Svelte.
- Keep npm package contents aligned with the `bin` field.
- Avoid changing demo visual design beyond adding install doc links.

## Verification steps

- Run `npm run typecheck`.
- Run `npm pack --dry-run` and confirm the CLI plus docs are included.
- Check lints for edited demo files.

## Task completion log

- Completed author-only `SETUP.md` rewrite.
- Added consumer install docs in Markdown and HTML.
- Linked install docs from both demo apps.
- Updated package publish metadata so the CLI and docs are included in npm.
- Verified `npm pack --dry-run` includes `cli/`, `docs/`, and `SETUP.md`.
- `npm run typecheck` remains blocked by existing missing Convex generated modules.
- Demo checks remain blocked by missing local workspace dependencies.
