// Interactive first-run wizard. Writes agent-ready.config.json, scaffolds Convex
// wrapper files, syncs config to the deployment, and prints next steps.
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prompt, confirm, choose } from "../lib/prompts.mjs";
import { checkWrapperFreshness, printWrapperWarning } from "../lib/wrappers.mjs";
import { convexRun, formatError } from "../lib/convex.mjs";
import { printCliBanner } from "../lib/banner.mjs";

// Scan convex/http.ts for route paths that would conflict with agent-ready.
async function detectExistingRoutes(httpTsPath) {
  const empty = {
    sitemap: false,
    robots: false,
    llmsTxt: false,
    agentsMd: false,
    llmsFullTxt: false,
    agentSkills: false,
  };
  if (!existsSync(httpTsPath)) return empty;
  try {
    const src = await readFile(httpTsPath, "utf8");
    return {
      sitemap: /["'`]\/sitemap\.xml["'`]/.test(src),
      robots: /["'`]\/robots\.txt["'`]/.test(src),
      llmsTxt: /["'`]\/llms\.txt["'`]/.test(src),
      agentsMd: /["'`]\/agents\.md["'`]/.test(src),
      llmsFullTxt: /["'`]\/llms-full\.txt["'`]/.test(src),
      agentSkills: /["'`]\/\.well-known\/agent-skills["'`]/.test(src),
    };
  } catch {
    return empty;
  }
}

// Inspect convex/convex.config.ts for static hosting and the httpPrefix trap.
// static-hosting 0.2 suggests defineApp({ httpPrefix: "/api" }), which moves
// every app HTTP route (including /llms.txt) under /api where scanners never look.
async function detectConvexConfig() {
  const result = { hasStaticHosting: false, hasHttpPrefix: false };
  const candidates = [
    path.join(process.cwd(), "convex", "convex.config.ts"),
    path.join(process.cwd(), "convex", "convex.config.js"),
  ];
  for (const configFile of candidates) {
    if (!existsSync(configFile)) continue;
    try {
      const src = await readFile(configFile, "utf8");
      if (/@convex-dev\/static-hosting/.test(src)) result.hasStaticHosting = true;
      if (/httpPrefix/.test(src)) result.hasHttpPrefix = true;
    } catch {
      // unreadable config, skip detection
    }
  }
  return result;
}

function printStaticHostingGuidance({ hasStaticHosting, hasHttpPrefix }) {
  if (!hasStaticHosting && !hasHttpPrefix) return;
  console.log("");
  if (hasHttpPrefix) {
    console.log("WARNING: convex.config.ts sets httpPrefix.");
    console.log("  httpPrefix moves every convex/http.ts route (including /llms.txt and");
    console.log("  /robots.txt) under that prefix. Agent scanners only look at root paths,");
    console.log("  so discovery files become invisible. Remove httpPrefix and use app-owned");
    console.log("  root routing instead:");
  } else {
    console.log("Detected @convex-dev/static-hosting. Required pairing with agent-ready:");
    console.log("  app-owned root routing, no httpPrefix. Register agent-ready routes first,");
    console.log("  then the static catch-all:");
  }
  console.log("");
  console.log("    // convex/convex.config.ts: no httpPrefix");
  console.log("    // convex/http.ts mount order:");
  console.log("    registerRoutes(http, components.agentReady);");
  console.log("    registerMarkdownRoutes(http, components.agentReady);");
  console.log("    registerStaticRoutes(http, components.staticHosting, { spaFallback: true });");
  console.log("");
  console.log("  Exact paths with extensions (/llms.txt, /robots.txt) win over the SPA");
  console.log("  fallback, so client routing keeps working.");
}

// Detect local static discovery files. We only flag these as "local files detected"
// because not every Convex app uses Convex static hosting. Many apps host their
// frontend on Vercel, Netlify, or Cloudflare Pages. Static files in `public/` may
// or may not be served at the same origin as the Convex HTTP routes.
function detectStaticFiles() {
  const cwd = process.cwd();
  return {
    llmsTxt: existsSync(path.join(cwd, "public", "llms.txt")),
    agentsMd: existsSync(path.join(cwd, "public", "agents.md")),
    llmsFullTxt: existsSync(path.join(cwd, "public", "llms-full.txt")),
    robotsTxt: existsSync(path.join(cwd, "public", "robots.txt")),
    sitemapXml: existsSync(path.join(cwd, "public", "sitemap.xml")),
  };
}

// Convex wrapper that exposes component functions to browser clients.
const CONTENT_WRAPPER = `import { action, mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
// Shared return validator for getCacheStatus. Imported from the package so
// it stays in sync with the component when upgrades add fields.
import { cacheStatusValidator } from "@waynesutton/agent-ready";

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
  section: v.optional(v.string()),
  descriptionGeneratedByAi: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
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
`;

const ANALYTICS_WRAPPER = `import { query } from "../_generated/server";
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
`;

const WIDGET_FRAMEWORKS = ["react", "svelte"];
const WIDGET_MOUNT_LOCATIONS = ["root", "footer", "header"];

function resolveWidgetPosition(mountLocation) {
  return mountLocation === "footer" ? "footer" : "floating-bottom-right";
}

function formatMountLocation(mountLocation) {
  if (mountLocation === "root") return "root app layout";
  return mountLocation;
}

function rootLayoutFile(framework) {
  return framework === "svelte" ? "src/routes/+layout.svelte" : "src/App.tsx";
}

function widgetInstallSnippet(framework, widgetPosition) {
  if (framework === "svelte") {
    return `<script lang="ts">
  import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";

  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
</script>

<AgentReadyWidget {appUrl} position="${widgetPosition}" theme="dark" />`;
  }

  return `import { AgentReadyWidget, UpdateBanner } from "@waynesutton/agent-ready/react";

export default function App() {
  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;

  return (
    <>
      <UpdateBanner appUrl={appUrl} />
      <AgentReadyWidget appUrl={appUrl} position="${widgetPosition}" theme="dark" />
    </>
  );
}`;
}

function printWidgetInstallGuide({ framework, mountLocation, widgetPosition }) {
  const rootFile = rootLayoutFile(framework);
  console.log("");
  console.log("Widget install:");
  console.log(`  Best default: root app layout. You picked: ${formatMountLocation(mountLocation)}.`);
  console.log("  Add it once so the widget follows every page without duplicating.");
  console.log("");
  console.log(`Open ${rootFile} in your editor and paste the snippet below.`);
  console.log(`  Or copy this whole block (file path + snippet) into Cursor, Claude, or any AI agent and ask it to add the widget to your root layout at ${rootFile}.`);
  console.log("");
  console.log(`File: ${rootFile}`);
  console.log("");
  console.log(widgetInstallSnippet(framework, widgetPosition));
}

async function scaffoldWrappers() {
  const convexDir = path.join(process.cwd(), "convex", "agentReady");
  const contentPath = path.join(convexDir, "content.ts");
  const analyticsPath = path.join(convexDir, "analytics.ts");

  if (existsSync(contentPath) && existsSync(analyticsPath)) {
    console.log("[setup] Convex wrappers already exist at convex/agentReady/. Skipping scaffold.");
    // Wrappers scaffolded by an older version can have a stale inline
    // getCacheStatus validator that throws after upgrading. Warn with the fix.
    const staleness = await checkWrapperFreshness();
    if (staleness) printWrapperWarning(staleness);
    return false;
  }

  if (!existsSync(convexDir)) {
    await mkdir(convexDir, { recursive: true });
  }

  let wrote = false;
  if (!existsSync(contentPath)) {
    await writeFile(contentPath, CONTENT_WRAPPER);
    console.log("  Created convex/agentReady/content.ts");
    wrote = true;
  }
  if (!existsSync(analyticsPath)) {
    await writeFile(analyticsPath, ANALYTICS_WRAPPER);
    console.log("  Created convex/agentReady/analytics.ts");
    wrote = true;
  }
  return wrote;
}

export async function setup(_args) {
  console.log("");
  printCliBanner();
  console.log("@waynesutton/agent-ready setup wizard");
  console.log("");

  const appName = await prompt("App name", "My App");
  let appUrl = await prompt("App URL (no trailing slash)", "https://example.com");
  // Normalize: strip trailing slashes so generated links never get double-slashed.
  appUrl = appUrl.replace(/\/+$/, "");

  // If the entered URL looks like a Convex deployment URL, ask about a custom domain.
  // The widget and generated files use this URL for visible links and AI chat prompts,
  // so a `.convex.site` URL leaking into a production bundle is a real problem.
  if (/\.convex\.site$/i.test(appUrl)) {
    console.log("");
    console.log("Detected a Convex `.convex.site` URL.");
    console.log("This URL is fine for the endpoint base, but visible file links and AI chat prompts");
    console.log("usually look better on your production domain.");
    const useCustom = await confirm(
      "Will users access this app through a custom production domain?",
      false,
    );
    if (useCustom) {
      const customDomain = await prompt(
        "Production domain (e.g. https://yourdomain.com)",
        "",
      );
      if (customDomain.trim()) {
        appUrl = customDomain.trim().replace(/\/+$/, "");
        console.log("");
        console.log("Vite tip:");
        console.log("  Set VITE_SITE_URL to your production domain in your build env.");
        console.log("  Pass it to the widget as `publicAppUrl` and keep VITE_CONVEX_SITE_URL");
        console.log("  as the endpoint base. This avoids leaking the dev .site URL into prod bundles.");
      }
    }
  }

  const description = await prompt("One-line description for LLMs", "A useful app.");
  const analyticsEnabled = await confirm("Enable analytics?", false);
  const aiDescriptionsEnabled = await confirm("Enable AI description generation?", false);
  const aiProvider = aiDescriptionsEnabled
    ? await choose("AI provider", ["claude", "openai"], "claude")
    : "claude";

  // Detect existing routes in convex/http.ts to avoid registration conflicts.
  const httpTsPath = path.join(process.cwd(), "convex", "http.ts");
  const existingRoutes = await detectExistingRoutes(httpTsPath);
  const staticFiles = detectStaticFiles();

  // Static hosting pairing guidance and the httpPrefix trap warning.
  const convexConfig = await detectConvexConfig();
  printStaticHostingGuidance(convexConfig);

  // Track skipRoutes additions so we can show users the exact registerRoutes() snippet
  // they need at the end of setup.
  const skipRoutesList = [];
  let sitemapEnabled = true;
  let robotsTxtEnabled = true;
  let rssEnabled = false;

  if (existingRoutes.sitemap) {
    console.log("");
    console.log("Detected existing /sitemap.xml route in convex/http.ts.");
    const sitemapChoice = await choose(
      "How do you want to handle /sitemap.xml?",
      ["keep-mine", "replace", "skip"],
      "keep-mine",
    );
    sitemapEnabled = sitemapChoice === "replace";
    if (sitemapChoice === "keep-mine") {
      console.log("  agent-ready will skip /sitemap.xml registration. Your existing route stays.");
      skipRoutesList.push('"/sitemap.xml"');
    }
  }

  if (existingRoutes.robots) {
    console.log("");
    console.log("Detected existing /robots.txt route in convex/http.ts.");
    const robotsChoice = await choose(
      "How do you want to handle /robots.txt?",
      ["keep-mine", "replace", "skip"],
      "keep-mine",
    );
    robotsTxtEnabled = robotsChoice === "replace";
    if (robotsChoice === "keep-mine") {
      console.log("  agent-ready will skip /robots.txt registration. Your existing route stays.");
      skipRoutesList.push('"/robots.txt"');
    }
  }

  // Core discovery file conflicts. Each is skippable so apps that already serve their own
  // llms.txt, agents.md, or llms-full.txt can keep them. We label local public/ files as
  // "local files detected" because not every Convex app uses Convex static hosting.
  for (const probe of [
    { route: "/llms.txt", routeFlag: existingRoutes.llmsTxt, staticFlag: staticFiles.llmsTxt, label: "llms.txt", staticPath: "public/llms.txt" },
    { route: "/agents.md", routeFlag: existingRoutes.agentsMd, staticFlag: staticFiles.agentsMd, label: "agents.md", staticPath: "public/agents.md" },
    { route: "/llms-full.txt", routeFlag: existingRoutes.llmsFullTxt, staticFlag: staticFiles.llmsFullTxt, label: "llms-full.txt", staticPath: "public/llms-full.txt" },
  ]) {
    if (probe.routeFlag) {
      console.log("");
      console.log(`Detected existing ${probe.route} route in convex/http.ts.`);
      const choice = await choose(
        `How do you want to handle ${probe.route}?`,
        ["keep-mine", "replace"],
        "keep-mine",
      );
      if (choice === "keep-mine") {
        console.log(
          `  agent-ready will skip ${probe.route} registration. Your existing route stays.`,
        );
        skipRoutesList.push(`"${probe.route}"`);
      }
    } else if (probe.staticFlag) {
      console.log("");
      console.log(`Local files detected: ${probe.staticPath}.`);
      console.log(
        "  This file lives in your `public/` folder. It is served by your frontend host",
      );
      console.log(
        "  (Vercel, Netlify, Cloudflare Pages, Convex static hosting, etc.) at the same path.",
      );
      const choice = await choose(
        `How do you want to handle ${probe.route}?`,
        ["keep-mine", "let-agent-ready-serve"],
        "keep-mine",
      );
      if (choice === "keep-mine") {
        console.log(
          `  agent-ready will skip ${probe.route} HTTP route. Your static file stays in charge.`,
        );
        console.log(
          `  Tip: run \`npx agent-ready import --from ${probe.staticPath}\` to migrate content into config.`,
        );
        skipRoutesList.push(`"${probe.route}"`);
      }
    }
  }

  // Check for static robots.txt in public/ when no Convex route exists yet.
  if (!existingRoutes.robots && staticFiles.robotsTxt) {
    console.log("");
    console.log("Local files detected: public/robots.txt.");
    const staticChoice = await choose(
      "How do you want to handle robots.txt?",
      ["keep-mine", "replace", "skip"],
      "keep-mine",
    );
    robotsTxtEnabled = staticChoice === "replace";
    if (staticChoice === "keep-mine") {
      skipRoutesList.push('"/robots.txt"');
    }
  }

  // Default config filename. Legacy llms-txt.config.json is auto-migrated below.
  const configPath = path.join(process.cwd(), "agent-ready.config.json");
  const legacyConfigPath = path.join(process.cwd(), "llms-txt.config.json");
  let existing = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(await readFile(configPath, "utf8"));
    } catch {
      existing = {};
    }
  } else if (existsSync(legacyConfigPath)) {
    // Soft migration: read legacy file once, write under the new name.
    try {
      existing = JSON.parse(await readFile(legacyConfigPath, "utf8"));
      console.log("[setup] Migrating llms-txt.config.json -> agent-ready.config.json");
    } catch {
      existing = {};
    }
  }

  // Live by default. Draft is the opt-in for review-before-publish workflows.
  // Existing configs keep their saved state (publish wins, then legacy testMode).
  const existingPublish =
    existing.settings?.publish ?? (existing.settings?.testMode === true ? "draft" : "live");
  const publishLive = await confirm(
    "Publish files live now? (draft returns 404 until go-live)",
    existingPublish !== "draft",
  );
  const publish = publishLive ? "live" : "draft";

  rssEnabled = await confirm("Enable RSS feed at /feed.xml?", existing.settings?.rssEnabled ?? false);
  const markdownSiteEnabled = await confirm(
    "Enable markdown site at /markdown?",
    existing.settings?.markdownSiteEnabled ?? existing.settings?.markdownNegotiation ?? true,
  );

  const widgetVisibility = await choose(
    "Widget display",
    ["visible", "hidden"],
    existing.settings?.widgetVisible === false ? "hidden" : "visible",
  );
  const widgetVisible = widgetVisibility === "visible";
  const showWidgetInstallCode = widgetVisible
    ? await confirm("Show widget install code?", true)
    : false;
  const widgetFramework = showWidgetInstallCode
    ? await choose("Widget framework", WIDGET_FRAMEWORKS, "react")
    : null;
  const widgetMountLocation = showWidgetInstallCode
    ? await choose("Where will you add the widget? (root recommended)", WIDGET_MOUNT_LOCATIONS, "root")
    : null;
  const selectedWidgetPosition = widgetMountLocation
    ? resolveWidgetPosition(widgetMountLocation)
    : existing.settings?.widgetPosition;

  // Desktop collapse mirrors the mobile collapsed presentation on desktop viewports too.
  // Default true for new installs; existing configs keep their saved value.
  const widgetDesktopCollapse = widgetVisible
    ? await confirm(
        "Allow widget collapse on desktop?",
        existing.settings?.widgetDesktopCollapse ?? true,
      )
    : existing.settings?.widgetDesktopCollapse ?? true;
  const widgetShowMarkdownTab =
    markdownSiteEnabled && widgetVisible
      ? await confirm(
          "Show MARKDOWN tab in the widget?",
          existing.settings?.widgetShowMarkdownTab ?? true,
        )
      : false;

  const nextConfig = {
    ...existing,
    settings: {
      ...(existing.settings ?? {}),
      appName,
      appUrl,
      description,
      analyticsEnabled,
      aiDescriptionsEnabled,
      aiProvider,
      publish,
      // Deprecated alias kept in sync so older component versions still gate correctly.
      testMode: publish === "draft",
      cronEnabled: existing.settings?.cronEnabled ?? true,
      cronIntervalHours: existing.settings?.cronIntervalHours ?? 24,
      widgetPosition: selectedWidgetPosition ?? existing.settings?.widgetPosition ?? "floating-bottom-right",
      widgetVisible,
      widgetStatusVisible: existing.settings?.widgetStatusVisible ?? true,
      widgetShowFiles: existing.settings?.widgetShowFiles ?? true,
      widgetShowAppName: existing.settings?.widgetShowAppName ?? true,
      widgetShowDescription: existing.settings?.widgetShowDescription ?? true,
      widgetShowMeta: existing.settings?.widgetShowMeta ?? true,
      widgetShowScoreTab: existing.settings?.widgetShowScoreTab ?? false,
      widgetDesktopCollapse,
      widgetCleanMode: existing.settings?.widgetCleanMode ?? false,
      widgetShowHumanTab: existing.settings?.widgetShowHumanTab ?? true,
      widgetShowMachineTab: existing.settings?.widgetShowMachineTab ?? true,
      widgetShowChatLinks: existing.settings?.widgetShowChatLinks ?? true,
      widgetShowChatGPT: existing.settings?.widgetShowChatGPT ?? true,
      widgetShowClaude: existing.settings?.widgetShowClaude ?? true,
      widgetShowPerplexity: existing.settings?.widgetShowPerplexity ?? true,
      widgetColors: existing.settings?.widgetColors ?? {},
      theme: existing.settings?.theme ?? "system",
      // Simple-mode-first: llms-full.txt is an advanced opt-in for new installs.
      // Existing configs keep their current value to avoid surprising changes on rerun.
      fullTxtEnabled: existing.settings?.fullTxtEnabled ?? false,
      permissiveMode: existing.settings?.permissiveMode ?? false,
      versioningEnabled: existing.settings?.versioningEnabled ?? false,
      markdownNegotiation: markdownSiteEnabled,
      markdownSiteEnabled,
      widgetShowMarkdownTab,
      sitemapEnabled: sitemapEnabled,
      rssEnabled: rssEnabled,
      robotsTxtEnabled: robotsTxtEnabled,
    },
    pages: existing.pages ?? [],
    endpoints: existing.endpoints ?? [],
  };

  await writeFile(configPath, JSON.stringify(nextConfig, null, 2) + "\n");
  console.log("");
  console.log(`Wrote ${path.relative(process.cwd(), configPath)}`);

  // Scaffold Convex wrapper files for browser clients.
  console.log("");
  const wrapperScaffolded = await scaffoldWrappers();

  try {
    await convexRun("agentReady:content:sync", { config: nextConfig });
    console.log("Synced config to Convex deployment");
  } catch (err) {
    console.warn("Could not sync config yet. Run `npx convex dev` first, then rerun sync.");
    console.warn(formatError(err));
  }

  console.log("");
  console.log("Next steps:");
  console.log("  1. Add registerRoutes() to convex/http.ts (see INTEGRATION.md)");
  if (markdownSiteEnabled) {
    console.log("     Add registerMarkdownRoutes() before any SPA/static fallback.");
  }
  // Deduplicate while preserving order; users want one canonical snippet to copy.
  const skipRoutesUnique = Array.from(new Set(skipRoutesList));
  if (skipRoutesUnique.length > 0) {
    console.log(
      `     Use skipRoutes to avoid conflicts: registerRoutes(http, components.agentReady, { skipRoutes: [${skipRoutesUnique.join(", ")}] })`,
    );
  }
  if (widgetVisible) {
    console.log("  2. Add <AgentReadyWidget /> to your app layout");
    if (markdownSiteEnabled && !widgetShowMarkdownTab) {
      console.log("     MARKDOWN tab is hidden, but /markdown pages are still live.");
    }
  } else {
    console.log("  2. Widget is hidden. Run `npx agent-ready links` to copy file URLs.");
  }
  console.log("  3. (Optional) Add a settings page using <AgentReadySettingsPanel />");
  console.log("     See INTEGRATION.md for the full example.");
  if (publish === "draft") {
    console.log("  4. Run: npx agent-ready go-live   (files return 404 until you go live)");
  } else {
    console.log("  4. Files are live by default. Review first next time? Set publish: \"draft\".");
  }
  console.log("");
  console.log("Your files will be available at:");
  console.log("  https://<your-deployment>.convex.site/llms.txt");
  console.log("  https://<your-deployment>.convex.site/agents.md");
  console.log("  Run `npx agent-ready links --url https://<your-deployment>.convex.site` for every generated route.");

  // Warn when the saved config has no pages or endpoints. Without content, llms.txt is
  // basically a stub and agents will have nothing to discover. Point users at import/discover.
  const pageCount = Array.isArray(nextConfig.pages) ? nextConfig.pages.length : 0;
  const endpointCount = Array.isArray(nextConfig.endpoints) ? nextConfig.endpoints.length : 0;
  if (pageCount === 0 && endpointCount === 0) {
    console.log("");
    console.log("Heads up: your config has no pages or endpoints yet.");
    console.log("  Generated llms.txt will only include your title and description.");
    console.log("  Add content with one of:");
    if (staticFiles.llmsTxt) {
      console.log("    npx agent-ready import --from public/llms.txt");
    }
    console.log("    npx agent-ready discover");
    console.log("    Edit agent-ready.config.json directly, then run npx agent-ready sync");
  }
  if (wrapperScaffolded) {
    console.log("");
    console.log("Wrapper files were created at convex/agentReady/.");
    console.log("These expose the component API to your browser clients.");
  }
  if (showWidgetInstallCode && widgetFramework && widgetMountLocation) {
    printWidgetInstallGuide({
      framework: widgetFramework,
      mountLocation: widgetMountLocation,
      widgetPosition: selectedWidgetPosition ?? "floating-bottom-right",
    });
  }
}
