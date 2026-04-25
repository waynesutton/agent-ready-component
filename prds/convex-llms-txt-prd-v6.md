# convex-llms-txt product requirements document v6

## Overview

`@convex-dev/llms-txt` is a Convex component that auto-generates, caches, and serves `llms.txt`, `agents.md`, and `llms-full.txt` for any Convex app. It ships with framework widgets for React and Svelte, dynamic cron scheduling via `@convex-dev/crons`, opt-in agent analytics, AI-assisted description generation, a CLI with a setup wizard, a `setup.mjs` first-run script, durable workpool-backed generation, and both demo apps fully self-hosted on Convex via `@convex-dev/static-hosting`.

One backend. One deploy command. No Vercel, no Netlify, no external hosting required.

---

## What changed in v6

Lessons from `@convex-dev/stripe` and `@convex-dev/static-hosting` — the two most DX-complete components in the Convex directory.

| Area | v5 | v6 |
|---|---|---|
| HTTP route registration | Manual `http.route()` calls in the README | `registerRoutes(http, components.llmsTxt, options)` — one call mounts everything |
| Route customization | Hardcoded paths | `llmsTxtPath`, `agentsMdPath`, `analyticsPath`, `statusPath` options in `registerRoutes` |
| Event handler API | Function handles in constructor | Per-event handler map in `registerRoutes`, matching Stripe's `events` pattern |
| `onEvent` catch-all | Not available | `onEvent` handler called for every HTTP request to component routes |
| Demo app hosting | External hosting assumed | Both demo apps hosted entirely on Convex via `@convex-dev/static-hosting` |
| Deploy script | `npm run dev` only | `npm run deploy` deploys backend + static files in one command |
| `UpdateBanner` | Not available | React and Svelte update notification banners for demo apps |
| Setup wizard | `setup.mjs` hand-written | `npx llms-txt setup` interactive wizard, matching static-hosting's setup pattern |
| `INTEGRATION.md` | Not present | `INTEGRATION.md` in the repo root, LLM-optimized, covers every integration path |
| ETag support | Not present | HTTP file handlers return ETag headers on cached content |
| `sync` action | Manual seed or CLI | Stripe-style `sync` action callable from CI/CD to push config changes to a live deployment |

All v5 features carry forward unchanged.

---

## What the Stripe component taught us

The `@convex-dev/stripe` component is the clearest example of how to design a component HTTP API that is both minimal and extensible. Five lessons applied directly:

**`registerRoutes()` over manual `http.route()` calls.** Stripe uses `registerRoutes(http, components.stripe, options)` to mount the webhook endpoint. The developer gets one function call that handles all route registration. For `llms-txt`, five routes need to be registered: `/llms.txt`, `/agents.md`, `/llms-full.txt`, `/llms-analytics`, and `/llms-status`. Asking developers to write five `http.route()` calls in their `http.ts` is friction. One `registerRoutes` call with an options object replaces all of them. The routes are still mounted in the app — the component just provides a clean function to do it.

```ts
// Before (v5)
http.route({ path: "/llms.txt", method: "GET", handler: llmsTxt.httpHandler("llms") });
http.route({ path: "/agents.md", method: "GET", handler: llmsTxt.httpHandler("agents") });
http.route({ path: "/llms-analytics", method: "GET", handler: llmsTxt.httpHandler("analytics") });
http.route({ path: "/llms-status", method: "GET", handler: llmsTxt.httpHandler("status") });

// After (v6)
registerRoutes(http, components.llmsTxt, {
  llmsTxtPath: "/llms.txt",       // all paths configurable
  agentsMdPath: "/agents.md",
  fullTxtPath: "/llms-full.txt",
  analyticsPath: "/llms-analytics",
  statusPath: "/llms-status",
  onEvent: async (ctx, req, route) => {
    console.log(`Agent request to ${route}`);
  },
});
```

**Per-event handlers in `registerRoutes` options.** Stripe lets you pass an `events` map with typed handlers per event type. For `llms-txt`, the equivalent is per-route handlers in the `registerRoutes` options — the developer can add custom logic before or after the component's default handler runs for any route. This is cleaner than the function handle pattern for inline logic and does not require defining a separate mutation.

**`onEvent` catch-all handler.** Stripe exposes an `onEvent` handler that fires for every webhook event, useful for logging and analytics. For `llms-txt`, an `onEvent` handler on `registerRoutes` fires for every HTTP request to any of the component's routes. The developer gets the route name, the request object, and can add logging or rate limiting without touching the component internals.

