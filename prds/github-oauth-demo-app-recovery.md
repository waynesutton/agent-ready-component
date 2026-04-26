# GitHub OAuth demo app recovery

Created: 2026-04-26 20:06 UTC
Last Updated: 2026-04-26 20:06 UTC
Status: Done

## Problem

The React and Svelte demo apps were moved to GitHub OAuth, but the live React demo still showed "Admin access required" after a successful GitHub sign-in. Once that was fixed, the settings page surfaced a Convex `getCacheStatus` server error caused by stale wrapper validators.

Future demo apps need a clear setup and debugging record so GitHub OAuth works in local development and production without repeating this sequence.

## Root cause

The fix required several smaller issues to be corrected together:

1. GitHub OAuth was configured correctly only when the callback URL pointed to Convex HTTP actions, not the Vite dev server.
2. `SITE_URL` needed to point to the frontend URL for the current environment so Convex Auth could redirect back after token exchange.
3. The React auth client was initialized only inside protected routes. GitHub redirected back to the app root, so the browser client was not always mounted early enough to process OAuth callback codes.
4. The React `AuthGate` checked `state.userId`, but `@robelest/convex-auth` exposes `state.isAuthenticated` on the browser auth state.
5. The demo wrapper validators for `agentReady/content:getCacheStatus` were behind the component return shape and rejected newer widget display mode fields.

The favicon `404` and browser `unload` permission warning were unrelated to auth.

## Proposed solution

Keep both demo apps on GitHub OAuth only.

Document the working setup:

1. Use a GitHub OAuth app, not a GitHub App, for this flow.
2. Set the GitHub Authorization callback URL to `https://<deployment>.convex.site/api/auth/callback/github`.
3. Set the GitHub Homepage URL to the frontend URL, such as `http://localhost:5173` for local React dev.
4. Set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ADMIN_EMAILS`, and production auth keys on the correct Convex deployment.
5. Initialize the React browser auth client at the app root so OAuth callback codes are handled after redirects.
6. Read `state.isAuthenticated` from the browser auth state.
7. Keep app-facing wrapper validators in sync with component return validators.

## Files to change

Completed code fixes:

1. `example-react/convex/auth.ts`
2. `example-svelte/convex/auth.ts`
3. `example-react/src/auth.tsx`
4. `example-react/src/App.tsx`
5. `example-svelte/src/lib/AuthGate.svelte`
6. `example-react/convex/agentReady/content.ts`
7. `example-svelte/convex/agentReady/content.ts`

Documentation and tracking:

1. `SETUP.md`
2. `docs/install.md`
3. `docs/install.html`
4. `INTEGRATION.md`
5. `README.md`
6. `files.md`
7. `changelog.md`
8. `task.md`

## Edge cases

1. Local React uses `http://localhost:5173` as the frontend URL, but GitHub still calls back to Convex.
2. Svelte local dev may use a different frontend port. Match `SITE_URL` and the GitHub Homepage URL to that app.
3. Production needs `--prod` environment variables. Dev keys can work technically, but separate production keys are safer and reduce accidental session breakage.
4. If login succeeds but the UI still shows the gate, check the frontend auth state first.
5. If auth succeeds but settings crash, run the failing Convex query directly and check return validators.

## Verification steps

Run these for each demo app after auth or wrapper changes:

```bash
npm run build
npx convex dev --typecheck-components
```

For production React demo verification:

```bash
npx convex deploy --cmd 'npm run build' -y
npx @convex-dev/static-hosting upload --prod
npx convex run --prod agentReady/content:getCacheStatus '{}'
```

Manual verification:

1. Open `/settings`.
2. Click "Sign in with GitHub".
3. Confirm GitHub redirects back to the app.
4. Confirm settings content appears instead of "Admin access required".
5. Confirm no `getCacheStatus` server error appears in the console.

## Task completion log

2026-04-26 20:06 UTC: Captured the production login debugging sequence and the docs update plan for future demo apps.
