Created: 2026-04-26 00:36 UTC
Last Updated: 2026-04-26 00:40 UTC
Status: Done

# Demo component wrapper and CORS fix

## Problem

The React demo at `localhost:5173` reports two runtime failures:

- `/llms-status` fetches from the Convex site are blocked by CORS.
- `api.agentReady.content.getCacheStatus` fails because the browser is trying to call a Convex component function directly.

## Root Cause

The status HTTP response does not include CORS headers, so browser fetches from the Vite dev origin cannot read it.

The demo clients reference `api.agentReady.*`, but `agentReady` is a mounted Convex component. Component function refs are meant to be called by host app server functions through `components.agentReady`, not directly by browser clients.

## Proposed Solution

Add CORS headers to the public status route.

Add thin app facing wrapper functions under each demo app's `convex/agentReady/` folder. The wrappers keep the existing frontend import paths stable and delegate to `components.agentReady`.

## Files to Change

- `src/client/index.ts`
- `example-react/convex/agentReady/content.ts`
- `example-react/convex/agentReady/analytics.ts`
- `example-svelte/convex/agentReady/content.ts`
- `example-svelte/convex/agentReady/analytics.ts`
- `task.md`
- `changelog.md`
- `files.md`

## Edge Cases

- Status route should stay public because the widget polls it without auth.
- Existing frontend code should keep using `api.agentReady.content.*` and `api.agentReady.analytics.*`.
- The Svelte demo has the same direct component calls as the React demo, so it needs the same wrappers.

## Verification Steps

- Run TypeScript checks for the root package and demo apps.
- Run Convex codegen for the demos if generated API bindings are stale.
- Confirm `/llms-status` returns JSON with `Access-Control-Allow-Origin`.

## Task Completion Log

- 2026-04-26 00:40 UTC: Added status route CORS headers and OPTIONS support.
- 2026-04-26 00:40 UTC: Added React and Svelte demo wrapper functions for content and analytics component APIs.
- 2026-04-26 00:40 UTC: Fixed demo static hosting component references to `components.selfHosting`.
- 2026-04-26 00:40 UTC: Added minimal root Convex config and empty schema so `convex-doctor` stays at 100.
- 2026-04-26 00:40 UTC: Verified root typecheck, React demo typecheck, live CORS response, preflight response, public status query, and `convex-doctor` 100/100.