**Sync action for CI/CD.** Stripe exposes a `sync` action to pull existing Stripe resources into Convex. For `llms-txt`, the equivalent is a `sync` action callable from CI/CD that applies a config file to the live deployment — same as `npx llms-txt sync` but callable directly via `npx convex run`. This matters for teams that manage `llms-txt.config.json` in version control and want automatic sync on every deploy without the CLI installed globally.

**Typed event arguments.** Stripe's event handlers are fully typed: `async (ctx, event: Stripe.CustomerSubscriptionUpdatedEvent)`. The `registerRoutes` per-route handlers for `llms-txt` are typed with the request context and a discriminated union for the route name, so the developer gets autocomplete on what they're handling.

---

## What the static-hosting component taught us

`@convex-dev/static-hosting` eliminates external hosting entirely. The demo apps for `llms-txt` should work the same way — deployable with one command, hosted on `your-deployment.convex.site`, no Vercel account needed.

Beyond hosting the demo apps, six patterns from `static-hosting` improve `llms-txt` directly:

**Interactive setup wizard CLI.** `npx @convex-dev/static-hosting setup` runs an interactive wizard that walks the developer through installation. `npx llms-txt setup` should do the same — ask for `appName`, `appUrl`, `description`, whether to enable analytics, whether to enable AI descriptions, and write a starter `llms-txt.config.json`. This replaces the hand-written `setup.mjs` in demo apps with a proper CLI command any project can run.

**One-shot deploy command.** `npx @convex-dev/static-hosting deploy` deploys both the Convex backend and the static files in one command, in the right order, with the right environment variables. The demo apps add `"deploy": "npx @convex-dev/static-hosting deploy"` to `package.json`. This is the model for the demo apps — one command, one URL, done.

**ETag support on served files.** `static-hosting` sends ETag headers on HTML files so browsers do not re-download unchanged content. The `llms.txt`, `agents.md`, and `llms-full.txt` HTTP handlers should do the same — compute the ETag from `generatedFromVersion` and return `304 Not Modified` if the client's `If-None-Match` header matches. Agents and crawlers that implement HTTP caching properly benefit from this with fewer re-downloads.

**CDN mode for non-HTML assets.** `static-hosting` has a CDN mode that redirects non-HTML assets to Bunny.net for better performance. For `llms-txt`, this applies to `llms-full.txt` specifically — when the file exceeds a configurable threshold (default 100KB), the handler can redirect to a CDN URL rather than serving directly from Convex storage. This keeps Convex bandwidth usage in check for apps with large full-content files.

**`UpdateBanner` for live reload.** `static-hosting` ships a React `<UpdateBanner />` component that subscribes to a Convex query and shows a "New version available — refresh" banner when the app is updated. For `llms-txt`, the widget's MACHINE tab shows a similar notification when `cachedFiles.generatedFromVersion` changes while the panel is open — indicating the displayed timestamps are now stale and should be refreshed.

**`INTEGRATION.md` optimized for AI consumption.** `static-hosting` ships an `INTEGRATION.md` in the repo root that is explicitly documented as "optimized for LLM consumption." This is exactly right for a component that will be installed by developers using AI coding tools. `llms-txt` ships the same — a structured `INTEGRATION.md` that covers every integration path (React, SvelteKit, Next.js, manual) with complete code examples, no prose filler, and explicit section markers for AI parsing.

---

## Goals

- Install and configure in under 10 minutes via `npx llms-txt setup` interactive wizard
- `testMode: true` by default — prevents accidental live serving before the developer is ready
- Zero-friction first run — `setup.mjs` seeds data, `registerRoutes` mounts all HTTP routes in one call
- Auto-generate and cache `llms.txt`, `agents.md`, and `llms-full.txt` from Convex-managed data
- Durable generation via workpool — retries on failure, max concurrency of 1
- ETag support on all served files — agents and crawlers skip re-downloads when content is unchanged
- Keep content fresh via a dynamic cron schedule changeable at runtime, no redeploy required
- `registerRoutes()` mounts all five HTTP routes in a single call with typed per-route handlers
- Track agent requests opt-in with configurable data retention and threshold callbacks
- Generate descriptions via LLM, opt-in, explicit trigger only
- HUMAN/MACHINE toggle widget for React and Svelte with live version staleness detection
- `useLlmsTxtStatus()` React hook and Svelte store as stable public APIs
- CLI with `setup`, `sync`, `go-live`, `rollback`, `analytics`, `cleanup` commands
- Both demo apps hosted entirely on Convex via `@convex-dev/static-hosting`
- `INTEGRATION.md` in the repo root, LLM-optimized, covering every integration path
- Be publishable to the Convex components directory with full compliance

