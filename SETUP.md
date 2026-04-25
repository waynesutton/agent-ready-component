# SETUP.md

Linear setup guide. Two parts:

- Part 1 (sections 1 through 14): you are the package author shipping this to GitHub, npm, and Convex static hosting
- Part 2 (sections 15 through 28): someone else installs `@waynesutton/agent-ready` into their own app and uses it

Related reading:

- https://llmstxt.org
- https://docs.convex.dev/llms.txt
- https://agents.md
- https://www.convex.dev/components/static-hosting
- https://docs.convex.dev/components/authoring
- https://docs.convex.dev/components/using
- https://docs.convex.dev/components/understanding

---

# Part 1. Ship the component

Everything in Part 1 is for you, the author. Run each section once.

## 1. Prerequisites

```bash
node -v          # expect v20 or newer (Node 18 dropped in Convex 1.31.5)
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
cd llms-txt
npm install
```

`npm install` installs the root component plus both workspaces (`example-react`, `example-svelte`).

## 3. Build the component

```bash
npm run build
```

Confirm these files exist before you publish:

- `dist/client/index.js`
- `dist/component/convex.config.js`
- `dist/component/_generated/component.js`
- `dist/component/_generated/api.js`
- `dist/react/index.js`
- `dist/svelte/index.js`
- `dist/test/index.js`

## 4. Type check

```bash
npm run typecheck
```

Clean output before continuing.

## 5. Push to GitHub

First commit:

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

Tag the release:

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --generate-notes
```

## 6. npm publish dry run

```bash
npm pack --dry-run
```

Check the printed file list. It must include:

- `dist/`
- `src/`
- `cli/`
- `README.md`
- `SETUP.md`
- `INTEGRATION.md`
- `LICENSE`

It must NOT include `example-react/`, `example-svelte/`, `prds/`, or `task.md`.

## 7. Set version and publish to npm

```bash
npm version 0.1.0 --no-git-tag-version
npm publish --access public
```

Verify:

```bash
npm view @waynesutton/agent-ready version
npm view @waynesutton/agent-ready exports
```

`exports` should list `./convex.config.js`, `./_generated/component.js`, `./react`, `./svelte`, and `./test`.

Push the version bump:

```bash
git add package.json
git commit -m "chore: bump to 0.1.0"
git push
```

## 8. Deploy the React demo on Convex

```bash
cd example-react
npx convex login               # once
npx convex dev --start 'vite'  # runs Convex and Vite together, Ctrl-C stops both
npx convex deploy              # deploys backend functions to a production deployment
```

Export the deployment URL so the static bundle can find it at build time:

```bash
export VITE_CONVEX_URL="https://your-deployment.convex.cloud"
export VITE_CONVEX_SITE_URL="https://your-deployment.convex.site"
```

Seed the demo config and kick off the first generation:

```bash
node setup.mjs
npx agent-ready regenerate
```

Upload the static bundle:

```bash
npm run deploy
```

Open `https://your-deployment.convex.site`. You should see the PostHog-inspired cream UI, the widget in the bottom right, and the file sidebar linking to `/llms.txt`, `/agents.md`, and `/llms-status`.

## 9. Deploy the Svelte demo on Convex

```bash
cd ../example-svelte
npx convex deploy
export VITE_CONVEX_URL="https://your-svelte-deployment.convex.cloud"
export VITE_CONVEX_SITE_URL="https://your-svelte-deployment.convex.site"
node setup.mjs
npx agent-ready regenerate
npm run deploy
```

SvelteKit is pre-configured with `@sveltejs/adapter-static`. The uploaded `build/` folder serves from the same deployment URL as the Convex functions.

## 10. Confirm live file URLs

```bash
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/agents.md
curl -i https://your-deployment.convex.site/llms-status
```

While `testMode: true` is still on, non-localhost requests return `403`. That is the expected default. Section 11 flips it off.

## 11. Flip testMode off (go live)

```bash
cd example-react
npx agent-ready go-live
```

The wizard asks for confirmation, prints the file URLs that become public, and flips the `testMode` flag. Repeat in `example-svelte`.

Re-run the curls in section 10. Expect `200 OK` and the generated content.

## 12. Test the ETag short-circuit

```bash
ETAG=$(curl -sI https://your-deployment.convex.site/llms.txt | awk '/etag/ {print $2}' | tr -d '\r"')
curl -i -H "If-None-Match: \"$ETAG\"" https://your-deployment.convex.site/llms.txt
```

Expect `HTTP/1.1 304 Not Modified`. Change any page description in `example-react/agent-ready.config.json`, then run:

```bash
cd example-react
npx agent-ready sync
```

Re-run the curl. Expect `200 OK` with a new ETag.

## 13. Test the UpdateBanner refresh flow

1. Open the live React demo URL in a browser.
2. From inside `example-react`, change any page description in `agent-ready.config.json`.
3. Run `npx agent-ready sync`.
4. The open browser tab shows a banner: `Content updated — refresh to see the latest`.
5. Click `Refresh`. The page reloads with the fresh `generatedAt` timestamp visible in the widget.

Repeat the same flow against the Svelte demo URL.

## 14. Announce checklist

- `npm view @waynesutton/agent-ready version` matches `package.json`
- `gh release view v0.1.0` shows release notes
- Both demo URLs render the PostHog cream UI
- Widget shows `HUMAN` and `MACHINE` tabs
- `testMode` is off on both demo deployments
- `/llms.txt`, `/agents.md`, `/llms-status` return `200 OK`
- ETag returns `304 Not Modified` on unchanged content
- UpdateBanner reload works end to end

Tweet the demos. You are shipped.

---

# Part 2. Use the component in your own app

