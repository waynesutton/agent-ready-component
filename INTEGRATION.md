# INTEGRATION.md

> For LLMs: This file contains complete integration instructions for `@waynesutton/agent-ready`.
> Follow sections in order. Each section is self-contained. Code blocks are intended to be copy-pasted verbatim.

## SECTION: Installation

```bash
npm i @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

Optional, only when using `@convex-dev/static-hosting` to host the frontend on Convex:

```bash
npm i @convex-dev/static-hosting
```

Run the interactive wizard to create `agent-ready.config.json`, scaffold Convex wrapper files, and sync to your deployment:

```bash
npx agent-ready setup
```

The wizard creates:
- `agent-ready.config.json` with your app settings
- `convex/agentReady/content.ts` with browser-facing query/mutation wrappers
- `convex/agentReady/analytics.ts` with analytics query wrappers

These wrapper files are needed because Convex components run in isolation. Browser clients call your app-level wrappers, which delegate to the component.

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

## SECTION: Convex wrapper functions

The component runs in an isolated Convex component. Browser clients cannot call component functions directly. You need thin wrapper functions in your own `convex/` directory that delegate to the component.

The `npx agent-ready setup` wizard scaffolds these automatically at `convex/agentReady/content.ts` and `convex/agentReady/analytics.ts`. If you skipped the wizard, create them manually:

### convex/agentReady/content.ts

```ts
import { action, mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

const fileTypeValidator = v.union(
  v.literal("llms.txt"),
  v.literal("agents.md"),
  v.literal("llms-full.txt"),
);

const pageStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const pageValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  title: v.string(),
  path: v.string(),
  description: v.string(),
  fullContent: v.optional(v.string()),
  status: pageStatusValidator,
  isOptional: v.optional(v.boolean()),
  order: v.optional(v.number()),
  descriptionGeneratedByAi: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
});

const cacheStatusValidator = v.object({
  testMode: v.boolean(),
  appName: v.union(v.string(), v.null()),
  appUrl: v.union(v.string(), v.null()),
  lastGeneratedAt: v.union(v.number(), v.null()),
  generatedFromVersion: v.union(v.string(), v.null()),
  generationInProgress: v.boolean(),
  hasDrafts: v.boolean(),
  fullTxtEnabled: v.boolean(),
});

export const getCacheStatus = query({
  args: {},
  returns: cacheStatusValidator,
  handler: async (ctx) => {
    return await ctx.runQuery(components.agentReady.content.getCacheStatus, {});
  },
});

export const listPages = query({
  args: { includeAllStatuses: v.optional(v.boolean()) },
  returns: v.array(pageValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.agentReady.content.listPages, args);
  },
});

export const publishPage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.agentReady.content.publishPage, args);
    return null;
  },
});

export const draftPage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.agentReady.content.draftPage, args);
    return null;
  },
});

export const archivePage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.agentReady.content.archivePage, args);
    return null;
  },
});

export const rollbackCache = mutation({
  args: { fileType: fileTypeValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.agentReady.content.rollbackCache, args);
    return null;
  },
});

export const regenerateAll = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.runAction(components.agentReady.content.regenerateAll, {});
  },
});
```

### convex/agentReady/analytics.ts

```ts
import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

const summaryValidator = v.union(
  v.null(),
  v.object({
    windowStartedAt: v.number(),
    totalRequests: v.number(),
    byAgent: v.record(v.string(), v.number()),
    byFile: v.record(v.string(), v.number()),
  }),
);

const seriesPointValidator = v.object({
  timestamp: v.number(),
  count: v.number(),
});

export const getSummary = query({
  args: { now: v.number() },
  returns: summaryValidator,
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.agentReady.analytics.getSummary, args);
  },
});

export const getTimeSeries = query({
  args: { now: v.number(), bucketHours: v.optional(v.number()) },
  returns: v.array(seriesPointValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.agentReady.analytics.getTimeSeries, args);
  },
});
```

## SECTION: Settings panel (React)

The package ships an optional `<AgentReadySettingsPanel />` component for managing pages, cache, and actions. It requires the Convex wrapper functions above.

```tsx
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { AgentReadySettingsPanel } from "@waynesutton/agent-ready/react";

export default function SettingsPage() {
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

### Settings panel props

| Prop | Type | Notes |
|---|---|---|
| `cacheStatus` | `CacheStatus \| null` | Pass the result of `useQuery(api.agentReady.content.getCacheStatus)` |
| `pages` | `Array<PageRow> \| null` | Pass the result of `useQuery(api.agentReady.content.listPages, { includeAllStatuses: true })` |
| `onRegenerate` | `() => Promise<void>` | Calls your `regenerateAll` action |
| `onRollback` | `(fileType) => Promise<void>` | Calls your `rollbackCache` mutation |
| `onPublishPage` | `(path) => Promise<void>` | Calls your `publishPage` mutation |
| `onDraftPage` | `(path) => Promise<void>` | Calls your `draftPage` mutation |
| `onArchivePage` | `(path) => Promise<void>` | Calls your `archivePage` mutation |
| `className` | `string` | Optional CSS class for the outer container |

### Non-React frameworks

The settings panel is React only. For Svelte, Vue, or other frameworks, use the Convex wrapper functions directly with your framework's Convex client bindings and build your own settings UI.

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

## SECTION: agent readiness (Cloudflare standards)

The component supports the full agent readiness standard from Cloudflare. To enable all features at once:

```bash
npx agent-ready agent-ready
```

This sets all readiness flags in `agent-ready.config.json`, syncs to your deployment, and triggers regeneration.

### What gets enabled

| Feature | Route | Config flag |
|---|---|---|
| Content-Signal headers | All content routes | `contentSignals` |
| Token count header | All content routes | Always on |
| Link discovery headers | All content routes | `discoveryHeaders` |
| robots.txt with AI bot rules | `/robots.txt` | `robotsTxtEnabled` |
| sitemap.xml | `/sitemap.xml` | `sitemapEnabled` |
| Agent skills endpoint | `/.well-known/agent-skills` | `agentSkillsEnabled` |
| Readiness self-score | `/llms-readiness` | `readinessEndpointEnabled` |
| Markdown negotiation | Vary header | `markdownNegotiation` |

### Scanning your score

```bash
npx agent-ready scan --url https://your-deployment.convex.site
```

Prints a pass/fail table for every endpoint and exits non-zero when below 80 (CI friendly).

### Content-Signal configuration

Default is all-yes. Override in `agent-ready.config.json`:

```json
{
  "settings": {
    "contentSignals": {
      "aiTrain": true,
      "search": true,
      "aiInput": false
    }
  }
}
```

### robots.txt configuration

```json
{
  "settings": {
    "robotsTxtEnabled": true,
    "robotsTxtAllowAiBots": true,
    "robotsTxtDisallowPaths": ["/admin", "/api/internal"]
  }
}
```

### Widget SCORE tab

The SCORE tab appears automatically when `readinessEndpointEnabled` is true. Override with the `showScoreTab` prop:

```tsx
<AgentReadyWidget appUrl={convexSiteUrl} showScoreTab={true} />
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
