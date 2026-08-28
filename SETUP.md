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

## Quick release with folder checks

Fast path for shipping a release when the repo is already set up. Every step starts with a `cd` to the exact folder, so you can run any step from anywhere. The repo root in these examples is `/Users/waynesutton/Documents/sites/agent-ready-component`. Adjust to your checkout path.

For a first-time release or a full walkthrough with all verification detail, use the numbered sections below instead.

### Step 1: Final check and commit (repo root)

```bash
cd /Users/waynesutton/Documents/sites/agent-ready-component
pwd   # should print /Users/waynesutton/Documents/sites/agent-ready-component
npm run typecheck && npm run build
git status
git add -A
git commit -m "Release 0.3.0: simple-mode-first, publish live by default, per-site markdown route, always-on describedby Link header, AgentLinks"
git push origin main
```

Optional tag:

```bash
git tag v0.3.0 && git push origin v0.3.0
```

### Step 2: Publish to npm (repo root)

```bash
cd /Users/waynesutton/Documents/sites/agent-ready-component
npm publish --access public
npm view @waynesutton/agent-ready version   # should print 0.3.0
```

The build script copies both `.svelte` files into `dist`. Before publishing, run the export and tarball checks from sections 5 and 9: `cacheStatusValidator` must be in `dist/client`, and `docs/upgrading.md` plus `cli/lib/wrappers.mjs` must be in the pack list.

### Step 3: Redeploy the React demo to production (example-react folder)

```bash
cd /Users/waynesutton/Documents/sites/agent-ready-component/example-react
pwd   # should end in /example-react
npm run deploy:full
```

That one script chains everything: `npx convex deploy`, `npx agent-ready sync --prod`, `npx agent-ready regenerate --prod`, then the static hosting push. If you prefer running them one at a time:

```bash
cd /Users/waynesutton/Documents/sites/agent-ready-component/example-react
npx convex deploy
npx agent-ready sync --prod
npx agent-ready regenerate --prod
npm run deploy
```

### Step 4: Redeploy the Svelte demo to production (example-svelte folder)

```bash
cd /Users/waynesutton/Documents/sites/agent-ready-component/example-svelte
pwd   # should end in /example-svelte
npx convex deploy
npx agent-ready sync --prod
npx agent-ready regenerate --prod
npm run deploy:static   # builds and uploads to static hosting with --prod
```

### Step 5: Verify production (any folder, curl only)

```bash
BASE=https://quixotic-viper-800.convex.site   # React demo public site
curl -sI $BASE/llms.txt | grep -i "link\|etag"
curl -sI $BASE/agent-ready-react-demo.md
curl -sI -H "Accept: text/markdown" $BASE/markdown | grep -i "content-type\|vary"
curl -s $BASE/llms-status | grep -o '"publish":"[^"]*"'
```

Expected: 200s, a `Link:` header containing `rel="describedby"` on every response, `content-type: text/markdown` with `vary: Accept` on the negotiated `/markdown` request, and `"publish":"live"` from status.

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

`npm install` installs the root component plus all demo apps: `example-react`, `example-svelte`, and `example-expo`.

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
- `dist/expo/index.js`
- `dist/test/index.js`

Confirm the shared wrapper validator is exported from the package root. Consumer wrapper functions import this so their `getCacheStatus` return validators never go stale on upgrades:

```bash
grep -l "cacheStatusValidator" dist/client/index.js dist/client/index.d.ts
```

Both files should print. If either is missing, the scaffolded wrappers and INTEGRATION.md snippet will fail to import it.

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

Spot-check these specific files inside those folders. They are easy to lose to an `.npmignore` edit and each one breaks a real flow if missing:

- `docs/upgrading.md` (linked from the README, the 0.2.x to 0.3.0 upgrade guide)
- `cli/lib/wrappers.mjs` (stale wrapper detection used by `sync` and `setup`)

```bash
npm pack --dry-run 2>&1 | grep -E "docs/upgrading.md|cli/lib/wrappers.mjs"
```

Both lines should print.

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

The `example-react` and `example-svelte` directories are working Convex apps that show how to register the component, wire the widget, serve live discovery files, and expose `/markdown`. `example-react` uses React + Vite with the React widget. `example-svelte` uses SvelteKit with the Svelte widget.

