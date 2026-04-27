# Install @waynesutton/agent-ready

The install guide now lives in the repo README so new developers, vibe coders, and full-stack teams all start from one clear source.

Use the main guide:

- [README install guide](../README.md#install)
- [GitHub README install guide](https://github.com/waynesutton/agent-ready-component#install)

## Fast path

Install the package:

```bash
npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
```

Register the component in `convex/convex.config.ts`, mount the routes in `convex/http.ts`, add the React or Svelte widget, then run:

```bash
npx agent-ready setup
```

Verify locally:

```bash
npx convex dev
npm run dev
curl -i http://127.0.0.1:3210/llms.txt
npx agent-ready status
```

Deploy and go live:

```bash
npx convex deploy
npx agent-ready sync --prod
npx agent-ready regenerate --prod
npx agent-ready go-live --prod
```

The full step-by-step version is in [`README.md`](../README.md#install).
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

Use `appUrl` for the Convex endpoint URL (`*.convex.site`) and `publicAppUrl` for your production domain. The widget shows `publicAppUrl` in copy links and AI chat prompts so users do not see your internal Convex deployment URL.

### Widget options

| Prop | Type | Default |
|---|---|---|
| `appUrl` | `string` | required. Endpoint base used to fetch `/llms-status` and `/llms-readiness`. |
| `publicAppUrl` | `string \| undefined` | optional. Visible base used for copy links and AI chat prompts. Falls back to `status.appUrl`, then `window.location.origin`, then `appUrl`. |
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
- Optional widget install guide: pick React or Svelte, pick mount location (root, footer, or header), then copy the printed snippet

It writes `agent-ready.config.json` and syncs it to your Convex deployment.

## 6. Verify locally

Start the Convex dev server and your frontend in two terminals:

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

Then sync your config and generate fresh files against production:

```bash
npx agent-ready sync --prod
npx agent-ready regenerate --prod
```

## 8. Go live

`testMode` blocks public access until you are ready. When you are ready to make your files publicly accessible, run go-live against production:

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

Add `--prod` to any command to target your production deployment instead of your dev deployment. For example: `npx agent-ready go-live --prod`, `npx agent-ready status --prod`, `npx agent-ready scan --url https://your-deployment.convex.site --prod`.

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
| GitHub login returns but admin access is still blocked | Check `SITE_URL`, the Convex callback URL, root auth initialization, `state.isAuthenticated`, and `ADMIN_EMAILS`. |
| Settings opens then `getCacheStatus` throws | Update the app-facing `convex/agentReady/content.ts` return validator to match the component return shape. |
| `Path '/sitemap.xml' for method GET already in use` | Your app already defines that route. Add `skipRoutes: ["/sitemap.xml"]` to `registerRoutes` options. Same fix for `/robots.txt`. |

## Example apps

The repo includes two working Convex demo apps:

- `example-react` (React + Vite with the React widget)
- `example-svelte` (SvelteKit with the Svelte widget)

Each demo shows how to register the Convex component, mount the widget, wire static hosting, seed content, and serve live discovery files.

Both demos use GitHub OAuth for the settings and analytics pages. Create a GitHub OAuth app with this callback URL shape:

```text
https://your-deployment.convex.site/api/auth/callback/github
```

The callback URL points to Convex, not the local frontend. For local React dev, use `http://localhost:5173` as the GitHub Homepage URL and as the Convex Auth `SITE_URL` value:

```bash
npx convex env set AUTH_GITHUB_ID "your-github-client-id"
npx convex env set AUTH_GITHUB_SECRET "your-github-client-secret"
npx convex env set SITE_URL "http://localhost:5173"
npx convex env set ADMIN_EMAILS "your-email@example.com"
```

For production, set the same variables with `--prod` and set `SITE_URL` to the deployed frontend URL:

```bash
npx convex env set SITE_URL "https://your-deployment.convex.site" --prod
```

If GitHub redirects back but the page still says "Admin access required", check that the React demo initializes the auth client at the app root and that `AuthGate` reads `state.isAuthenticated`. If auth works but settings throws a Convex server error, check that `convex/agentReady/content.ts` return validators match the component `getCacheStatus` return shape.
