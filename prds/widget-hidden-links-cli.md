# Hidden widget and links CLI

Created: 2026-04-27 18:40 UTC
Last Updated: 2026-04-27 18:58 UTC
Status: Done

## Problem

Apps may want Agent Ready to generate and serve discovery files without showing the frontend widget. The current config lets users hide specific widget parts or all tabs, but there is no clear single option for "generate files, hide the widget." Users also need a CLI command that prints the discovery URLs so they can copy them when the widget is hidden.

## Root cause

File generation and HTTP routes already run independently from the widget, but the public widget settings do not include a top-level visibility flag. The setup wizard also treats widget installation as a follow-up prompt instead of first asking whether the widget should be visible.

## Proposed solution

Add an optional `widgetVisible` setting that defaults to visible when omitted. Thread it through component schema, validators, status payload, client types, React widget, Svelte widget, demo wrappers, and setup defaults. The widget should render nothing when `widgetVisible` is `false`, while routes and generation remain unchanged.

Add `npx agent-ready links` to print copyable discovery URLs from `agent-ready.config.json` or `--url`. It should work whether the widget is visible or hidden.

## Files to change

- `src/client/types.ts`
- `src/component/schema.ts`
- `src/component/validators.ts`
- `src/component/content.ts`
- `src/component/contentInternal.ts`
- `src/react/AgentReadyWidget.tsx`
- `src/svelte/AgentReadyWidget.svelte`
- `cli/commands/setup.mjs`
- `cli/commands/links.mjs`
- `cli/index.mjs`
- Example app config and wrapper files
- `README.md`, `INTEGRATION.md`, `docs/install.md`, `files.md`, `task.md`, `changelog.md`

## Edge cases

- Existing configs omit `widgetVisible` and must keep showing the widget.
- Hidden widgets must not disable `/llms.txt`, `/agents.md`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml`, `/.well-known/agent-skills`, `/llms-readiness`, or `/llms-status`.
- Setup should skip widget install guidance when the user chooses hidden.
- `links` should fail clearly if no URL is passed and no config exists.
- `links` should trim trailing slashes and support `--config`.

## Verification steps

- `node --check cli/index.mjs cli/commands/setup.mjs cli/commands/links.mjs`
- `npm run typecheck`
- `npm run build`
- `npm run check --workspace example-svelte`
- Read lints for edited files

## Task completion log

- 2026-04-27 18:40 UTC: PRD created.
- 2026-04-27 18:58 UTC: Implemented optional `widgetVisible`, setup wizard visibility choice, `npx agent-ready links`, docs, example configs, and wrapper updates. Verified with CLI syntax checks, component codegen, typecheck, build, Svelte check, convex-doctor, links command smoke test, and lints.
