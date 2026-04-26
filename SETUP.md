# SETUP.md

Author release guide for `@waynesutton/agent-ready`.

This file is for the package author shipping the component to GitHub, npm, and Convex static hosting. If you are installing the package in your own Convex app, use `docs/install.md` or `docs/install.html`.

Related reading:

- https://llmstxt.org
- https://docs.convex.dev/llms.txt
- https://agents.md
- https://www.convex.dev/components/static-hosting
- https://docs.convex.dev/components/authoring
- https://docs.convex.dev/components/using
- https://docs.convex.dev/components/understanding

## 1. Prerequisites

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

`npm install` installs the root component plus both workspaces: `example-react` and `example-svelte`.

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

## 12. Deploy the React demo on Convex

```bash
cd example-react
npx convex login
npx convex dev --start 'vite'
```

Stop the dev process after local verification.

For a stricter component check, run:

```bash
npx convex dev --typecheck-components
```

Deploy the Convex backend:

```bash
npx convex deploy
```

Export the deployment URLs so the static bundle can find Convex at build time:

```bash
export VITE_CONVEX_URL="https://your-react-deployment.convex.cloud"
export VITE_CONVEX_SITE_URL="https://your-react-deployment.convex.site"
```

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

Open `https://your-react-deployment.convex.site`. You should see the cream demo UI, the widget in the bottom right, and the file sidebar linking to `/llms.txt`, `/agents.md`, and `/llms-status`.

## 13. Deploy the Svelte demo on Convex

```bash
cd ../example-svelte
npx convex dev --start 'vite dev'
```

Stop the dev process after local verification.

For a stricter component check, run:

```bash
npx convex dev --typecheck-components
```

Deploy the Convex backend:

```bash
npx convex deploy
```

Export the deployment URLs:

```bash
export VITE_CONVEX_URL="https://your-svelte-deployment.convex.cloud"
export VITE_CONVEX_SITE_URL="https://your-svelte-deployment.convex.site"
```

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

## 14. Confirm live file URLs

Run these checks against both demo deployments:

```bash
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/agents.md
curl -i https://your-deployment.convex.site/llms-status
```

While `testMode: true` is on, non-localhost requests return `403`. That is the expected default.

## 15. Flip testMode off

```bash
npx agent-ready go-live
```

The wizard asks for confirmation, prints the file URLs that become public, and flips the `testMode` flag.

Repeat for the other demo app, then re-run the curls in section 14. Expect `200 OK` and generated content.

## 16. Test ETag behavior

```bash
ETAG=$(curl -sI https://your-deployment.convex.site/llms.txt | awk '/etag/ {print $2}' | tr -d '\r"')
curl -i -H "If-None-Match: \"$ETAG\"" https://your-deployment.convex.site/llms.txt
```

Expect `HTTP/1.1 304 Not Modified`.

Change a page description in `agent-ready.config.json`, then run:

```bash
npx agent-ready sync
npx agent-ready regenerate
```

Re-run the curl. Expect `200 OK` with a new ETag.

## 17. Test the UpdateBanner refresh flow

1. Open the live React demo URL in a browser.
2. Change any page description in `example-react/agent-ready.config.json`.
3. Run `npx agent-ready sync`.
4. The open browser tab shows a content updated refresh prompt.
5. Click `Refresh`.
6. Confirm the generated timestamp changed in the widget.

Repeat the same flow against the Svelte demo URL.

## 18. Final release checklist

- `npm view @waynesutton/agent-ready version` matches `package.json`
- `npm view @waynesutton/agent-ready bin` lists `agent-ready`
- `gh release view v0.1.0` shows release notes
- Both demo URLs render the cream UI
- Widget shows `HUMAN` and `MACHINE` tabs
- `testMode` is off on both demo deployments
- `/llms.txt`, `/agents.md`, and `/llms-status` return `200 OK`
- ETag returns `304 Not Modified` on unchanged content
- UpdateBanner reload works end to end
- `README.md` links to `docs/install.md`
- `docs/install.html` opens locally and matches the install flow

You are shipped.
