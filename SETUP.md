# SETUP.md

Author release guide for `@waynesutton/agent-ready`, a Convex component with React and Svelte widgets.

This file is for the package author shipping the Convex component to GitHub, npm, and Convex static hosting.

If you only want to add `@waynesutton/agent-ready` to your own Convex app, start with the install guide in [`README.md`](README.md#install). That path is shorter and written for app developers.

Related reading:

- [https://llmstxt.org](https://llmstxt.org)
- [https://docs.convex.dev/llms.txt](https://docs.convex.dev/llms.txt)
- [https://agents.md](https://agents.md)
- [https://www.convex.dev/components/static-hosting](https://www.convex.dev/components/static-hosting)
- [https://docs.convex.dev/components/authoring](https://docs.convex.dev/components/authoring)
- [https://docs.convex.dev/components/using](https://docs.convex.dev/components/using)
- [https://docs.convex.dev/components/understanding](https://docs.convex.dev/components/understanding)

## 1. Prerequisites

You need these tools before you publish or deploy the demos:

```bash
node -v          # expect v20 or newer
npm -v           # expect 10.x
npx convex -v    # expect 1.36 or newer
gh --version     # GitHub CLI
```

Accounts:

- Convex account: `npx convex login`
- npm account with 2FA: `npm login`
- GitHub: `gh auth login`
- Optional: Anthropic or OpenAI API key for AI descriptions

## 2. Clone and install

```bash
git clone https://github.com/waynesutton/agent-ready-component
cd agent-ready-component
npm install
```

`npm install` installs the root component plus both demo apps: `example-react` and `example-svelte`.

## 3. Configure a Convex dev deployment

```bash
npx convex dev --once
```

This creates `.env.local` with `CONVEX_DEPLOYMENT`. Component codegen needs that deployment selection even though the component source lives in `src/component`.

If Convex finishes project configuration and then stops on missing generated package files, that is fine for this step. Confirm `.env.local` exists, then continue.

## 4. Generate component types

```bash
npx convex codegen --component-dir ./src/component
```

This creates the component-local `src/component/_generated/` files used by the Convex functions. Normal app codegen is not enough for a packaged component.

## 5. Build the package

```bash
npm run build
```

Confirm these files exist before publishing:

- `dist/client/index.js`
- `dist/component/convex.config.js`
- `dist/component/_generated/component.js`
- `dist/component/_generated/api.js`
- `dist/react/index.js`
- `dist/svelte/index.js`
- `dist/test/index.js`

## 6. Type check

```bash
npm run typecheck
```

Clean output before continuing.

## 7. Confirm package metadata

Open `package.json` and verify:

- `name` is `@waynesutton/agent-ready`
- `version` is the version you plan to publish
- `repository.url` points to `https://github.com/waynesutton/agent-ready-component.git`
- `bin.agent-ready` points to `./cli/bin.mjs`
- `files` includes `dist`, `src`, `cli`, `docs`, `README.md`, `SETUP.md`, `INTEGRATION.md`, and `LICENSE`

The `cli` entry matters. Without it, npm publishes the package but `npx agent-ready` cannot run.

## 8. Push to GitHub

First commit if this is a fresh checkout:

```bash
git add .
git commit -m "chore: initial release"
```

Create the repo and push:

```bash
gh repo create waynesutton/agent-ready-component --public --source=. --remote=origin --push --description "Convex component that auto-generates, caches, and serves llms.txt, agents.md, and llms-full.txt."
```

If the repo already exists:

```bash
git remote add origin https://github.com/waynesutton/agent-ready-component.git
git branch -M main
git push -u origin main
```

## 9. Run the npm dry run

```bash
npm pack --dry-run
```

The printed file list must include:

- `dist/`
- `src/`
- `cli/`
- `docs/`
- `README.md`
- `SETUP.md`
- `INTEGRATION.md`
- `LICENSE`

It must not include:

- `example-react/`
- `example-svelte/`
- `prds/`
- `task.md`
- `.cursor/`
- `.claude/`
- `.agents/`

## 10. Publish to npm

If you need to bump the version:

```bash
npm version 0.1.0 --no-git-tag-version
```

Publish:

```bash
npm publish --access public
```

Verify:

```bash
npm view @waynesutton/agent-ready version
npm view @waynesutton/agent-ready exports
npm view @waynesutton/agent-ready bin
```

`exports` should list `./convex.config.js`, `./_generated/component.js`, `./_generated/api.js`, `./react`, `./svelte`, and `./test`.

Push the version bump if one was made:

```bash
git add package.json
git commit -m "chore: bump to 0.1.0"
git push
```

If your checkout has `package-lock.json`, include it in the same commit.

## 11. Tag the release

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --generate-notes
```

## 12. Demo apps (optional)

The `example-react` and `example-svelte` directories are working Convex apps that show how to register the component, wire the widget, and serve live discovery files. `example-react` uses React + Vite with the React widget. `example-svelte` uses SvelteKit with the Svelte widget.

You do not need these demo apps to use `@waynesutton/agent-ready` in your own project. If you forked this repo to build your own product, you can ignore them.

The remaining steps in this guide only matter if you want to run and deploy the demo apps.

### Auth and admin access

Both demo apps use `@robelest/convex-auth` with GitHub OAuth. The settings and analytics pages require sign-in. Admin emails are stored in a Convex environment variable so they never appear in the codebase.

The working shape is: GitHub redirects to Convex, Convex exchanges the OAuth code, then Convex Auth redirects back to the frontend URL in `SITE_URL`. If any one of those URLs points at the wrong environment, sign-in can look successful while the app still shows "Admin access required".

#### 1. Create a GitHub OAuth app

Go to [github.com/settings/applications/new](https://github.com/settings/applications/new).

Fill in the form:

- **Application name**: anything you want (users see this on the GitHub consent screen)
- **Homepage URL**: `http://localhost:5173` for local dev
- **Authorization callback URL**: your Convex HTTP Actions URL plus `/api/auth/callback/github`

Find your HTTP Actions URL in the [Convex dashboard](https://dashboard.convex.dev/) under Settings. It matches your Deployment URL but ends in `.convex.site` instead of `.convex.cloud`. For example:

```
https://charming-puffin-516.convex.site/api/auth/callback/github
```

The callback URL points to Convex, not localhost. GitHub redirects to Convex after consent, and Convex handles the token exchange and redirects the user back to your app.

Click **Register application**, then **Generate a new client secret**.

#### 2. Set environment variables

```bash
cd example-react
npx convex env set AUTH_GITHUB_ID "your-github-client-id"
npx convex env set AUTH_GITHUB_SECRET "your-github-client-secret"
npx convex env set SITE_URL "http://localhost:5173"
```

```bash
cd ../example-svelte
npx convex env set AUTH_GITHUB_ID "your-github-client-id"
npx convex env set AUTH_GITHUB_SECRET "your-github-client-secret"
npx convex env set SITE_URL "http://localhost:5173"
```

For production deployments, add `--prod`:

```bash
npx convex env set AUTH_GITHUB_ID "your-github-client-id" --prod
npx convex env set AUTH_GITHUB_SECRET "your-github-client-secret" --prod
npx convex env set SITE_URL "https://your-production-deployment.convex.site" --prod
```

Use separate production values for `JWT_PRIVATE_KEY`, `JWKS`, and `AUTH_SECRET_ENCRYPTION_KEY`. Do not copy long-lived dev auth keys into production. If production already used dev keys during testing, rotate the production values after verifying login. Existing sessions may sign out after rotation.

#### 3. Set admin emails

```bash
cd example-react
npx convex env set ADMIN_EMAILS "your-email@example.com,another-admin@example.com"
```

```bash
cd ../example-svelte
npx convex env set ADMIN_EMAILS "your-email@example.com,another-admin@example.com"
```

The check is case-insensitive. Users whose email is not in the list see the sign-in button but are rejected by the server when they try to access admin routes. Never commit email addresses to the repository.

#### 4. Run the auth setup wizard (if not already done)

The wizard generates signing keys and wires `auth.config.ts`, `auth/core.ts`, and `http.ts`:

```bash
cd example-react
npx @robelest/convex-auth setup
```

Repeat for the Svelte demo if needed. The wizard is idempotent and will skip files that already exist.

#### Production callback URL

When deploying to production, create a second GitHub OAuth app or update the existing OAuth app with the production callback URL:

```
https://your-production-deployment.convex.site/api/auth/callback/github
```

Set the production secrets with `--prod` as shown above.

For local and production at the same time, two GitHub OAuth apps are easier to manage because a GitHub OAuth app has one Authorization callback URL. Use one app for the dev Convex deployment and one app for the production Convex deployment.

#### Troubleshooting GitHub login

If GitHub says sign-in worked but the app still shows "Admin access required", check these in order:

1. The GitHub Authorization callback URL points to `.convex.site/api/auth/callback/github`, not localhost.
2. `SITE_URL` matches the frontend URL for the deployment you are using.
3. The React demo initializes `useAuth()` in `src/App.tsx` so OAuth callback codes are processed after root redirects.
4. The React `AuthGate` reads `state.isAuthenticated`, not `state.userId`.
5. `ADMIN_EMAILS` includes the email returned by GitHub, with comma-separated values for multiple admins.
6. If settings loads after auth but throws a Convex server error, run `npx convex run --prod agentReady/content:getCacheStatus '{}'` and check the app-facing return validator.

The browser `unload` permission warning and a missing `favicon.ico` request are unrelated to GitHub auth.

### Deploy the React demo

```bash
cd example-react
npx convex login
npx convex dev
```

In a second terminal:

```bash
npm run dev
```

Stop both processes after local verification.

For a stricter component check, run:

```bash
npx convex dev --typecheck-components
```

Deploy the Convex backend once to create or confirm the production deployment:

```bash
npx convex deploy
```

Create a file called `.env.production.local` in the `example-react` folder with your production Convex URLs. You can create it in your editor or paste this in the terminal:

```
VITE_CONVEX_URL=https://quixotic-viper-800.convex.cloud
VITE_CONVEX_SITE_URL=https://quixotic-viper-800.convex.site
```

Replace `quixotic-viper-800` with the deployment name printed by `npx convex deploy` if yours is different. The `.convex.cloud` URL goes on the first line, the `.convex.site` URL goes on the second.

These URLs tell your production build where to find your Convex backend. Without this file, the built app will not know which server to connect to.

Once the file exists, deploy everything with one command:

```bash
npm run deploy:full
```

If the production deployment name changes, update `.env.production.local` before running the full deploy again.

The full deploy script runs:

```bash
npx convex deploy
npx agent-ready sync --prod
npx agent-ready regenerate --prod
npm run deploy
```

Open `https://quixotic-viper-800.convex.site`. You should see the cream demo UI, the widget in the bottom right, and the file sidebar linking to `/llms.txt`, `/agents.md`, and `/llms-status`.

### Deploy the Svelte demo

```bash
cd ../example-svelte
npx convex dev
```

In a second terminal:

```bash
npm run dev
```

Stop both processes after local verification.

For a stricter component check, run:

```bash
npx convex dev --typecheck-components
```

Deploy the Convex backend:

```bash
npx convex deploy
```

Create a file called `.env.production.local` in the `example-svelte` folder with your Svelte deployment URLs:

```
VITE_CONVEX_URL=https://your-svelte-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-svelte-deployment.convex.site
```

Replace `your-svelte-deployment` with the deployment name printed by `npx convex deploy`.

Seed demo content and generate the first files:

```bash
node setup.mjs
npx agent-ready sync
npx agent-ready regenerate
```

Upload the static bundle:

```bash
npm run deploy
```

SvelteKit uses `@sveltejs/adapter-static`. The uploaded `build/` folder serves from the same deployment URL as the Convex functions.

### Confirm live file URLs

Run these checks against both demo deployments:

```bash
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/agents.md
curl -i https://your-deployment.convex.site/llms-status
```

While `testMode: true` is on, non-localhost requests return `403`. That is the expected default.

### Flip testMode off

```bash
npx agent-ready go-live --prod
```

The wizard asks for confirmation, prints the file URLs that become public, and flips the `testMode` flag.

Repeat for the other demo app, then re-run the curls in section 14. Expect `200 OK` and generated content.

### Test ETag behavior

```bash
ETAG=$(curl -sI https://your-deployment.convex.site/llms.txt | awk '/etag/ {print $2}' | tr -d '\r"')
curl -i -H "If-None-Match: \"$ETAG\"" https://your-deployment.convex.site/llms.txt
```

Expect `HTTP/1.1 304 Not Modified`.

Change a page description in `agent-ready.config.json`, then run:

```bash
npx agent-ready sync --prod
npx agent-ready regenerate --prod
```

Re-run the curl. Expect `200 OK` with a new ETag.

### Test the UpdateBanner refresh flow

1. Open the live React demo URL in a browser.
2. Change any page description in `example-react/agent-ready.config.json`.
3. Run `npx agent-ready sync --prod`.
4. The open browser tab shows a content updated refresh prompt.
5. Click `Refresh`.
6. Confirm the generated timestamp changed in the widget.

Repeat the same flow against the Svelte demo URL.

## 13. Final release checklist

- `npm view @waynesutton/agent-ready version` matches `package.json`
- `npm view @waynesutton/agent-ready bin` lists `agent-ready`
- `gh release view v0.1.0` shows release notes
- Both demo URLs render the cream UI
- Widget shows `HUMAN` and `MACHINE` tabs. HUMAN tab includes "Open in ChatGPT / Claude / Perplexity" links. MACHINE tab shows file links with open-in-new-tab icons
- SCORE tab visible when `widgetShowScoreTab: true` is set in config. Shows readiness score with 11 checks
- `testMode` is off on both demo deployments
- `/llms.txt`, `/agents.md`, and `/llms-status` return `200 OK`
- `/robots.txt`, `/sitemap.xml`, `/.well-known/agent-skills`, and `/llms-readiness` return `200 OK` when readiness flags are enabled
- `npx agent-ready scan --url <url>` returns score of 80 or higher
- ETag returns `304 Not Modified` on unchanged content
- UpdateBanner reload works end to end
- `README.md` contains the app developer install guide
- `docs/install.md` and `docs/install.html` point readers back to the README install guide

You are shipped.