# INTEGRATION.md

> For LLMs: This file contains complete integration instructions for `@waynesutton/agent-ready`.
> Follow sections in order. Each section is self-contained. Code blocks are intended to be copy-pasted verbatim.

## SECTION: Installation

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

Optional, only when using `@convex-dev/static-hosting` to host the frontend on Convex:

```bash
npm install @convex-dev/static-hosting
```

Run the interactive wizard to create `agent-ready.config.json` and sync it to your deployment:

```bash
npx agent-ready setup
```

## SECTION: convex.config.ts setup

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

When hosting the frontend on Convex too:

```ts
import staticHosting from "@convex-dev/static-hosting/convex.config.js";
app.use(staticHosting);
```

## SECTION: http.ts — registerRoutes

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components, internal } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.agentReady, {
  // All paths configurable. Defaults shown.
  llmsTxtPath: "/llms.txt",
  agentsMdPath: "/agents.md",
  fullTxtPath: "/llms-full.txt",
  analyticsPath: "/llms-analytics",
  statusPath: "/llms-status",

  // Per-route handlers. Return null to run default handler. Return a Response to override.
  routes: {
    "llms.txt": async (ctx, req) => null,
    "agents.md": async (ctx, req) => null,
    "llms-full.txt": async (ctx, req) => null,
    "llms-analytics": async (ctx, req) => null,
    "llms-status": async (ctx, req) => null,
  },

  // Catch-all. Fires for every request to any registered route.
  onEvent: async (ctx, req, route) => {
    console.log(`[llms-txt] ${route} hit`);
  },

  // Optional callbacks registered on upsertSettings.
  onGenerationComplete: internal.myApp.handleGenerationComplete,
  onAnalyticsThreshold: internal.myApp.handleAnalyticsThreshold,
});

export default http;
```

## SECTION: typed client setup

```ts
// convex/agentReady.ts
import { AgentReady, createTypedAgentReadyClient } from "@waynesutton/agent-ready";
import { components } from "./_generated/api";

export const agentReady = new AgentReady(components.agentReady);

// Optional. Typed helpers for action and mutation dispatch.
export const typedAgentReady = createTypedAgentReadyClient(components.agentReady);
```

## SECTION: React widget

```tsx
// src/App.tsx
import { AgentReadyWidget } from "@waynesutton/agent-ready/react";

export default function App() {
  return (
    <>
      {/* page content */}
      <AgentReadyWidget
        appUrl={import.meta.env.VITE_CONVEX_SITE_URL}
        position="floating-bottom-right"
        theme="dark"
      />
    </>
  );
}
```

### Widget props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `appUrl` | `string` | required | Base URL of the Convex deployment |
| `position` | `"footer" \| "floating-bottom-right" \| "floating-bottom-left" \| "floating-center"` | `"floating-bottom-right"` | Layout mode. `floating-center` pins the widget to the bottom center of the viewport |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | Color theme |
| `showTestModeBadge` | `boolean` | `true` | Display the `testMode` badge |
| `showStatus` | `boolean` | config value | Show the status row in the MACHINE tab. When omitted, reads `widgetStatusVisible` from `agent-ready.config.json` via the status endpoint |
| `showFiles` | `boolean` | config value | Show the file copy rows (llms.txt, agents.md, llms-full.txt) in the HUMAN tab |
| `showAppName` | `boolean` | config value | Show the app name heading in the HUMAN tab |
| `showDescription` | `boolean` | config value | Show the description line in the HUMAN tab |
| `showMeta` | `boolean` | config value | Show the generation timestamp and progress indicators in the MACHINE tab |
| `colors` | `Partial<WidgetColors>` | `{}` | Custom hex colors to match your site |

All `show*` props follow a three-tier resolution: explicit prop > config value from `/llms-status` > `true`. Change them in `agent-ready.config.json` and run `npx agent-ready sync` to apply without touching code.

### Custom colors example

```tsx
<AgentReadyWidget
  appUrl={import.meta.env.VITE_CONVEX_SITE_URL}
  position="floating-center"
  theme="dark"
  showStatus={false}
  colors={{
    bg: "#0d1117",
    border: "#30363d",
    textActive: "#c9d1d9",
    accent: "#58a6ff",
  }}
/>
```

### Tab behavior

The HUMAN tab shows file URLs with copy buttons, then "Open in ChatGPT", "Open in Claude", and "Open in Perplexity" links that send your `llms.txt` URL to each AI chat service. The MACHINE tab shows raw file links with open-in-new-tab icons (Phosphor ArrowSquareOut) and optional status metadata.

```tsx
// Live status subscription
import { useAgentReadyStatus } from "@waynesutton/agent-ready/react";

