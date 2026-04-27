# @waynesutton/agent-ready

[![npm version](https://img.shields.io/npm/v/@waynesutton/agent-ready.svg)](https://www.npmjs.com/package/@waynesutton/agent-ready)
[![npm downloads](https://img.shields.io/npm/dm/@waynesutton/agent-ready.svg)](https://www.npmjs.com/package/@waynesutton/agent-ready)

A [Convex component](https://docs.convex.dev/components) that auto-generates, caches, and serves `llms.txt`, `agents.md`, and `llms-full.txt` from your Convex backend. Register it with `app.use(agentReady)`, drop the widget into your React or Svelte frontend, and your app is discoverable by AI agents. No external hosting required.

Ships with React and Svelte widgets, dynamic cron scheduling via `@convex-dev/crons`, opt-in agent analytics, AI-assisted description generation, a CLI with an interactive setup wizard, and both demo apps fully hosted on Convex via `@convex-dev/static-hosting`.

## Widget preview

| Human view | Machine view |
|---|---|
| ![Human tab showing app name and Open in ChatGPT, Claude, Perplexity links](https://raw.githubusercontent.com/waynesutton/agent-ready-component/main/public/human-agent-ready-demo.png) | ![Machine tab showing llms.txt, agents.md, llms-full.txt, and status links](https://raw.githubusercontent.com/waynesutton/agent-ready-component/main/public/agent-agent-ready-demo.png) |

![Score tab showing 100/100 readiness with 11 passing checks](https://raw.githubusercontent.com/waynesutton/agent-ready-component/main/public/score-agent-ready-demo.png)

## Why this exists

LLMs and coding agents read your app through standard discovery files. `llms.txt` tells an agent what your product is and which pages matter. `agents.md` documents your API. `llms-full.txt` ships your long-form docs. Today most teams hand-write these, forget to update them, or never ship them at all.

`@waynesutton/agent-ready` is a Convex component that keeps these files in sync with your Convex backend, caches the output, serves it over HTTP with ETag support, and ships React and Svelte widgets so humans can see what machines see. It runs inside the Convex component boundary with its own isolated tables, so your app schema stays clean.

## Install

Use this guide when you are adding `@waynesutton/agent-ready` to an existing Convex React or Svelte app.

If you are new to Convex, follow the steps in order. If you already ship Convex apps, the whole flow is: install the package, register the component, mount routes, add the widget, run the setup wizard, then verify the files.

### Before you start

You need:

- A Convex app with `convex/convex.config.ts`
- Node 20 or newer
- Convex CLI 1.36 or newer
- A public app URL for your generated files

### 1. Install the package

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

If Convex will host your frontend too, install static hosting:

```bash
npm install @convex-dev/static-hosting
```

### 2. Register the Convex component

Add the component to `convex/convex.config.ts`:

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

If you installed static hosting, register it in the same file:

```ts
import staticHosting from "@convex-dev/static-hosting/convex.config.js";

app.use(staticHosting);
```

### 3. Mount the HTTP routes

Add the routes in `convex/http.ts`:

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.agentReady);

export default http;
```

This serves the generated files and status routes:

- `https://your-deployment.convex.site/llms.txt`
- `https://your-deployment.convex.site/agents.md`
- `https://your-deployment.convex.site/llms-full.txt`
- `https://your-deployment.convex.site/llms-status`
- `https://your-deployment.convex.site/llms-analytics`
- `https://your-deployment.convex.site/robots.txt` when enabled
- `https://your-deployment.convex.site/sitemap.xml` when enabled
- `https://your-deployment.convex.site/.well-known/agent-skills` when enabled
- `https://your-deployment.convex.site/llms-readiness` when enabled

You can add callbacks later:

```ts
registerRoutes(http, components.agentReady, {
  onEvent: async (ctx, req, route) => {
    console.log(`[agent-ready] ${route} requested`);
  },
});
```

If your app already defines `/sitemap.xml` or `/robots.txt`, skip those routes to avoid conflicts:

```ts
registerRoutes(http, components.agentReady, {
  skipRoutes: ["/sitemap.xml", "/robots.txt"],
});
```

The setup wizard detects existing routes automatically and prints the right `skipRoutes` snippet.

### 4. Add the widget

React:

```tsx
// src/App.tsx
import { AgentReadyWidget, UpdateBanner } from "@waynesutton/agent-ready/react";

export default function App() {
  // Convex deployment URL. Used to fetch /llms-status and /llms-readiness.
  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
  // Public production domain. Used for visible file links and AI chat prompts.
  // Optional. When omitted, the widget falls back to status.appUrl, then window.location.origin.
  const publicAppUrl = import.meta.env.VITE_SITE_URL as string | undefined;

  return (
    <>
      <UpdateBanner appUrl={appUrl} />
      <AgentReadyWidget
        appUrl={appUrl}
        publicAppUrl={publicAppUrl}
        position="floating-bottom-right"
        theme="dark"
      />
    </>
  );
}
```

Svelte:

```svelte
<script lang="ts">
  import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";

  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
  const publicAppUrl = import.meta.env.VITE_SITE_URL as string | undefined;
</script>

<AgentReadyWidget {appUrl} {publicAppUrl} position="floating-bottom-right" theme="dark" />
```

Vite tip: set `VITE_CONVEX_SITE_URL` to your `.convex.site` deployment URL and `VITE_SITE_URL` to your production domain. Without `VITE_SITE_URL`, a dev `.convex.site` URL can leak into your production bundle.

### 5. Run the setup wizard

```bash
npx agent-ready setup
```

The wizard asks for your app name, URL, description, cron interval, analytics preference, AI description preference, test mode preference, and an optional widget install guide. If you opt in, it asks whether you use React or Svelte and where you will mount the widget (root layout is the recommended default), then prints the matching code for you to copy in. It writes `agent-ready.config.json`, scaffolds Convex wrapper files at `convex/agentReady/`, syncs the config to your deployment, and schedules the cron.

### 6. Verify locally

Start Convex and your frontend in two terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

Or run both from one command:

```bash
npx convex dev --start 'npm run dev'
```

Then check the component:

```bash
curl -i http://127.0.0.1:3210/llms.txt
npx agent-ready status
```

Open your app. The widget should show `HUMAN` and `MACHINE` tabs plus a `TEST MODE` badge.

### 7. Deploy

Deploy your Convex backend:

```bash
npx convex deploy
```

If you host the frontend on Convex static hosting:

```bash
export VITE_CONVEX_URL="https://your-deployment.convex.cloud"
export VITE_CONVEX_SITE_URL="https://your-deployment.convex.site"
npx @convex-dev/static-hosting deploy
```

Then sync your config and generate production files:

```bash
npx agent-ready sync --prod
npx agent-ready regenerate --prod
```

### 8. Go live

`testMode` blocks public access until you are ready. When the files should be public, run:

```bash
npx agent-ready go-live --prod
```

Verify the public files:

```bash
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/agents.md
curl -i https://your-deployment.convex.site/llms-status
```

Expect `200 OK`.

Check production status at any time:

```bash
npx agent-ready status --prod
```

If you want the older standalone guide, `docs/install.md` and `docs/install.html` now point back to this README.

## Agent readiness

Make your app pass the [isitagentready.com](https://isitagentready.com/) scan with one command:

```bash
npx agent-ready agent-ready
```

This enables all Cloudflare agent readiness features: `Content-Signal` headers, `x-markdown-tokens`, discovery `Link` headers, `robots.txt` with AI bot rules, `sitemap.xml`, `/.well-known/agent-skills`, the `/llms-readiness` self-score endpoint, and markdown content negotiation.

Scan your deployment to verify:

```bash
npx agent-ready scan --url https://your-deployment.convex.site
```

The SCORE tab in the widget shows your readiness score in real time.

## Settings panel (optional)

Add an admin page to manage pages, cache, and actions. The panel ships as a React component you can mount on any route. It takes your Convex query results and mutation callbacks as props, so it works with any app layout.

```tsx
// src/pages/Settings.tsx (or wherever you want it)
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { AgentReadySettingsPanel } from "@waynesutton/agent-ready/react";

export default function Settings() {
  const status = useQuery(api.agentReady.content.getCacheStatus);
  const pages = useQuery(api.agentReady.content.listPages, { includeAllStatuses: true });
  const regenerate = useAction(api.agentReady.content.regenerateAll);
  const rollback = useMutation(api.agentReady.content.rollbackCache);
  const publish = useMutation(api.agentReady.content.publishPage);
  const draft = useMutation(api.agentReady.content.draftPage);
  const archive = useMutation(api.agentReady.content.archivePage);

  return (
    <AgentReadySettingsPanel
      cacheStatus={status}
      pages={pages}
      onRegenerate={() => regenerate({})}
      onRollback={(fileType) => rollback({ fileType })}
      onPublishPage={(path) => publish({ path })}
      onDraftPage={(path) => draft({ path })}
      onArchivePage={(path) => archive({ path })}
    />
  );
}
```

The wrapper functions at `convex/agentReady/content.ts` and `convex/agentReady/analytics.ts` are scaffolded automatically by `npx agent-ready setup`. They bridge the component API to your browser clients. If you skipped the wizard, see the wrapper code in INTEGRATION.md.

Not using React? The Convex wrapper functions work with any framework. Build your own settings UI using `useQuery`/`useMutation` equivalents for Svelte, Vue, or vanilla JS.

## Features

- Convex component with isolated tables: your app schema stays untouched
- `testMode: true` by default so nothing serves publicly before you run `npx agent-ready go-live`
- ETag-aware HTTP handlers return `304 Not Modified` when content is unchanged
- Durable workpool-backed generation with retries
- Runtime cron interval updates via `@convex-dev/crons`
- Optional agent analytics with threshold callbacks
- AI description generation via Claude or OpenAI, opt-in, 100 item cap, rate-limited
- Drop-in React and Svelte widgets with HUMAN, MACHINE, and SCORE tabs. Live staleness detection, `useAgentReadyStatus()` hook, config-driven visibility
- SCORE tab shows readiness score with color-coded checks from `/llms-readiness`
- `Content-Signal`, `x-markdown-tokens`, `Link` discovery headers on every content response
- Auto-generated `robots.txt` with AI bot directives, `sitemap.xml`, and `/.well-known/agent-skills`
- Readiness self-score endpoint (`/llms-readiness`) with 11 checks across discoverability, content, bots, and protocol
- `npx agent-ready agent-ready` enables all readiness flags in one command
- `npx agent-ready scan` audits your deployment (CI-friendly, exits non-zero below 80)
- Config-driven widget visibility: `widgetShowFiles`, `widgetShowAppName`, `widgetShowDescription`, `widgetShowMeta`, `widgetShowScoreTab`, `widgetStatusVisible`, `widgetCleanMode`, `widgetShowHumanTab`, `widgetShowMachineTab`, `widgetShowChatLinks`, `widgetShowChatGPT`, `widgetShowClaude`, and `widgetShowPerplexity` in `agent-ready.config.json` control the widget without code changes. Props still work as overrides
- CLI covering setup, sync, status, regenerate, rollback, go-live, agent-ready, scan, analytics, cleanup, versions, and per-page state transitions
- Both demo apps hosted entirely on Convex via `@convex-dev/static-hosting`

## Widget display modes

Control which tabs, content sections, and AI chat links the widget shows. Set these in `agent-ready.config.json` under `settings`, or pass them as props directly on the widget component. Props override config values.

| Setting | Default | Effect |
|---|---|---|
| `widgetCleanMode` | `false` | Strips app name and description, keeps tabs and links functional |
| `widgetShowHumanTab` | `true` | Show or hide the HUMAN tab |
| `widgetShowMachineTab` | `true` | Show or hide the MACHINE tab |
| `widgetShowScoreTab` | `false` | Show or hide the SCORE tab |
| `widgetShowChatLinks` | `true` | Show or hide all three AI chat links on the HUMAN tab |
| `widgetShowChatGPT` | `true` | Show or hide the "Open in ChatGPT" link |
| `widgetShowClaude` | `true` | Show or hide the "Open in Claude" link |
| `widgetShowPerplexity` | `true` | Show or hide the "Open in Perplexity" link |

When all tabs are hidden, the widget renders nothing. When only one tab is visible, its tab button still renders so the label shows, but there is nothing to toggle.

Example config for a minimal MACHINE-only widget with no chat links:

```json
{
  "settings": {
    "widgetShowHumanTab": false,
    "widgetShowMachineTab": true,
    "widgetShowScoreTab": false,
    "widgetShowChatLinks": false
  }
}
```

Example React props override:

```tsx
<AgentReadyWidget
  appUrl={appUrl}
  showHumanTab={true}
  showMachineTab={true}
  showChatGPT={false}
  showPerplexity={false}
  cleanMode={true}
/>
```

## Sync and regenerate

After editing `agent-ready.config.json`, push the changes to your deployment:

```bash
npx agent-ready sync
npx agent-ready regenerate
```

## Production deployment

Add `--prod` to any command to target your production deployment instead of dev. The full production lifecycle looks like this:

```bash
npx convex deploy
npx agent-ready sync --prod
npx agent-ready regenerate --prod
npx agent-ready go-live --prod
```

Verify production status and files:

```bash
npx agent-ready status --prod
npx agent-ready scan --url https://your-deployment.convex.site --prod
curl -i https://your-deployment.convex.site/llms.txt
```

## CLI reference

| Command | What it does |
|---|---|
| `setup` | Interactive first-run wizard, writes `agent-ready.config.json`, calls `sync` |
| `sync` | Reads `agent-ready.config.json` and applies it to the deployment |
| `status` | Prints cache status, current versions, and test mode state |
| `regenerate` | Builds fresh `llms.txt`, `agents.md`, and `llms-full.txt` |
| `rollback --file <name>` | Swaps the active cache entry for the previous version |
| `go-live` | Flips `testMode` off with a confirmation prompt |
| `agent-ready` | Enables all readiness flags, syncs, and regenerates |
| `scan --url <url>` | Audits deployment endpoints, exits non-zero below 80 |
| `generate-descriptions` | Fills empty page descriptions when AI descriptions are enabled |
| `publish-page --path <p>` | Sets page status to published |
| `draft-page --path <p>` | Sets page status to draft |
| `archive-page --path <p>` | Sets page status to archived |
| `restore-page --path <p>` | Clears `deletedAt` on a soft-deleted page |
| `analytics` | Prints agent request summary for the last 30 days |
| `cleanup` | Trims expired analytics rows and orphan cache entries |
| `versions --path <p>` | Lists version history for one page |

Add `--prod` to any command to target your production deployment. For example: `npx agent-ready go-live --prod`, `npx agent-ready status --prod`, `npx agent-ready scan --url https://your-deployment.convex.site --prod`.

## Demo apps

Both demos are full Convex apps that show how the component and widget work together. They run on Convex with GitHub OAuth for admin access. Pick React or Svelte.

Before running either demo, create a GitHub OAuth app at [github.com/settings/applications/new](https://github.com/settings/applications/new). Set the **Authorization callback URL** to your Convex HTTP Actions URL plus `/api/auth/callback/github` (for example, `https://your-deployment.convex.site/api/auth/callback/github`). The callback points to Convex, not localhost. Set the **Homepage URL** to `http://localhost:5173` for local dev.

Then set the GitHub secrets on your Convex deployment:

```bash
npx convex env set AUTH_GITHUB_ID "your-github-client-id"
npx convex env set AUTH_GITHUB_SECRET "your-github-client-secret"
npx convex env set SITE_URL "http://localhost:5173"
npx convex env set ADMIN_EMAILS "your-email@example.com"
```

For production, set the same values with `--prod` and use your deployed frontend URL for `SITE_URL`.

Run the React demo:

```bash
cd example-react
npm install
npm run dev
```

Run the Svelte demo:

```bash
cd example-svelte
npm install
npm run dev
```

The demo URL becomes `https://your-deployment.convex.site`. The widget, the files, and the host app live on the same domain. See `SETUP.md` for full production deploy instructions.

## Documentation

- `README.md#install` is the canonical install guide for adding this Convex component to your React or Svelte app
- `docs/install.md` points package readers back to the README install guide
- `docs/install.html` is the same redirect-style install entry point as a standalone HTML page
- `SETUP.md` is the author release guide for shipping this package to GitHub, npm, and Convex static hosting
- `INTEGRATION.md` covers every integration path in a format optimized for AI coding agents
- `CONTRIBUTING.md` documents the widget contract for community ports (Vue, Solid, Angular)
- `prds/agent-readiness-v1.md` is the canonical design spec

## License

Apache 2.0. See `LICENSE`.
