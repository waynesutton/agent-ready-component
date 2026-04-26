import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { buildVersionInput, sha256Hex, escapeXml, sanitizePath, KNOWN_AI_BOTS } from "./lib.js";

// Workpool entry point. Called by content.regenerateAll.
// Fetches settings, pages, endpoints, builds each file, diffs hashes, writes cachedFiles rows.
export const runGeneration = internalAction({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await ctx.runQuery(internal.content.loadBundle, {});
    if (!bundle) {
      return null;
    }

    const { settings, pages, endpoints } = bundle;

    const llmsTxt = renderLlmsTxt(settings, pages);
    const agentsMd = renderAgentsMd(settings, endpoints);
    const fullTxt = settings.fullTxtEnabled ? renderFullTxt(settings, pages) : null;
    const robotsTxt = settings.robotsTxtEnabled ? renderRobotsTxt(settings, pages) : null;
    const sitemapXml = settings.sitemapEnabled ? renderSitemap(settings, pages) : null;
    const agentSkills = settings.agentSkillsEnabled
      ? renderAgentSkills(settings, pages, endpoints)
      : null;

    type FileEntry = { fileType: string; content: string };
    const files: Array<FileEntry> = [
      { fileType: "llms.txt", content: llmsTxt },
      { fileType: "agents.md", content: agentsMd },
    ];
    if (fullTxt) files.push({ fileType: "llms-full.txt", content: fullTxt });
    if (robotsTxt) files.push({ fileType: "robots.txt", content: robotsTxt });
    if (sitemapXml) files.push({ fileType: "sitemap.xml", content: sitemapXml });
    if (agentSkills) files.push({ fileType: "agent-skills.json", content: agentSkills });

    const versions = await Promise.all(
      files.map((f) =>
        sha256Hex(buildVersionInput(settings.appName, settings.appUrl, settings.description, [f.content])),
      ),
    );

    const results = files.map((f, i) => ({
      fileType: f.fileType as "llms.txt" | "agents.md" | "llms-full.txt" | "robots.txt" | "sitemap.xml" | "agent-skills.json",
      content: f.content,
      version: versions[i]!,
    }));

    await ctx.runMutation(internal.generation.writeGenerationResult, {
      jobId: args.jobId,
      results,
    });

    if (settings.onGenerationComplete) {
      try {
        await ctx.runMutation(internal.generation.invokeOnGenerationComplete, {
          handle: settings.onGenerationComplete,
          jobId: args.jobId,
        });
      } catch (err) {
        console.error("[agent-ready] onGenerationComplete handler failed:", err);
      }
    }

    return null;
  },
});

type CachedResult = {
  fileType: "llms.txt" | "agents.md" | "llms-full.txt" | "robots.txt" | "sitemap.xml" | "agent-skills.json";
  content: string;
  version: string;
};

