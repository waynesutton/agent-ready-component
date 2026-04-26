# Security hardening for agent-ready component and demo app

## Problem

The live demo at `quixotic-viper-800.convex.site` exposes admin mutations (publish, draft, archive, rollback, regenerate) without authentication. Anyone can modify the demo content. The component ships `permissiveMode: true` in example configs, and the cron worker calls a public `api.*` reference where `internal.*` is required. Analytics queries run unbounded `.collect()` calls.

## Root cause

The demo was built as a showcase with no auth layer. Admin wrappers in `example-react/convex/agentReady/content.ts` are plain public functions. The component itself is isolated behind the Convex component boundary (safe), but the app level wrappers that expose it to the browser have zero access control.

## Proposed solution

1. Add `@robelest/convex-auth` to `example-react` with anonymous + password providers so admin routes require sign in.
2. Set `testMode: true` and `permissiveMode: false` in both example configs to take the demo offline until re-deployed with auth.
3. Create `authQuery` and `authMutation` custom functions using `convex-helpers` and `auth.ctx()`.
4. Gate all write mutations behind `authMutation`. Keep public read queries (getCacheStatus, listPages published-only) on plain `query`.
5. Add a login gate to the Settings and Analytics React routes.
6. Fix `cronWorker.ts` to use `internal.*` instead of `api.*`.
7. Add `.take(1000)` bounds to analytics `.collect()` calls.
8. Add security documentation section to INTEGRATION.md.

## Files to change

- `example-react/agent-ready.config.json` (config flags)
- `example-svelte/agent-ready.config.json` (config flags)
- `example-react/package.json` (add auth + convex-helpers deps)
- `example-react/convex/convex.config.ts` (register auth component)
- `example-react/convex/schema.ts` (stays empty, auth owns its tables)
- `example-react/convex/auth.ts` (new, auth config)
- `example-react/convex/http.ts` (wire auth routes)
- `example-react/convex/functions.ts` (new, authQuery/authMutation)
- `example-react/convex/agentReady/content.ts` (protect admin mutations)
- `example-react/src/main.tsx` (ConvexProviderWithAuth)
- `example-react/src/App.tsx` (login gate)
- `src/component/cronWorker.ts` (internal.* fix)
- `src/component/analytics.ts` (bounded collect)

## Edge cases

- Anonymous users can still read public files (llms.txt, agents.md) via HTTP. That is correct behavior.
- The widget fetches `/llms-status` over HTTP with CORS. No auth needed there since it returns only public config booleans.
- If auth env vars are missing, the demo shows a login prompt that cannot complete. That is safer than no auth at all.

## Verification steps

1. After changes, `npx convex dev` in example-react succeeds.
2. Visiting `/settings` or `/analytics` without sign in shows a login prompt.
3. `publishPage`, `archivePage`, `rollbackCache`, `regenerateAll` return auth errors when called without a session.
4. Public read queries like `getCacheStatus` still work for the widget.
5. `npx convex-doctor` shows no new warnings for the component.
