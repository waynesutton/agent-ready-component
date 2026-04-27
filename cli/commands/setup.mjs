// Interactive first-run wizard. Writes agent-ready.config.json, scaffolds Convex
// wrapper files, syncs config to the deployment, and prints next steps.
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prompt, confirm, choose } from "../lib/prompts.mjs";
import { convexRun, formatError } from "../lib/convex.mjs";
import { printCliBanner } from "../lib/banner.mjs";

// Scan convex/http.ts for route paths that would conflict with agent-ready.
async function detectExistingRoutes(httpTsPath) {
  if (!existsSync(httpTsPath)) return { sitemap: false, robots: false };
  try {
    const src = await readFile(httpTsPath, "utf8");
    return {
      sitemap: /["'`]\/sitemap\.xml["'`]/.test(src),
      robots: /["'`]\/robots\.txt["'`]/.test(src),
    };
  } catch {
    return { sitemap: false, robots: false };
  }
}

// Convex wrapper that exposes component functions to browser clients.
const CONTENT_WRAPPER = `import { action, mutation, query } from "../_generated/server";
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
  const appUrl = await prompt("App URL (no trailing slash)", "https://example.com");
  const description = await prompt("One-line description for LLMs", "A useful app.");
  const analyticsEnabled = await confirm("Enable analytics?", false);
  const aiDescriptionsEnabled = await confirm("Enable AI description generation?", false);
  const aiProvider = aiDescriptionsEnabled
    ? await choose("AI provider", ["claude", "openai"], "claude")
    : "claude";

  // Detect existing routes in convex/http.ts to avoid registration conflicts.
  const httpTsPath = path.join(process.cwd(), "convex", "http.ts");
  const existingRoutes = await detectExistingRoutes(httpTsPath);

  let sitemapEnabled = true;
  let robotsTxtEnabled = true;

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
    }
  }

  // Check for static robots.txt in public/ (e.g. from self-hosting)
  const publicRobots = path.join(process.cwd(), "public", "robots.txt");
  if (!existingRoutes.robots && existsSync(publicRobots)) {
    console.log("");
    console.log("Detected public/robots.txt (may conflict with static hosting).");
    const staticChoice = await choose(
      "How do you want to handle robots.txt?",
      ["keep-mine", "replace", "skip"],
      "keep-mine",
    );
    robotsTxtEnabled = staticChoice === "replace";
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

  const showWidgetInstallCode = await confirm("Show widget install code?", true);
  const widgetFramework = showWidgetInstallCode
    ? await choose("Widget framework", WIDGET_FRAMEWORKS, "react")
    : null;
  const widgetMountLocation = showWidgetInstallCode
    ? await choose("Where will you add the widget? (root recommended)", WIDGET_MOUNT_LOCATIONS, "root")
    : null;
  const selectedWidgetPosition = widgetMountLocation
    ? resolveWidgetPosition(widgetMountLocation)
    : existing.settings?.widgetPosition;

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
      testMode: existing.settings?.testMode ?? true,
      cronEnabled: existing.settings?.cronEnabled ?? true,
      cronIntervalHours: existing.settings?.cronIntervalHours ?? 24,
      widgetPosition: selectedWidgetPosition ?? existing.settings?.widgetPosition ?? "floating-bottom-right",
      widgetStatusVisible: existing.settings?.widgetStatusVisible ?? true,
      widgetShowFiles: existing.settings?.widgetShowFiles ?? true,
      widgetShowAppName: existing.settings?.widgetShowAppName ?? true,
      widgetShowDescription: existing.settings?.widgetShowDescription ?? true,
      widgetShowMeta: existing.settings?.widgetShowMeta ?? true,
      widgetShowScoreTab: existing.settings?.widgetShowScoreTab ?? false,
      widgetCleanMode: existing.settings?.widgetCleanMode ?? false,
      widgetShowHumanTab: existing.settings?.widgetShowHumanTab ?? true,
      widgetShowMachineTab: existing.settings?.widgetShowMachineTab ?? true,
      widgetShowChatLinks: existing.settings?.widgetShowChatLinks ?? true,
      widgetShowChatGPT: existing.settings?.widgetShowChatGPT ?? true,
      widgetShowClaude: existing.settings?.widgetShowClaude ?? true,
      widgetShowPerplexity: existing.settings?.widgetShowPerplexity ?? true,
      widgetColors: existing.settings?.widgetColors ?? {},
      theme: existing.settings?.theme ?? "system",
      fullTxtEnabled: existing.settings?.fullTxtEnabled ?? false,
      permissiveMode: existing.settings?.permissiveMode ?? false,
      versioningEnabled: existing.settings?.versioningEnabled ?? false,
      sitemapEnabled: sitemapEnabled,
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
  if (!sitemapEnabled || !robotsTxtEnabled) {
    const skipped = [];
    if (!robotsTxtEnabled) skipped.push('"/robots.txt"');
    if (!sitemapEnabled) skipped.push('"/sitemap.xml"');
    console.log(`     Use skipRoutes to avoid conflicts: registerRoutes(http, components.agentReady, { skipRoutes: [${skipped.join(", ")}] })`);
  }
  console.log("  2. Add <AgentReadyWidget /> to your app layout");
  console.log("  3. (Optional) Add a settings page using <AgentReadySettingsPanel />");
  console.log("     See INTEGRATION.md for the full example.");
  console.log("  4. Run: npx agent-ready go-live   (when ready for production)");
  console.log("");
  console.log("Your files will be available at:");
  console.log("  https://<your-deployment>.convex.site/llms.txt");
  console.log("  https://<your-deployment>.convex.site/agents.md");
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
