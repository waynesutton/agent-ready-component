Created: 2026-04-26 00:22 UTC
Last Updated: 2026-04-26 00:28 UTC
Status: Done

# Fix packaged component typecheck circularity

## Problem

`npm run typecheck` fails after component codegen. The generated component API reports circular references, and `src/component/content.ts` has loose helper typing around page status changes.

## Root cause

`src/component/content.ts` calls `internal.content.*` from functions defined in the same file. That makes Convex generated API types reference themselves during TypeScript inference. The `setPageStatus` helper also uses `Function` and `any`, which breaks the project rule for type safe code.

## Proposed solution

Keep the public function names stable in `content.ts`, but move internal action helper queries into a separate component module. Replace the loose page status helper context with the generated `MutationCtx` type and remove same file `internal.content.*` calls where direct mutation logic is clearer.

## Files to change

- `src/component/content.ts`
- `src/component/contentInternal.ts`
- `src/component/validators.ts`
- `src/component/analytics.ts`
- `files.md`
- `changelog.md`
- `task.md`

## Edge cases

- CLI calls like `agentReady:content:sync` must keep working.
- Generated component code should not be edited by hand.
- Component codegen must still pass after the source changes.

## Verification steps

- `npx convex codegen --component-dir ./src/component`
- `npm run typecheck`

## Task completion log

- 2026-04-26 00:28 UTC: Moved same-file internal calls out of `content.ts`, added shared validators, removed loose helper typing, and verified component codegen plus package typecheck pass.