The `example-expo` directory is a mobile demo. It does not host Convex HTTP routes itself. It points the Expo widget at a Convex `.site` deployment from the React or Svelte demo, or any app that has `registerRoutes` and `registerMarkdownRoutes` mounted.

The setup wizard treats the markdown site and widget tab as separate choices. You can enable `/markdown` for agents, search, and answer engines, then answer no to "Show MARKDOWN tab in the widget?" if you want the widget to stay simpler.

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
npm run dev
```

This pushes Convex functions first, then runs `node setup.mjs`, then starts Vite through `npx convex dev --run-sh`.

If you prefer two terminals:

```bash
npx convex dev
# second terminal
node setup.mjs
vite
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
# Optional. Public production domain shown in widget copy links and AI chat prompts.
# Leave unset to fall back to status.appUrl, then window.location.origin.
# VITE_SITE_URL=https://yourdomain.com
```

Replace `quixotic-viper-800` with the deployment name printed by `npx convex deploy` if yours is different. The `.convex.cloud` URL goes on the first line, the `.convex.site` URL goes on the second.

These URLs tell your production build where to find your Convex backend. Without this file, the built app will not know which server to connect to. If you serve the demo from a custom domain, also set `VITE_SITE_URL` to that domain so the widget shows the right URLs to humans and AI agents.

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

Open `https://quixotic-viper-800.convex.site`. You should see the cream demo UI, the widget in the bottom right, and the file sidebar linking to `/llms.txt`, `/agents.md`, `/llms-status`, and `/markdown`.

### Deploy the Svelte demo

```bash
cd ../example-svelte
npm run dev
```

This pushes Convex functions first, then runs `node setup.mjs`, then starts SvelteKit through `npx convex dev --run-sh`.

If you prefer two terminals:

```bash
npx convex dev
# second terminal
node setup.mjs
vite dev
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
# Optional. Public production domain shown in widget copy links and AI chat prompts.
# VITE_SITE_URL=https://yourdomain.com
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

### Run the Expo demo

Use the `.convex.site` URL from either full demo app:

```bash
cd ../example-expo
npm install
EXPO_PUBLIC_AGENT_READY_URL=https://your-deployment.convex.site npm run start
```

Optional public domain:

```bash
EXPO_PUBLIC_SITE_URL=https://yourdomain.com
```

The Expo widget reads `/llms-status` and `/llms-markdown-index` from `EXPO_PUBLIC_AGENT_READY_URL`. It opens the same `llms.txt`, `agents.md`, `llms-full.txt`, and `/markdown` URLs as the web widgets.

### Confirm live file URLs

Run these checks against both demo deployments:

```bash
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/agents.md
curl -i https://your-deployment.convex.site/llms-status
curl -i https://your-deployment.convex.site/markdown
curl -i -H "Accept: text/markdown" https://your-deployment.convex.site/markdown
npx agent-ready scan --url https://your-deployment.convex.site --strict
```

Files are live by default (`publish: "live"`). If a deployment is in `publish: "draft"` (or has the deprecated `testMode: true`), non-localhost requests return `404` until you go live.

### Flip a draft install live

```bash
npx agent-ready go-live --prod
```

The command asks for confirmation, prints the file URLs that become public, and sets `publish: "live"`.

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
- Hidden widget mode verified by setting `widgetVisible: false`, running `npx agent-ready sync --prod`, and confirming generated routes still return `200 OK`
- `publish` is `"live"` on both demo deployments
- `/llms.txt`, `/agents.md`, and `/llms-status` return `200 OK`
- `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/.well-known/agent-skills`, and `/llms-readiness` return `200 OK` when readiness flags are enabled
- `npx agent-ready scan --url <url>` returns score of 80 or higher
- `npx agent-ready links --url <url>` prints copyable discovery and AI chat URLs
- ETag returns `304 Not Modified` on unchanged content
- UpdateBanner reload works end to end
- `README.md` contains the app developer install guide
- `README.md` links to `docs/upgrading.md` in the intro and Documentation section
- `docs/install.md` and `docs/install.html` point readers back to the README install guide
- Upgrade path verified: in a consumer app with 0.2.x-era wrappers, `npx agent-ready sync` prints the stale wrapper warning with the missing validator fields and the import fix
- `npx agent-ready go-live` updates the local `agent-ready.config.json` to `publish: "live"` so a later `sync` does not flip the site back to draft

You are shipped.