---

## Non-goals

- Not a CMS or full content management system
- Not a replacement for `robots.txt` or sitemaps
- Not multi-tenant (one config per Convex deployment)
- No Vue or Angular widgets from the core team (community-contributed)
- No rich-text content fields — plain text only
- The analytics endpoint is developer-only, not a public API

---

## Component architecture

### Package entry points

| Entry point | Purpose |
|---|---|
| `@convex-dev/llms-txt` | Class-based client, typed client factory, `registerRoutes`, types |
| `@convex-dev/llms-txt/convex.config.js` | Component config for `convex.config.ts` |
| `@convex-dev/llms-txt/react` | `<LlmsTxtWidget />`, `useLlmsTxtStatus()`, update detection hook |
| `@convex-dev/llms-txt/svelte` | `<LlmsTxtWidget />`, `createLlmsTxtStatusStore()` |
| `@convex-dev/llms-txt/test` | Test helpers for `convex-test` |

### Peer dependencies

| Package | Required | Notes |
|---|---|---|
| `convex` | yes | Host app's Convex installation |
| `@convex-dev/crons` | yes | Dynamic cron scheduling |
| `@convex-dev/workpool` | yes | Durable generation with retry |
| `@convex-dev/static-hosting` | demo apps only | Not required for the component itself |
| `convex-svelte` | Svelte widget only | SvelteKit apps |

---

## `registerRoutes` API

This is the primary integration point for HTTP. It replaces all manual `http.route()` calls.

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex-dev/llms-txt";
import { components } from "./_generated/api";
import { internal } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.llmsTxt, {
  // All paths configurable — defaults shown
  llmsTxtPath: "/llms.txt",
  agentsMdPath: "/agents.md",
  fullTxtPath: "/llms-full.txt",         // only registered if fullTxtEnabled: true
  analyticsPath: "/llms-analytics",
  statusPath: "/llms-status",

  // Per-route handlers — add logic before/after the default response
  routes: {
    "llms.txt": async (ctx, req) => {
      // Return null to run default handler, or return a Response to override
      console.log("llms.txt requested by:", req.headers.get("user-agent"));
      return null;
    },
    "agents.md": async (ctx, req) => null,
    "llms-analytics": async (ctx, req) => {
      // Custom pre-auth logic, additional validation, etc.
      return null;
    },
  },

  // Catch-all: fires for every request to any registered route
  onEvent: async (ctx, req, route) => {
    // route is: "llms.txt" | "agents.md" | "llms-full.txt" | "llms-analytics" | "llms-status"
    await ctx.runMutation(internal.myApp.logAgentRequest, { route });
  },

  // Stripe-style: register callback handlers via registerRoutes
  onGenerationComplete: internal.myApp.handleGenerationComplete,
  onAnalyticsThreshold: internal.myApp.handleThreshold,
});

export default http;
```

`registerRoutes` is exported from `@convex-dev/llms-txt` and is the recommended integration path. The lower-level `httpHandler(type)` method on the class-based client remains available for apps that need fine-grained control.

---

## HTTP handlers — ETag support

All three file handlers now implement ETag-based caching. The ETag is derived from `cachedFiles.generatedFromVersion` (the SHA-256 content hash), so it changes exactly when the file content changes.

```
Request:  GET /llms.txt
          If-None-Match: "a1b2c3d4..."

Response (content unchanged):
          HTTP/1.1 304 Not Modified
          ETag: "a1b2c3d4..."
          Cache-Control: public, max-age=3600

Response (content changed):
          HTTP/1.1 200 OK
          ETag: "e5f6a7b8..."
          Cache-Control: public, max-age=3600
          Content-Type: text/plain
          [file content]
```

Agents that implement HTTP caching (GPTBot, Applebot, most crawlers) benefit immediately. The ETag changes on every `regenerateAll` that produces new content, so agents always get fresh data when it matters.

---

## `sync` action for CI/CD

Learned from Stripe's `sync` action. Callable directly from CI/CD without the CLI binary installed.

```yaml
# .github/workflows/deploy.yml
- name: Deploy Convex
  run: npx convex deploy