Everything in Part 2 is what a consumer runs in their host app.

## 15. Install

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

## 16. Register the component

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agentReady from "@waynesutton/agent-ready/convex.config.js";
import crons from "@convex-dev/crons/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(crons);
app.use(workpool);
app.use(agentReady);
export default app;
```

## 17. Mount the HTTP routes

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components } from "./_generated/api";

const http = httpRouter();
registerRoutes(http, components.agentReady);
export default http;
```

Customize paths or add a catch-all if you want:

```ts
registerRoutes(http, components.agentReady, {
  llmsTxtPath: "/llms.txt",
  onEvent: async (ctx, req, route) => {
    console.log(`[agent-ready] ${route} requested`);
  },
});
```

## 18. Drop in the widget

React:

```tsx
import { AgentReadyWidget, UpdateBanner } from "@waynesutton/agent-ready/react";

<UpdateBanner appUrl={import.meta.env.VITE_CONVEX_SITE_URL} />
<AgentReadyWidget appUrl={import.meta.env.VITE_CONVEX_SITE_URL} />
```

Svelte:

```svelte
<script lang="ts">
  import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";
</script>

<AgentReadyWidget appUrl={import.meta.env.VITE_CONVEX_SITE_URL} />
```

## 19. Run the setup wizard

```bash
npx agent-ready setup
```

The wizard asks for:

- App name
- Public URL
- Short description
- Cron interval in hours
- Analytics on or off
- AI description preference: `claude`, `openai`, or `off`
- Test mode default (leave on)

It writes `agent-ready.config.json` and runs `agentReady:content:sync` against your deployment.

## 20. Verify locally

Dev server in one terminal (the `--start` flag runs vite in parallel):

```bash
npx convex dev --start 'vite'
```

Or run them separately in two terminals:

```bash
npx convex dev    # terminal 1
vite              # terminal 2
```

Verify:

```bash
curl -i http://127.0.0.1:3210/llms.txt   # 200 OK on localhost
npx agent-ready status
```

Open your app. The widget shows `HUMAN` and `MACHINE` tabs plus a `TEST MODE` badge. Clicking `MACHINE` reveals the file URLs. Each URL copies to clipboard on click.

## 21. CLI reference

Every CLI command maps to a Convex function on the component.

| Command | What it does |
|---|---|
| `setup` | Interactive first-run wizard, writes `agent-ready.config.json`, calls `sync` |
| `sync` | Reads `agent-ready.config.json` and applies it to the deployment |
| `status` | Prints cache status, current versions, and testMode |
| `regenerate` | Fires a fresh build of `llms.txt`, `agents.md`, and `llms-full.txt` |
| `rollback --file <name>` | Swaps the active cache entry for the previous version |
| `go-live` | Flips `testMode` off with a confirmation prompt |
| `generate-descriptions` | AI fills empty page descriptions. Honors `aiProvider` setting. Cap 100 items |
| `publish-page --path <p>` | Sets page status to published |
| `draft-page --path <p>` | Sets page status to draft |
| `archive-page --path <p>` | Sets page status to archived |
| `restore-page --path <p>` | Clears `deletedAt` on a soft-deleted page |
| `analytics` | Prints agent request summary for the last 30 days |
| `cleanup` | Trims expired analytics rows and orphan cache entries |
| `versions --path <p>` | Lists version history for a single page |

## 22. Go live

Once you are happy with the output:

```bash
npx agent-ready go-live
```

To revert for debugging:

```bash
npx convex run agentReady:content:upsertSettings --arg '{"patch": {"testMode": true}}'
```

## 23. Test ETag behavior in production

```bash
ETAG=$(curl -sI https://your-deployment.convex.site/llms.txt | awk '/etag/ {print $2}' | tr -d '\r"')
curl -i -H "If-None-Match: \"$ETAG\"" https://your-deployment.convex.site/llms.txt
```

Expect `HTTP/1.1 304 Not Modified` until a page or setting changes.

## 24. Test the refresh banner in production

1. Open your production app in a browser.
2. Edit a page description in `agent-ready.config.json`.
3. `npx agent-ready sync`.
4. The open tab shows `Content updated — Refresh`. Click it.
5. Page reloads with the new content and a fresh timestamp in the widget.

## 25. Analytics (optional)

Enable in `agent-ready.config.json`:

```json
{ "settings": { "analyticsEnabled": true, "analyticsRequestRetentionDays": 90 } }
```

Then:

```bash
npx agent-ready sync
npx agent-ready analytics
```

## 26. Rollback and regenerate

```bash
npx agent-ready regenerate                # force a fresh build
npx agent-ready rollback --file llms.txt  # swap active cache to previous version
npx agent-ready status
```

## 27. Cleanup

```bash
npx agent-ready cleanup    # trim analytics rows and orphan cache entries
npx agent-ready versions --path /docs/getting-started
```

## 28. Troubleshooting

| Symptom | Fix |
|---|---|
| `/llms.txt` returns `403` | Still in test mode. Run `npx agent-ready go-live`. |
| `/llms.txt` returns `503 "not configured"` | No settings row yet. Run `npx agent-ready setup` or `sync`. |
| `/llms.txt` returns `503 "not generated yet"` | No cached content. Run `npx agent-ready regenerate`. |
| ETag never changes after edits | Check `listPages` returns your change, then `regenerate`. |
| Widget shows `offline` dot | `/llms-status` is failing. Check that `registerRoutes` is wired in `convex/http.ts`. |
| UpdateBanner never appears | Your content never changed. Make a real edit, then `sync` or `regenerate`. |
| AI descriptions throw `aiDescriptionsEnabled is false` | Flip the flag in settings, then re-run `generate-descriptions`. |

You are done.
