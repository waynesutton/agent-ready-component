Created: 2026-04-26 23:19 UTC
Last Updated: 2026-04-26 23:19 UTC
Status: Done

# Setup widget prompt

## Problem

The setup wizard currently tells users to add `<AgentReadyWidget />` after setup, but it does not help a new developer decide where it belongs or what code to paste.

## Root cause

`cli/commands/setup.mjs` writes config, scaffolds Convex wrappers, syncs, and prints next steps. The widget install step is only a one-line reminder, so users still need to open docs to find the React or Svelte snippet.

## Proposed solution

Add an optional yes/no prompt to the setup wizard that asks whether to show widget install code. If yes, ask for framework and mount location, defaulting to the app root layout.

The CLI should print copyable code and explain why root layout is the best default. It should not auto-edit arbitrary app source files because app file paths vary across React, Svelte, Next.js, and custom layouts.

## Files to change

- `cli/commands/setup.mjs`
- `task.md`
- `changelog.md`
- `files.md`

## Edge cases

- User says no: setup should continue with concise next steps.
- User chooses header or footer: CLI should still print valid code, but explain that root layout is the default recommendation.
- User chooses Svelte: CLI should print Svelte syntax instead of React syntax.
- Existing config should keep its current `widgetPosition` unless the user chooses a different setup position.

## Verification steps

- Run a syntax check for `cli/commands/setup.mjs`.
- Confirm edited files have no linter diagnostics.

## Task completion log

- 2026-04-26 23:19 UTC Added setup prompts for optional widget install code, framework choice, and mount location choice. Root app layout is the default recommendation. Verified with `node --check cli/commands/setup.mjs` and Cursor lints.
