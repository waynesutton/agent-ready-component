# @waynesutton/agent-ready

Auto-generate, cache, and serve `llms.txt`, `agents.md`, and `llms-full.txt` for any Convex app. One component, one deploy command, no external hosting.

Ships with React and Svelte widgets, dynamic cron scheduling via `@convex-dev/crons`, opt-in agent analytics, AI-assisted description generation, a CLI with an interactive setup wizard, and both demo apps fully hosted on Convex via `@convex-dev/static-hosting`.

## Widget preview

| Human view | Machine view |
|---|---|
| ![Human tab showing app name and Open in ChatGPT, Claude, Perplexity links](https://raw.githubusercontent.com/waynesutton/agent-ready-component/main/public/human-agent-ready-demo.png) | ![Machine tab showing llms.txt, agents.md, llms-full.txt, and status links](https://raw.githubusercontent.com/waynesutton/agent-ready-component/main/public/agent-agent-ready-demo.png) |

## Why this exists

LLMs and coding agents read your app through standard discovery files. `llms.txt` tells an agent what your product is and which pages matter. `agents.md` documents your API. `llms-full.txt` ships your long-form docs. Today most teams hand-write these, forget to update them, or never ship them at all.

`@waynesutton/agent-ready` keeps these files in sync with your Convex-managed content, caches the output, serves it over HTTP with ETag support, and gives you a React or Svelte widget so humans can see what machines see.

## Install

```bash
npm i @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
npx agent-ready
```

The setup wizard asks for your app name, URL, description, analytics preference, and AI description preference. It writes `agent-ready.config.json`, scaffolds Convex wrapper files at `convex/agentReady/`, syncs the config to your deployment, and schedules the cron.

Need the full consumer flow? Start with `docs/install.md`. Prefer a browser page? Open `docs/install.html`.

## Quick wire-up

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

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components, internal } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.agentReady, {
  onGenerationComplete: internal.myApp.handleGenerationComplete,
  onEvent: async (ctx, req, route) => {
    console.log(`[agent-ready] ${route} requested`);
  },
});

export default http;
```

```tsx
// src/App.tsx
import { AgentReadyWidget } from "@waynesutton/agent-ready/react";

<AgentReadyWidget appUrl={import.meta.env.VITE_CONVEX_SITE_URL} />
```

Your files are live at:
- `https://your-deployment.convex.site/llms.txt`
- `https://your-deployment.convex.site/agents.md`
- `https://your-deployment.convex.site/llms-full.txt` (opt-in)
- `https://your-deployment.convex.site/llms-analytics`
- `https://your-deployment.convex.site/llms-status`

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

- `testMode: true` by default so nothing serves publicly before you run `npx agent-ready go-live`
- ETag-aware HTTP handlers return `304 Not Modified` when content is unchanged
- Durable workpool-backed generation with retries
- Runtime cron interval updates via `@convex-dev/crons`
- Optional agent analytics with threshold callbacks
- AI description generation via Claude or OpenAI, opt-in, 100 item cap, rate-limited
- React widget with HUMAN and MACHINE tabs, live staleness detection, `useAgentReadyStatus()` hook. HUMAN tab includes "Open in ChatGPT / Claude / Perplexity" links. MACHINE tab shows Phosphor ArrowSquareOut icons for opening raw files
- Svelte widget with `createAgentReadyStatusStore()` and the same tab layout
- Config-driven widget visibility: `widgetShowFiles`, `widgetShowAppName`, `widgetShowDescription`, `widgetShowMeta`, and `widgetStatusVisible` in `agent-ready.config.json` control the widget without code changes. Props still work as overrides
- Configurable widget position including `floating-center` and custom hex colors via `WidgetColors`
- CLI covering setup, sync, status, regenerate, rollback, go-live, analytics, cleanup, versions, and per-page state transitions
- Both demo apps hosted entirely on Convex via `@convex-dev/static-hosting`

## Demo apps

Both demos run on one Convex deployment. Pick React or Svelte.

```bash
cd example-react
npm install
npm run deploy
```

```bash
cd example-svelte
npm install
npm run deploy
```

The demo URL becomes `https://your-deployment.convex.site`. The widget, the files, and the host app live on the same domain.

## Documentation

- `docs/install.md` is the Markdown install guide for Convex users adding `@waynesutton/agent-ready` to their app
- `docs/install.html` is the same consumer install guide as a standalone HTML page
- `SETUP.md` is the author release guide for shipping this package to GitHub, npm, and Convex static hosting, including the dev deployment setup needed before component codegen
- `INTEGRATION.md` covers every integration path in a format optimized for AI tools
- `CONTRIBUTING.md` documents the widget contract for community ports (Vue, Solid, Angular)
- `prds/agent-readiness-v1.md` is the canonical design spec

## License

Apache 2.0. See `LICENSE`.
