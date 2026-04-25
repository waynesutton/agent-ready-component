# @waynesutton/agent-ready

Auto-generate, cache, and serve `llms.txt`, `agents.md`, and `llms-full.txt` for any Convex app. One component, one deploy command, no external hosting.

Ships with React and Svelte widgets, dynamic cron scheduling via `@convex-dev/crons`, opt-in agent analytics, AI-assisted description generation, a CLI with an interactive setup wizard, and both demo apps fully hosted on Convex via `@convex-dev/static-hosting`.

## Why this exists

LLMs and coding agents read your app through standard discovery files. `llms.txt` tells an agent what your product is and which pages matter. `agents.md` documents your API. `llms-full.txt` ships your long-form docs. Today most teams hand-write these, forget to update them, or never ship them at all.

`@waynesutton/agent-ready` keeps these files in sync with your Convex-managed content, caches the output, serves it over HTTP with ETag support, and gives you a React or Svelte widget so humans can see what machines see.

## Install

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
npx agent-ready
```

The setup wizard asks for your app name, URL, description, analytics preference, and AI description preference. It writes `agent-ready.config.json`, syncs the config to your deployment, and schedules the cron.

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

## Features

- `testMode: true` by default so nothing serves publicly before you run `npx agent-ready go-live`
- ETag-aware HTTP handlers return `304 Not Modified` when content is unchanged
- Durable workpool-backed generation with retries
- Runtime cron interval updates via `@convex-dev/crons`
- Optional agent analytics with threshold callbacks
- AI description generation via Claude or OpenAI, opt-in, 100 item cap, rate-limited
- React widget with HUMAN and MACHINE tabs, live staleness detection, `useAgentReadyStatus()` hook
- Svelte widget with `createAgentReadyStatusStore()`
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

- `SETUP.md` is the linear step-by-step setup, publish, and deploy guide. Start here.
- `INTEGRATION.md` covers every integration path in a format optimized for AI tools
- `CONTRIBUTING.md` documents the widget contract for community ports (Vue, Solid, Angular)
- `prds/agent-readiness-v1.md` is the canonical design spec

## License

Apache 2.0. See `LICENSE`.
# agent-ready-component