- name: Sync llms-txt config
  run: npx convex run llmsTxt:sync --prod
  # Reads llms-txt.config.json from the repo root and applies it to the live deployment
```

Or from application code, useful for multi-environment setups:

```ts
import { action } from "./_generated/server";
import { llmsTxt } from "./llmsTxt";

export const syncFromConfig = action({
  args: {},
  handler: async (ctx) => {
    await llmsTxt.sync(ctx, {
      configPath: "./llms-txt.config.json",
    });
  },
});
```

---

## Demo apps — hosted on Convex via static-hosting

Both demo apps use `@convex-dev/static-hosting`. No Vercel account. No Netlify. The app lives at `https://your-deployment.convex.site`.

### Setup

```ts
// example-react/convex/convex.config.ts
import { defineApp } from "convex/server";
import llmsTxt from "@convex-dev/llms-txt/convex.config.js";
import crons from "@convex-dev/crons/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import staticHosting from "@convex-dev/static-hosting/convex.config.js";

const app = defineApp();
app.use(crons);
app.use(workpool);
app.use(llmsTxt);
app.use(staticHosting);
export default app;
```

```ts
// example-react/convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex-dev/llms-txt";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

const http = httpRouter();

// Mount all llms-txt routes
registerRoutes(http, components.llmsTxt, {
  onEvent: async (ctx, req, route) => {
    console.log(`Route hit: ${route}`);
  },
});

// Serve the React demo app at root — fallback to index.html for SPA routing
registerStaticRoutes(http, components.staticHosting, {
  pathPrefix: "/",
  spaFallback: true,
});

export default http;
```

```ts
// example-react/convex/staticHosting.ts
import { exposeUploadApi } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } =
  exposeUploadApi(components.staticHosting);
```

```json
// example-react/package.json
{
  "scripts": {
    "dev": "node setup.mjs && vite",
    "build": "vite build",
    "deploy": "npx @convex-dev/static-hosting deploy",
    "deploy:static": "npx @convex-dev/static-hosting upload --build --prod"
  }
}
```

**Deploy in one command:**

```bash
cd example-react
npm run deploy
# → Deploys Convex backend + uploads built React app
# → App live at https://your-deployment.convex.site
# → /llms.txt, /agents.md served from the same URL
```

### `<UpdateBanner />` in demo apps

```tsx
// example-react/src/App.tsx
import { UpdateBanner } from "@convex-dev/static-hosting/react";
import { api } from "../convex/_generated/api";

export default function App() {
  return (
    <div>
      <UpdateBanner
        getCurrentDeployment={api.staticHosting.getCurrentDeployment}
        message="New version of this demo available"
        buttonText="Refresh"
      />
      {/* rest of app */}
      <LlmsTxtWidget appUrl={import.meta.env.VITE_CONVEX_SITE_URL} />
    </div>
  );
}
```

When the developer deploys a new version of the demo, users already on the page see the banner. They click refresh. No manual reload required.

### SvelteKit demo

SvelteKit needs a different build setup because `static-hosting` works with Vite output. Use `@sveltejs/adapter-static`:

```ts
// example-svelte/svelte.config.js
import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter({ fallback: "index.html" }),
  },
};
```

```json
// example-svelte/package.json
{
  "scripts": {
    "dev": "node setup.mjs && vite dev",
    "build": "vite build",
    "deploy": "npx @convex-dev/static-hosting deploy",
    "deploy:static": "npx @convex-dev/static-hosting upload --build --prod"
  }
}
```

The Svelte demo builds to `dist/` (or `build/` with adapter-static configured), and `static-hosting` uploads that directory. SPA fallback handles all SvelteKit client-side routes.

---

## Backend spec

### Schema

