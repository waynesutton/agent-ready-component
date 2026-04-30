# RSS feed generator

Created: 2026-04-30 17:42 UTC
Last Updated: 2026-04-30 17:42 UTC
Status: In Progress

## Problem

The component generates `llms.txt`, `agents.md`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, and `agent-skills.json` from the same pages and settings data. RSS is the one remaining standard web discovery format that AI crawlers, feed readers, and aggregators look for. Apps that want full discoverability have to hand-roll their own RSS feed or skip it entirely.

## Proposed solution

Add an opt-in `/feed.xml` route that generates an RSS 2.0 XML feed from the existing pages table and settings. The feature follows the same pattern as `sitemapEnabled` and `agentSkillsEnabled`: a boolean flag in settings, a render function in generation.ts, a cached file entry, an HTTP route, a CLI setup prompt, and a readiness check.

## Files to change

### Component source

- `src/component/schema.ts`: Add `"rss.xml"` to the `fileType` union, add `rssEnabled` optional boolean to settings
- `src/component/generation.ts`: New `renderRssFeed()` function, conditional push in `runGeneration`, expand `CachedResult` type
- `src/component/content.ts`: Return `rssEnabled` from `getCacheStatus`
- `src/component/contentInternal.ts`: Handle `rssEnabled` in `applySyncConfig`
- `src/component/validators.ts`: Add `"rss.xml"` to file type validators if used there
- `src/component/lib.ts`: Add `escapeXmlContent` if needed (reuse `escapeXml`)

### Client

- `src/client/types.ts`: Add `"rss.xml"` to `AgentReadyFileType`, `rssEnabled` to `AgentReadySettings` and `AgentReadyStatus`, `/feed.xml` to `SkippableRoute` and `RouteName`
- `src/client/index.ts`: Register `/feed.xml` route in `registerRoutes`, add to route name mapping

### CLI

- `cli/commands/setup.mjs`: Add `rssEnabled` confirm prompt after `sitemapEnabled`
- `cli/commands/agent-ready.mjs`: Enable `rssEnabled` flag
- `cli/commands/scan.mjs`: Check `/feed.xml` endpoint
- `cli/commands/links.mjs`: Print `/feed.xml` URL

### Widgets

- `src/react/AgentReadyWidget.tsx`: Show RSS link in MACHINE tab when enabled
- `src/svelte/AgentReadyWidget.svelte`: Same

### Examples

- `example-react/agent-ready.config.json`: Add `rssEnabled: true`
- `example-svelte/agent-ready.config.json`: Add `rssEnabled: true`
- `example-react/convex/agentReady/content.ts`: Add `rssEnabled` to `cacheStatusValidator`
- `example-svelte/convex/agentReady/content.ts`: Same

### Readiness

- Readiness endpoint in `src/client/index.ts`: Add bonus check for `/feed.xml` presence

## RSS 2.0 output format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{appName}</title>
    <link>{appUrl}</link>
    <description>{description}</description>
    <atom:link href="{appUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <item>
      <title>{page.title}</title>
      <link>{appUrl}{page.path}</link>
      <description>{page.description}</description>
      <guid isPermaLink="true">{appUrl}{page.path}</guid>
    </item>
  </channel>
</rss>
```

## Edge cases

- No pages: render a valid RSS feed with zero items (channel only)
- XML escaping: reuse `escapeXml` from `lib.ts` for title, description, URLs
- Route conflict: detect existing `/feed.xml` in `convex/http.ts` during setup
- Readiness check: bonus points only, not required for 100/100 on existing installs without RSS enabled

## Verification steps

- `npm run typecheck` passes
- `npm run build` succeeds
- `node --check` on all CLI files
- `npx convex codegen --component-dir ./src/component`
- Curl `/feed.xml` returns valid RSS 2.0 XML
- `npx agent-ready scan` includes `/feed.xml` check
- `npx agent-ready links` prints `/feed.xml` URL
- Widget MACHINE tab shows RSS link when enabled