function StatusBadge() {
  const status = useAgentReadyStatus();
  if (!status) return null;
  return <span>Last generated: {new Date(status.lastGeneratedAt).toLocaleString()}</span>;
}
```

## SECTION: Svelte widget

```svelte
<script lang="ts">
  import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";
  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL;
</script>

<AgentReadyWidget {appUrl} position="floating-bottom-right" theme="dark" />
```

### Svelte custom colors example

```svelte
<AgentReadyWidget
  {appUrl}
  position="floating-center"
  theme="dark"
  showStatus={false}
  colors={{ bg: "#0d1117", border: "#30363d", textActive: "#c9d1d9", accent: "#58a6ff" }}
/>
```

```svelte
<script lang="ts">
  import { createAgentReadyStatusStore } from "@waynesutton/agent-ready/svelte";
  const status = createAgentReadyStatusStore();
</script>

{#if $status}
  <span>Last generated: {new Date($status.lastGeneratedAt).toLocaleString()}</span>
{/if}
```

## SECTION: CLI commands

```bash
npx agent-ready setup                                 # interactive first-run wizard
npx agent-ready sync                                  # apply agent-ready.config.json to deployment
npx agent-ready sync --dry-run                        # preview changes only
npx agent-ready status                                # cache, job, and testMode state
npx agent-ready regenerate                            # queue a regenerateAll workpool job
npx agent-ready rollback --file llms.txt              # restore previous cached content
npx agent-ready go-live                               # disable testMode with confirmation
npx agent-ready generate-descriptions                 # AI fills empty descriptions
npx agent-ready generate-descriptions --force         # overwrites existing descriptions
npx agent-ready publish-page --path /dashboard        # set page to published
npx agent-ready draft-page --path /dashboard          # set page to draft
npx agent-ready archive-page --path /dashboard        # archive page
npx agent-ready restore-page --path /dashboard        # restore soft-deleted page
npx agent-ready analytics                             # print agent request summary
npx agent-ready cleanup --older-than 7d               # prune old analytics rows
npx agent-ready versions --path /dashboard            # show version history
```

## SECTION: static-hosting integration (demo apps)

```ts
// convex/http.ts
import { registerRoutes } from "@waynesutton/agent-ready";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { httpRouter } from "convex/server";

const http = httpRouter();

registerRoutes(http, components.agentReady, {});
registerStaticRoutes(http, components.staticHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export default http;
```

```ts
// convex/staticHosting.ts
import { exposeUploadApi } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } =
  exposeUploadApi(components.staticHosting);
```

```json
{
  "scripts": {
    "deploy": "npx @convex-dev/static-hosting deploy",
    "deploy:static": "npx @convex-dev/static-hosting upload --build --prod"
  }
}
```

## SECTION: testMode — going to production

Default is `testMode: true`. File endpoints respond `403` to non-localhost requests until you run:

```bash
npx agent-ready go-live
```

The wizard confirms before flipping the flag. To flip back for debugging:

```bash
npx convex run agentReady:content:upsertSettings --arg '{"testMode": true}'
```

## SECTION: environment variables

| Variable | Required | Purpose |
|---|---|---|
| `AGENT_READY_ANALYTICS_SECRET` | when analytics enabled | Bearer token for `/llms-analytics` endpoint (legacy `LLMS_ANALYTICS_SECRET` still works) |
| `ANTHROPIC_API_KEY` | when `aiProvider: "claude"` | Claude API key for description generation |
| `OPENAI_API_KEY` | when `aiProvider: "openai"` | OpenAI API key for description generation |
| `VITE_CONVEX_SITE_URL` | client-side | Public URL of the Convex deployment for widget links |

Set with:

```bash
npx convex env set AGENT_READY_ANALYTICS_SECRET your-secret
```

## SECTION: troubleshooting

**Files return 403.** `testMode` is still enabled. Run `npx agent-ready go-live`.

**`/llms-analytics` returns 401.** Check `AGENT_READY_ANALYTICS_SECRET` (or legacy `LLMS_ANALYTICS_SECRET`) is set on the deployment and the request includes `Authorization: Bearer <secret>`.

**Widget says "Generating..." forever.** Check `npx agent-ready status`. If the workpool job is `failed`, run `npx agent-ready regenerate` to retry.

**ETag header missing.** The handler only sets ETag when `cachedFiles.generatedFromVersion` is non-null. Trigger a regeneration if this is missing.

**Cron not running.** Check `cronEnabled: true` and `cronIntervalHours` is greater than zero in settings. Re-run `npx agent-ready sync` to reschedule.
