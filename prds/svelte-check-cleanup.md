# Svelte check cleanup

Created: 2026-04-26 20:33 UTC
Last Updated: 2026-04-26 20:44 UTC
Status: Done

## Problem

`npm run check --workspace example-svelte` fails in the Svelte demo after the GitHub OAuth and admin route updates.

## Root cause

The failures come from a few separate issues:

1. `convex/_generated` bindings are missing for the Svelte demo.
2. The local install is missing the declared `@robelest/convex-auth` package.
3. `convex-svelte` `useQuery()` returns a reactive result object, not a Svelte store, so `$summary`, `$series`, `$pages`, and `$status` are invalid.
4. Svelte 5 requires `{@const}` tags to be direct children of allowed control blocks, not nested after a `<span>`.
5. The auth gate still checks `userId`, while the GitHub OAuth recovery notes use `state.isAuthenticated`.

## Proposed solution

Generate the Svelte demo Convex bindings, install declared dependencies if needed, and update the Svelte pages to read `useQuery()` results through `.data`.

## Files to change

1. `example-svelte/src/lib/AuthGate.svelte`
2. `example-svelte/src/routes/analytics/+page.svelte`
3. `example-svelte/src/routes/settings/+page.svelte`
4. `example-svelte/convex/_generated/`
5. `task.md`
6. `changelog.md`
7. `files.md`

## Edge cases

1. Loading state must still show before query data arrives.
2. Analytics can return `null` when disabled.
3. Admin routes must stay protected by the existing auth gate.
4. Generated Convex files should come from codegen, not manual edits.

## Verification steps

```bash
npm run check --workspace example-svelte
```

## Task completion log

2026-04-26 20:44 UTC: Updated Svelte auth, analytics, and settings code, regenerated Convex bindings for the packaged component and Svelte demo, rebuilt `dist/`, and verified `npm run check --workspace example-svelte` with 0 errors and 0 warnings.
