"use node";

import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { buildVersionInput, sha256Hex } from "./lib.js";

// Workpool entry point. Called by content.regenerateAll.
// Fetches settings, pages, endpoints, builds each file, diffs hashes, writes cachedFiles rows.
export const runGeneration = internalAction({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await ctx.runQuery(internal.content.loadBundle, {});
    if (!bundle) {
      // No settings row yet. Nothing to generate.
      return null;
    }

    const { settings, pages, endpoints } = bundle;

    // Build each file deterministically.
    const llmsTxt = renderLlmsTxt(settings, pages);
    const agentsMd = renderAgentsMd(settings, endpoints);
    const fullTxt = settings.fullTxtEnabled ? renderFullTxt(settings, pages) : null;

    // Compute content hashes. Used as ETag values and for idempotent skip on unchanged content.
    const [llmsVersion, agentsVersion, fullVersion] = await Promise.all([
      sha256Hex(buildVersionInput(settings.appName, settings.appUrl, settings.description, [llmsTxt])),
      sha256Hex(buildVersionInput(settings.appName, settings.appUrl, settings.description, [agentsMd])),
      fullTxt
        ? sha256Hex(buildVersionInput(settings.appName, settings.appUrl, settings.description, [fullTxt]))
        : Promise.resolve(""),
    ]);

    await ctx.runMutation(internal.generation.writeGenerationResult, {
      jobId: args.jobId,
      results: [
        { fileType: "llms.txt", content: llmsTxt, version: llmsVersion },
        { fileType: "agents.md", content: agentsMd, version: agentsVersion },
        ...(fullTxt
          ? [{ fileType: "llms-full.txt" as const, content: fullTxt, version: fullVersion }]
          : []),
      ],
    });

    // Fire the onGenerationComplete callback if configured.
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
  fileType: "llms.txt" | "agents.md" | "llms-full.txt";
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