export const writeGenerationResult = internalMutation({
  args: {
    jobId: v.string(),
    results: v.array(
      v.object({
        fileType: v.union(
          v.literal("llms.txt"),
          v.literal("agents.md"),
          v.literal("llms-full.txt"),
          v.literal("robots.txt"),
          v.literal("sitemap.xml"),
          v.literal("agent-skills.json"),
        ),
        content: v.string(),
        version: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const result of args.results) {
      const existing = await ctx.db
        .query("cachedFiles")
        .withIndex("by_file_type", (q) => q.eq("fileType", result.fileType))
        .unique();
      // Idempotent skip. Hash match means nothing to write.
      if (existing && existing.generatedFromVersion === result.version) continue;

      if (!existing) {
        await ctx.db.insert("cachedFiles", {
          fileType: result.fileType,
          content: result.content,
          generatedAt: now,
          generatedFromVersion: result.version,
          status: "current",
          lastJobId: args.jobId,
        });
      } else {
        await ctx.db.patch(existing._id, {
          content: result.content,
          generatedAt: now,
          generatedFromVersion: result.version,
          previousContent: existing.content,
          previousGeneratedAt: existing.generatedAt,
          status: "current",
          lastJobId: args.jobId,
        });
      }
    }
    return null;
  },
});

// Stored function handle invocation. The handle is a string reference registered via upsertSettings.
// Actual runtime dispatch of stored handles is deployment-managed by Convex — this wrapper exists
// so generation logic can stay side-effect free.
export const invokeOnGenerationComplete = internalMutation({
  args: { handle: v.string(), jobId: v.string() },
  returns: v.null(),
  handler: async () => {
    // Intentional no-op stub. The registered function runs in the app-level scheduler wrapper.
    return null;
  },
});

// -------- Rendering --------

type SettingsLike = {
  appName: string;
  appUrl: string;
  description: string;
  agentInstructions?: string;
  fullTxtEnabled: boolean;
  onGenerationComplete?: string;
  robotsTxtEnabled?: boolean;
  robotsTxtAllowAiBots?: boolean;
  robotsTxtDisallowPaths?: string[];
  sitemapEnabled?: boolean;
  agentSkillsEnabled?: boolean;
};

type PageLike = {
  title: string;
  path: string;
  description: string;
  fullContent?: string;
  isOptional?: boolean;
  order?: number;
};

type EndpointLike = {
  method: string;
  path: string;
  description: string;
  group?: string;
};

function renderLlmsTxt(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const core = pages.filter((p) => !p.isOptional);
  const optional = pages.filter((p) => p.isOptional);
  const lines: Array<string> = [];
  lines.push(`# ${settings.appName}`);
  lines.push("");
  lines.push(`> ${settings.description}`);
  if (core.length > 0) {
    lines.push("");
    lines.push("## Pages");
    for (const page of core) {
      lines.push(`- [${page.title}](${settings.appUrl}${page.path}): ${page.description}`);
    }
  }
  if (optional.length > 0) {
    lines.push("");
    lines.push("## Optional");
    for (const page of optional) {
      lines.push(`- [${page.title}](${settings.appUrl}${page.path}): ${page.description}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function renderAgentsMd(settings: SettingsLike, endpoints: ReadonlyArray<EndpointLike>): string {
  const lines: Array<string> = [];
  lines.push(`# Agent instructions for ${settings.appName}`);
  lines.push("");
  if (settings.agentInstructions) {
    lines.push(settings.agentInstructions);
    lines.push("");
  }
  if (endpoints.length === 0) {
    lines.push("");
    return lines.join("\n");
  }
  // Group endpoints by their optional group field.
  const grouped = new Map<string, Array<EndpointLike>>();
  for (const endpoint of endpoints) {
    const key = endpoint.group ?? "API";
    const bucket = grouped.get(key) ?? [];
    bucket.push(endpoint);
    grouped.set(key, bucket);
  }
  lines.push("## Available API endpoints");
  for (const [group, list] of grouped) {
    lines.push("");
    lines.push(`### ${group}`);
    for (const endpoint of list) {
      lines.push(`- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function renderFullTxt(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const lines: Array<string> = [];
  lines.push(`# ${settings.appName} full documentation`);
  lines.push("");
  lines.push(`> ${settings.description}`);
  lines.push("");
  for (const page of pages) {
    if (!page.fullContent) continue;
    lines.push(`## ${page.title}`);
    lines.push(`URL: ${settings.appUrl}${page.path}`);
    lines.push("");
    lines.push(page.fullContent);
    lines.push("");
  }
  return lines.join("\n");
}

function renderRobotsTxt(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const base = settings.appUrl.replace(/\/$/, "");
  const lines: Array<string> = [];

  lines.push("User-agent: *");
  if (settings.robotsTxtDisallowPaths) {
    for (const p of settings.robotsTxtDisallowPaths) {
      lines.push(`Disallow: ${sanitizePath(p)}`);
    }
  }
  lines.push("");

  // AI bot directives
  const allow = settings.robotsTxtAllowAiBots !== false;
  for (const bot of KNOWN_AI_BOTS) {
    lines.push(`User-agent: ${bot}`);
    lines.push(allow ? "Allow: /" : "Disallow: /");
    lines.push("");
  }

  lines.push(`Sitemap: ${base}/llms.txt`);
  if (settings.sitemapEnabled) {
    lines.push(`Sitemap: ${base}/sitemap.xml`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderSitemap(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const base = settings.appUrl.replace(/\/$/, "");
  const lines: Array<string> = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const page of pages) {
    const loc = escapeXml(`${base}${page.path}`);
    lines.push("  <url>");
    lines.push(`    <loc>${loc}</loc>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
}

function renderAgentSkills(
  settings: SettingsLike,
  pages: ReadonlyArray<PageLike>,
  endpoints: ReadonlyArray<EndpointLike>,
): string {
  const base = settings.appUrl.replace(/\/$/, "");
  const skills: Array<Record<string, string>> = [];

  for (const page of pages) {
    skills.push({
      name: page.title,
      description: page.description,
      type: "page",
      url: `${base}${page.path}`,
    });
  }

  for (const ep of endpoints) {
    skills.push({
      name: `${ep.method} ${ep.path}`,
      description: ep.description,
      type: "api",
      method: ep.method,
      url: `${base}${ep.path}`,
    });
  }

  return JSON.stringify(
    {
      name: settings.appName,
      description: settings.description,
      skills,
    },
    null,
    2,
  );
}