**`settings` table** (single document)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `appName` | `string` | yes | | |
| `appUrl` | `string` | yes | | Base URL, no trailing slash |
| `description` | `string` | yes | | One-line summary for LLMs |
| `agentInstructions` | `string` | no | | Extra context in `agents.md` |
| `contactEmail` | `string` | no | | |
| `widgetPosition` | `"footer" \| "floating-bottom-right" \| "floating-bottom-left"` | yes | `"floating-bottom-right"` | |
| `theme` | `"light" \| "dark" \| "system"` | yes | `"system"` | |
| `testMode` | `boolean` | yes | `true` | When `true`, file endpoints only respond to localhost |
| `cronEnabled` | `boolean` | yes | `true` | |
| `cronIntervalHours` | `number` | yes | `24` | Runtime-changeable via `@convex-dev/crons` |
| `analyticsEnabled` | `boolean` | yes | `false` | |
| `analyticsRequestRetentionDays` | `number` | yes | `90` | |
| `analyticsThreshold` | `number` | no | | Triggers `onAnalyticsThreshold` callback |
| `aiDescriptionsEnabled` | `boolean` | yes | `false` | |
| `aiProvider` | `"claude" \| "openai"` | no | `"claude"` | |
| `fullTxtEnabled` | `boolean` | yes | `false` | |
| `permissiveMode` | `boolean` | yes | `false` | Skips analytics auth in dev |
| `versioningEnabled` | `boolean` | yes | `false` | Enables `pageVersions` table |
| `onGenerationComplete` | `string` | no | | Stored function handle |
| `onAnalyticsThreshold` | `string` | no | | Stored function handle |

**No secrets in this table.** All keys (`LLMS_ANALYTICS_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) are read from `process.env` at request time, never stored.

**`pages` table**

Indexes: `by_path`, `by_status_order`, `by_deleted`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | yes | |
| `path` | `string` | yes | Unique |
| `description` | `string` | yes | |
| `fullContent` | `string` | no | For `llms-full.txt`. Max 50,000 chars |
| `status` | `"draft" \| "published" \| "archived"` | yes | Default: `"published"` |
| `isOptional` | `boolean` | no | |
| `order` | `number` | no | |
| `descriptionGeneratedByAi` | `boolean` | no | |
| `deletedAt` | `number` | no | Soft-delete |

**`apiEndpoints` table**

Indexes: `by_method_path`, `by_status_group`, `by_deleted`

| Field | Type | Required | Notes |
|---|---|---|---|
| `method` | `string` | yes | |
| `path` | `string` | yes | |
| `description` | `string` | yes | |
| `group` | `string` | no | |
| `status` | `"draft" \| "published" \| "archived"` | yes | Default: `"published"` |
| `descriptionGeneratedByAi` | `boolean` | no | |
| `deletedAt` | `number` | no | |

**`cachedFiles` table**

Indexes: `by_file_type`, `by_status`

| Field | Type | Notes |
|---|---|---|
| `fileType` | `"llms.txt" \| "agents.md" \| "llms-full.txt"` | |
| `content` | `string` | Max 500KB |
| `generatedAt` | `number` | |
| `generatedFromVersion` | `string` | SHA-256 hash — doubles as ETag value |
| `previousContent` | `string` | For rollback |
| `previousGeneratedAt` | `number` | |
| `status` | `"current" \| "generating" \| "failed"` | Workpool job state |
| `lastJobId` | `string` | Workpool job ID |

**`agentRequests` table** (opt-in)

Indexes: `by_requested_at`, `by_agent_name_time`

| Field | Type | Notes |
|---|---|---|
| `fileType` | `"llms.txt" \| "agents.md" \| "llms-full.txt"` | |
| `requestedAt` | `number` | |
| `agentName` | `string` | Normalized |
| `rawUserAgent` | `string` | Truncated to 512 chars |
| `isKnownAgent` | `boolean` | |

**`pageVersions` table** (opt-in, `versioningEnabled: true`)

Indexes: `by_page_snapshot`

---

### Public functions

**Queries**

| Function | Returns | Notes |
|---|---|---|
| `content.getSettings` | `Settings \| null` | |
| `content.listPages` | `Page[]` | Published only by default |
| `content.listApiEndpoints` | `Endpoint[]` | Published only by default |
| `content.getCachedFile` | `CachedFile \| null` | |
| `content.getCacheStatus` | `CacheStatus` | |
| `content.getGenerationStatus` | `GenerationStatus` | Workpool job status by `CacheJobId` |
| `content.getPageVersions` | `PageVersion[]` | Requires `versioningEnabled` |
| `analytics.getSummary` | `AnalyticsSummary \| null` | |
| `analytics.getTimeSeries` | `TimeSeriesPoint[]` | |

**Mutations**

| Function | Notes |
|---|---|
| `content.upsertSettings` | Reschedules cron + registers callbacks on change |
| `content.upsertPage` | Upserts by path, snapshots to `pageVersions` if enabled |
| `content.deletePage` | Soft-delete |
| `content.restorePage` | Clears `deletedAt` |
| `content.publishPage` | Sets `status: "published"`, invalidates cache |
| `content.draftPage` | Sets `status: "draft"`, invalidates cache |
| `content.archivePage` | Sets `status: "archived"`, invalidates cache |
| `content.upsertEndpoint` | Upserts by `method + path` |
| `content.deleteEndpoint` | Soft-delete |
| `content.invalidateCache` | Returns `CacheJobId` for the queued regen job |
| `content.rollbackCache` | Restores `previousContent` |
| `analytics.recordRequest` | Internal, called by HTTP handlers |
| `analytics.cleanupOldRequests` | Deletes rows older than `olderThan` ms |
| `analytics.cleanupOrphanedCacheEntries` | Removes stale `cachedFiles` entries |

**Actions**

| Function | Notes |
|---|---|
| `content.regenerateAll` | Durable via workpool, idempotent hash check, calls `onGenerationComplete` |
| `content.generateDescriptions` | AI-fills empty descriptions, 100-item cap, 1 call/second |
| `content.sync` | Reads `llms-txt.config.json` and applies to live deployment. CI/CD callable |

---

## Installation flow

```bash
npm install @convex-dev/llms-txt @convex-dev/crons @convex-dev/workpool

# Interactive wizard — recommended for new projects
npx llms-txt setup
```

**`convex/convex.config.ts`**

```ts
import { defineApp } from "convex/server";
import llmsTxt from "@convex-dev/llms-txt/convex.config.js";
import crons from "@convex-dev/crons/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(crons);
app.use(workpool);
app.use(llmsTxt);
export default app;
```

**`convex/http.ts`**

```ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex-dev/llms-txt";
import { components, internal } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.llmsTxt, {
  onGenerationComplete: internal.myApp.handleGenerationComplete,
  onEvent: async (ctx, req, route) => {
    console.log(`[llms-txt] ${route} requested`);
  },
});

