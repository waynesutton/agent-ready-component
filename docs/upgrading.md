# What's new in 0.3.0 and how to upgrade

This guide covers what changed between 0.2.x and 0.3.0, what stays compatible, and the one thing you need to check after upgrading.

The short version: your existing install keeps working. Draft installs stay draft. Live installs stay live. Your config file, env vars, widget props, and public routes all keep their old behavior. The only upgrade task is a small edit to the Convex wrapper file the setup wizard scaffolded into your app, and the CLI now tells you exactly what to change.

## What's new in 0.3.0

Simple mode first. A fresh install serves `/llms.txt`, `/agents.md`, and a per-site markdown file the moment you register the component and mount the routes. No config file, no wizard, no go-live step.

- **Live by default.** New installs publish immediately. The old `testMode` gate became an opt-in `publish: "draft"` setting. `npx agent-ready go-live` still flips a draft install live.
- **Per-site markdown file.** A new route at `/{your-app-slug}.md` (fallback `/site.md`) serves a markdown summary of your site with ETag caching.
- **Markdown site viewer.** Opt-in `/markdown` pages that browsers see as HTML and agents can request as raw markdown through `Accept: text/markdown` content negotiation.
- **Always-on discovery header.** Every component response now includes `Link: </llms.txt>; rel="describedby"; type="text/markdown"` (RFC 8288).
- **AgentLinks footer.** A small React and Svelte component that renders muted `llms.txt` and site markdown links and injects the `<link rel="alternate">` head tag.
- **Expo widget.** `@waynesutton/agent-ready/expo` brings the widget to React Native apps.
- **MARKDOWN widget tab.** React and Svelte widgets list the markdown site and per-page links.
- **Shared wrapper validator.** `cacheStatusValidator` is now exported from the package root so your Convex wrapper functions never go stale again (see below).

## 0.2.x vs 0.3.0 comparison

| Behavior | 0.2.x | 0.3.0 |
| --- | --- | --- |
| First install | Blocked by `testMode: true` until `go-live` | Live immediately, `publish: "draft"` is the opt-in gate |
| Draft gating response | 403 | 404, so unpublished sites do not advertise the component |
| Publish setting | `testMode: boolean` | `publish: "live" \| "draft"` (`testMode` still works as a deprecated alias) |
| `llms-full.txt` for new installs | Enabled by wizard default | Off by default, one flag to enable |
| Per-site markdown file | Not available | `/{app-slug}.md` or `/site.md`, on by default |
| `/markdown` HTML and markdown twins | Not available | Opt-in with `markdownSiteEnabled` |
| Discovery `Link` header | Opt-in via `discoveryHeaders` | Base `describedby` link always on, richer links still opt-in |
| Widgets | React, Svelte | React, Svelte, Expo, plus `AgentLinks` footer |
| Wrapper validators | Inlined copy frozen at scaffold time | Import `cacheStatusValidator` from the package |

## What stays backward compatible

Everything below was verified against the 0.3.0 code paths. Upgrading the npm package and deploying does not change any of it.

- **Draft installs stay draft.** `testMode: true` in your settings or config resolves to `publish: "draft"`. The component checks the deprecated alias everywhere it checks `publish`, and every write keeps the two fields in sync.
- **Live installs stay live.** `testMode: false` resolves to `publish: "live"`.
- **Your config file keeps working.** Old `agent-ready.config.json` files with `testMode` sync correctly. The legacy `llms-txt.config.json` filename still loads.
- **Stored settings keep their values.** The `fullTxtEnabled` default flip only affects new installs. Your stored value wins.
- **Public routes are unchanged.** `/llms.txt`, `/agents.md`, `/llms-full.txt`, `/llms-status`, `/llms-analytics` keep their paths and response shapes. `/llms-status` still includes `testMode` so older widgets keep working.
- **Env var renames still fall back.** `LLMS_ANALYTICS_SECRET` and `LLMS_READINESS_SECRET` resolve when the new `AGENT_READY_*` names are unset.
- **Old widgets work against the new backend.** The status payload carries both `publish` and the `testMode` mirror.

## Upgrade steps

```bash
npm install @waynesutton/agent-ready@latest
npx convex dev
```

Then run a sync. The CLI checks your scaffolded wrapper file and warns if it needs the fix below:

```bash
npx agent-ready sync
```

Deploy to production the same way you always have:

```bash
npx convex deploy
npx agent-ready sync --prod
npx agent-ready regenerate --prod
```

## The one required fix: wrapper validators

If you ran `npx agent-ready setup` on 0.2.x, the wizard scaffolded `convex/agentReady/content.ts` into your app with an inlined `cacheStatusValidator`. The component's `getCacheStatus` now returns new fields (`publish`, `siteSlug`, the markdown settings, and more), so that frozen copy throws `ReturnsValidationError` the first time your settings panel or widget wrapper calls it.

Fix it once and it never happens again. Replace the inlined block with the package export:

```ts
// convex/agentReady/content.ts
import { cacheStatusValidator } from "@waynesutton/agent-ready";

export const getCacheStatus = query({
  args: {},
  returns: cacheStatusValidator,
  handler: async (ctx) => {
    return await ctx.runQuery(components.agentReady.content.getCacheStatus, {});
  },
});
```

Delete the local `const cacheStatusValidator = v.object({ ... })` block. The imported validator ships with the component, so future upgrades that add fields update both sides in the same deploy.

`npx agent-ready sync` and `npx agent-ready setup` both detect stale wrappers and print the exact missing fields if you prefer to patch the inline copy instead.

## New routes and how to opt out

0.3.0 registers one new route by default: the per-site markdown file. The path resolves from the `siteMdPath` option on `registerRoutes`, then the `AGENT_READY_SITE_SLUG` env var, then `/site.md`. It is collision-guarded against the component's other paths.

If your app already owns that path, or you do not want the route:

```ts
registerRoutes(http, components.agentReady, { siteMdPath: false });
```

The opt-in `/markdown` viewer only mounts when you call `registerMarkdownRoutes` yourself, so nothing changes there unless you add it.

## Deprecations

`testMode` is deprecated in favor of `publish`. It keeps working: `testMode: true` maps to `publish: "draft"` and the fields stay in sync on every patch and sync. Move your config to `publish` when convenient:

```json
{
  "settings": {
    "publish": "live"
  }
}
```

## Verify the upgrade

```bash
npx agent-ready status
curl -i https://your-deployment.convex.site/llms.txt
curl -i https://your-deployment.convex.site/llms-status
```

`status` prints the publish state first. If you were live before the upgrade, expect `publish: live` and `200 OK` on both curls. If you were in test mode, expect `publish: draft` and `404` on public routes until you run `npx agent-ready go-live`.
