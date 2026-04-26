# Install @waynesutton/agent-ready in your Convex app

`@waynesutton/agent-ready` is a [Convex component](https://docs.convex.dev/components) that generates, caches, and serves `llms.txt`, `agents.md`, and `llms-full.txt` from your Convex backend. It ships with drop-in React and Svelte widgets that show humans and AI agents the same discovery files.

This guide is for developers adding the component to an existing Convex React or Svelte app. If you are publishing the package itself, use `SETUP.md` instead.

## Before you start

You need:

- An existing Convex app with `convex/convex.config.ts` (React + Vite or SvelteKit)
- Node 20 or newer
- Convex CLI 1.36 or newer
- A public app URL for the generated files

## 1. Install the package

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

If you want Convex to host your frontend too:

```bash
npm install @convex-dev/static-hosting
```

## 2. Register the Convex component

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

If you are using Convex static hosting, add it in the same file:

```ts
import staticHosting from "@convex-dev/static-hosting/convex.config.js";

app.use(staticHosting);
```

## 3. Mount the HTTP routes

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.agentReady);

export default http;
```

Default routes:

- `/llms.txt`
- `/agents.md`
- `/llms-full.txt`
- `/llms-status`
- `/llms-analytics`
- `/robots.txt` (opt-in)
- `/sitemap.xml` (opt-in)
- `/.well-known/agent-skills` (opt-in)
- `/llms-readiness` (opt-in)

You can customize route behavior when you register the routes:

```ts
registerRoutes(http, components.agentReady, {
  llmsTxtPath: "/llms.txt",
  onEvent: async (ctx, req, route) => {
    console.log(`[agent-ready] ${route} requested`);
  },
});
```

## 4. Add the widget to your frontend

The component ships React and Svelte widgets you can drop into your app. The widget reads status from your Convex deployment and renders HUMAN, MACHINE, and SCORE tabs.

React:

```tsx
import { AgentReadyWidget, UpdateBanner } from "@waynesutton/agent-ready/react";

export default function App() {
  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;

  return (
    <>
      <UpdateBanner appUrl={appUrl} />
      <AgentReadyWidget appUrl={appUrl} position="floating-bottom-right" theme="dark" />
    </>
  );
}
```

Svelte:

```svelte
<script lang="ts">
  import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";

  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
</script>

<AgentReadyWidget {appUrl} position="floating-bottom-right" theme="dark" />
```

### Widget options

| Prop | Type | Default |
|---|---|---|
| `position` | `"footer" \| "floating-bottom-right" \| "floating-bottom-left" \| "floating-center"` | `"floating-bottom-right"` |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` |
| `showTestModeBadge` | `boolean` | `true` |
| `showStatus` | `boolean` | config value |
| `showFiles` | `boolean` | config value |
| `showAppName` | `boolean` | config value |
| `showDescription` | `boolean` | config value |
| `showMeta` | `boolean` | config value |
| `showScoreTab` | `boolean` | config value |
| `colors` | `Partial<WidgetColors>` | `{}` |

All `show*` props are optional. When omitted, the widget reads the matching `widgetShow*` value from your `agent-ready.config.json` (via the `/llms-status` endpoint). Change the config, run `npx agent-ready sync`, and the widget updates without code changes. The SCORE tab defaults to hidden. Set `widgetShowScoreTab: true` in your config or pass `showScoreTab={true}` as a prop to enable it.

Set `colors` to match your site palette:

```tsx
<AgentReadyWidget
  appUrl={appUrl}
  colors={{ bg: "#0d1117", border: "#30363d", accent: "#58a6ff" }}
/>
```

The HUMAN tab shows file URLs with copy buttons and "Open in ChatGPT / Claude / Perplexity" links. The MACHINE tab shows file links with open-in-new-tab icons and optional status metadata.

## 5. Run the setup wizard

```bash
npx agent-ready setup
```

The wizard asks for:

- App name
- Public URL
- Short description
- Cron interval in hours
- Analytics preference
- AI description preference: `claude`, `openai`, or `off`
- Test mode preference

It writes `agent-ready.config.json` and syncs it to your Convex deployment.

## 6. Verify locally

Run Convex and your frontend together:

```bash
npx convex dev --start 'vite'
```

Or run them separately:

```bash
npx convex dev
vite
```

Verify the component:

```bash
curl -i http://127.0.0.1:3210/llms.txt
npx agent-ready status
```

Open your app. The widget should show `HUMAN` and `MACHINE` tabs plus a `TEST MODE` badge.

## 7. Deploy

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

Then generate fresh files:

```bash
npx agent-ready sync
npx agent-ready regenerate
```

## 8. Go live

`testMode` blocks public access until you are ready.

```bash
npx agent-ready go-live
```

Verify the public files:

```bash
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/agents.md
curl -i https://your-deployment.convex.site/llms-status
```

Expect `200 OK`.

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

Add `--prod` to any command to target your production deployment.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/llms.txt` returns `403` | You are still in test mode. Run `npx agent-ready go-live`. |
| `/llms.txt` returns `503 "not configured"` | No settings row exists. Run `npx agent-ready setup` or `npx agent-ready sync`. |
| `/llms.txt` returns `503 "not generated yet"` | No cached content exists. Run `npx agent-ready regenerate`. |
| ETag never changes after edits | Run `npx agent-ready sync`, then `npx agent-ready regenerate`. |
| Widget shows `offline` | Check that `registerRoutes` is wired in `convex/http.ts`. |
| UpdateBanner never appears | Make a real content edit, then run `npx agent-ready sync` or `npx agent-ready regenerate`. |
| AI descriptions throw `aiDescriptionsEnabled is false` | Enable AI descriptions in settings, sync, then rerun `generate-descriptions`. |

## Example apps

The repo includes two working Convex demo apps:

- `example-react` (React + Vite with the React widget)
- `example-svelte` (SvelteKit with the Svelte widget)

Each demo shows how to register the Convex component, mount the widget, wire static hosting, seed content, and serve live discovery files.