export default http;
```

**First run via `npx llms-txt setup`:**

```
$ npx llms-txt setup

✓ @convex-dev/llms-txt setup wizard

? App name: Acme Dashboard
? App URL (no trailing slash): https://acme.app
? One-line description for LLMs: A project management tool for small engineering teams.
? Enable analytics? (y/N): y
? Enable AI description generation? (y/N): y
? AI provider: claude

✓ Created llms-txt.config.json
✓ Synced config to Convex deployment
✓ Cron scheduled (every 24 hours)

Next steps:
  1. Add registerRoutes() to convex/http.ts (see above)
  2. Add <LlmsTxtWidget /> to your app
  3. Run: npx llms-txt go-live   (when ready for production)

Your files will be available at:
  https://your-deployment.convex.site/llms.txt
  https://your-deployment.convex.site/agents.md
```

**Add widget (React)**

```tsx
import { LlmsTxtWidget } from "@convex-dev/llms-txt/react";

<LlmsTxtWidget
  appUrl={import.meta.env.VITE_CONVEX_SITE_URL}
  position="floating-bottom-right"
  theme="dark"
/>
```

**Add widget (Svelte)**

```svelte
<script>
  import { LlmsTxtWidget } from "@convex-dev/llms-txt/svelte";
  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL;
</script>

<LlmsTxtWidget {appUrl} position="floating-bottom-right" theme="dark" />
```

---

## CLI spec

| Command | Description |
|---|---|
| `setup` | Interactive wizard — installs, configures, syncs, prints next steps |
| `sync` | Reads `llms-txt.config.json`, diffs, applies to Convex |
| `sync --dry-run` | Preview changes |
| `status` | Cache status, job status, `testMode` state |
| `regenerate` | Queues a `regenerateAll` workpool job, returns `CacheJobId` |
| `rollback --file llms.txt` | Restores previous cached content |
| `go-live` | Sets `testMode: false` with interactive confirmation |
| `generate-descriptions` | AI-fills empty descriptions |
| `generate-descriptions --force` | Overwrites existing |
| `publish-page --path /dashboard` | Sets draft to published |
| `draft-page --path /dashboard` | Sets published to draft |
| `archive-page --path /dashboard` | Archives |
| `restore-page --path /dashboard` | Restores soft-deleted |
| `analytics` | Prints agent request summary |
| `cleanup --older-than 7d` | Runs `cleanupOldRequests` |
| `versions --path /dashboard` | Shows page version history |

---

## `INTEGRATION.md`

Shipped in the repo root. Structured for AI consumption — no filler prose, machine-parseable headers, complete code for every integration path.

```markdown
# INTEGRATION.md
> For LLMs: This file contains complete integration instructions for @convex-dev/llms-txt.
> Follow sections in order. Each section is self-contained.

## SECTION: Installation
## SECTION: convex.config.ts setup
## SECTION: http.ts — registerRoutes
## SECTION: typed client setup
## SECTION: React widget
## SECTION: Svelte widget
## SECTION: CLI commands
## SECTION: static-hosting integration (demo apps)
## SECTION: testMode — going to production
## SECTION: environment variables
## SECTION: troubleshooting
```

---

## Security model

| Surface | Threat | Mitigation |
|---|---|---|
| `/llms.txt`, `/agents.md`, `/llms-full.txt` | Serving while unconfigured | `testMode: true` default — returns `403` to non-localhost until disabled |
| `/llms-analytics` | Public access | `Authorization: Bearer` via `LLMS_ANALYTICS_SECRET` env var |
| `/llms-status` | Exposes metadata | Public but limited to timestamps and hashes — no content |
| `permissiveMode` | Bypasses analytics auth | Throws at startup if `NODE_ENV === "production"` and `permissiveMode: true` |
| `process.env` secrets | Key rotation | All secrets are env vars — rotate by updating the deployment variable |
| `generateDescriptions` | Unbounded LLM spend | 100-item cap, 1 call/second, opt-in, never automatic |
| `agentRequests` | PII | No IPs, User-Agent truncated at 512 chars |
| `cachedFiles` | Oversized response | 500KB cap at write, `413` returned if exceeded |
| `registerRoutes` upload | Unauthorized uploads | Upload functions are internal — require `npx convex run` auth |
| ETag | Cache poisoning | ETag derived from SHA-256 content hash — cannot be spoofed |

---

## Widget spec

### HUMAN / MACHINE toggle

Terminal aesthetic. Dark, monospace, high contrast.

| Property | Value |
|---|---|
| Panel background | `#1a1a1a` |
| Toggle container | `#111111` |
| Active tab bg | `#2a2a2a` |
| Active tab text | `#e5e5e5`, weight 600 |
| Inactive tab text | `#666666` |
| Border | `1px solid #333333` |
| Font | `'Courier New', Courier, monospace` |
| Letter spacing | `0.1em` |
| Toggle height | `40px` |
| Tab min-width | `100px` |
| Panel width | `280px` |
| Border radius | `4px` |
| Transition | `background 120ms ease` |

**MACHINE tab content**
- `testMode` badge with link to docs when active
- Version staleness indicator — "Content updated — refresh" when `generatedFromVersion` changes while panel is open (same pattern as `static-hosting`'s `UpdateBanner`)
- Link to `/llms.txt`, `/agents.md`, `/llms-full.txt` (if enabled), `/llms-status`
- Last-generated timestamp from `useLlmsTxtStatus()` live subscription
- Generation job status: "Generating..." when `cachedFiles.status === "generating"`
- Copy-to-clipboard for each URL
- Draft pages badge if drafts exist

### CSS custom properties

```css
--llms-txt-bg: #1a1a1a;
--llms-txt-panel-border: #333333;
--llms-txt-text-active: #e5e5e5;
--llms-txt-text-inactive: #666666;
--llms-txt-tab-active-bg: #2a2a2a;
--llms-txt-accent: #ffffff;
--llms-txt-font: 'Courier New', Courier, monospace;
--llms-txt-radius: 4px;
```

---

## Demo apps

### Demo 1: React (Vite + React) — hosted on Convex

Location: `/example-react`

```bash
cd example-react
npm install
npm run deploy   # Deploys backend + React app to Convex static hosting
```

App lives at `https://your-deployment.convex.site`.
All routes — `/`, `/settings`, `/analytics`, `/llms.txt`, `/agents.md` — served from the same domain.

Demonstrates:
- `npx llms-txt setup` wizard output walkthrough (README section)
- `registerRoutes()` with `onEvent` logging
- `testMode` badge in widget, `npx llms-txt go-live` flow
- Typed client via `createTypedLlmsTxtClient()`
- Workpool-backed generation with live job status
- `onGenerationComplete` callback wired to an in-app toast
- ETag visible in the network tab (documented in README)
- `<UpdateBanner />` from `static-hosting`
- All three files accessible at their routes
- Settings panel: draft/publish/archive, rollback, version history, cleanup
- Analytics dashboard

### Demo 2: SvelteKit — hosted on Convex

Location: `/example-svelte`

Uses `@sveltejs/adapter-static` + `@convex-dev/static-hosting`. Same deploy pattern.

```bash
cd example-svelte
npm install
npm run deploy
```

Demonstrates:
- Same `registerRoutes()` wiring
- Svelte widget with `createLlmsTxtStatusStore()`
- Version staleness detection using the store
- `/settings` SvelteKit route with live add/remove forms
- Real-time publish/draft visible in the MACHINE tab
- `UpdateBanner` equivalent via a Svelte-native subscription

Both demos share one Convex deployment. Running `npm run deploy` from either directory pushes the same backend and a different frontend. The cross-framework real-time sync is visible by opening both apps simultaneously.

---

## File output formats

### `llms.txt`
```
# Acme Dashboard

> A project management tool for small engineering teams.

## Pages
- [Dashboard](https://acme.app/dashboard): Overview of all active projects.
- [Projects](https://acme.app/projects): Browse and filter all projects.

## Optional
- [Changelog](https://acme.app/changelog): Recent product updates.
```

### `agents.md`
```
# Agent instructions for Acme Dashboard

Use the REST API. Auth via Bearer token.

## Available API endpoints

### Projects
- `GET /api/projects`: List all projects.
- `POST /api/projects`: Create a new project.
```

---

## Milestones

| Milestone | Scope |
|---|---|
| M1: Core component | Schema with indexes, queries, mutations, HTTP handlers, class client |
| M2: `registerRoutes()` | Single-call route registration, per-route handlers, `onEvent`, `routes` map |
| M3: ETag support | `generatedFromVersion` as ETag, `304 Not Modified` on match |
| M4: `testMode` | Default `true`, origin check, `403` response, `go-live` CLI |
| M5: Workpool | `@convex-dev/workpool`, `maxParallelism: 1`, job status tracking |
| M6: Dynamic cron | `@convex-dev/crons`, runtime interval updates, cleanup step |
| M7: Typed client factory | `createTypedLlmsTxtClient()` |
| M8: Content status | `draft`/`published`/`archived`, soft-delete, restore |
| M9: Event callbacks | `onGenerationComplete`, `onAnalyticsThreshold` in `registerRoutes` |
| M10: Data retention | `cleanupOldRequests`, `cleanupOrphanedCacheEntries`, retention cron |
| M11: `setup.mjs` | First-run script, idempotent |
| M12: `npx llms-txt setup` | Interactive wizard, full onboarding in one command |
| M13: `permissiveMode` | Dev/prod distinction, startup guard |
| M14: Cache rollback | `previousContent`, `rollbackCache`, `CacheJobId` |
| M15: Analytics | `agentRequests`, analytics handler, agent taxonomy, threshold callback |
| M16: React widget + hook | HUMAN/MACHINE toggle, `testMode` badge, staleness detection, `useLlmsTxtStatus()` |
| M17: Svelte widget + store | Svelte widget, `createLlmsTxtStatusStore()` |
| M18: `sync` action | CI/CD callable, reads `llms-txt.config.json` |
| M19: CLI | All commands |
| M20: AI descriptions | `generateDescriptions`, Claude + OpenAI |
| M21: `llms-full.txt` | `fullContent`, handler, 500KB cap, CDN redirect option |
| M22: Auto-discovery | Router wrapper, route interception |
| M23: `/llms-status` | Public lightweight status JSON |
| M24: `pageVersions` | Opt-in version history, 90-day trim |
| M25: `INTEGRATION.md` | LLM-optimized, complete code for every path |
| M26: Dashboard docs | README section on component tables |
| M27: React demo (static-hosted) | `/example-react` on `@convex-dev/static-hosting` |
| M28: Svelte demo (static-hosted) | `/example-svelte` on `@convex-dev/static-hosting` |
| M29: Tests | Full `convex-test` coverage |
| M30: Publish | npm, Convex components directory, `PUBLISHING.md` |

---

## Community widgets

`CONTRIBUTING.md` documents the widget contract: props interface, `useLlmsTxtStatus()` shape, CSS custom properties, `testMode` badge pattern, and the `registerRoutes` extension points. Community contributors build Vue, Solid, or Angular widgets as separate packages without coordination from the core team.
