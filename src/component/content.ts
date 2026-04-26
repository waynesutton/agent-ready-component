import {
  internalQuery,
  mutation,
  query,
  action,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { MAX_CACHED_FILE_BYTES, MAX_PAGE_CONTENT_CHARS } from "./lib.js";
import {
  cachedFileDocValidator,
  contentStatusValidator,
  endpointDocValidator,
  fileTypeValidator,
  pageDocValidator,
  pageVersionDocValidator,
  settingsDocValidator,
  settingsPatchValidator,
  syncConfigValidator,
} from "./validators.js";

// ---------- Settings ----------

export const getSettings = query({
  args: {},
  returns: v.union(v.null(), settingsDocValidator),
  handler: async (ctx) => {
    return (await ctx.db.query("settings").unique()) ?? null;
  },
});

export const upsertSettings = mutation({
  args: { patch: settingsPatchValidator },
  returns: settingsDocValidator,
  handler: async (ctx, args) => {
    // Production guard: permissiveMode must never be enabled in prod.
    if (args.patch?.permissiveMode === true && process.env.NODE_ENV === "production") {
      throw new Error("permissiveMode cannot be enabled when NODE_ENV === 'production'");
    }

    const existing = await ctx.db.query("settings").unique();
    if (!existing) {
      const inserted = await ctx.db.insert("settings", {
        appName: args.patch?.appName ?? "Unnamed app",
        appUrl: args.patch?.appUrl ?? "https://example.com",
        description: args.patch?.description ?? "",
        agentInstructions: args.patch?.agentInstructions,
        contactEmail: args.patch?.contactEmail,
        widgetPosition: args.patch?.widgetPosition ?? "floating-bottom-right",
        theme: args.patch?.theme ?? "system",
        testMode: args.patch?.testMode ?? true,
        cronEnabled: args.patch?.cronEnabled ?? true,
        cronIntervalHours: args.patch?.cronIntervalHours ?? 24,
        analyticsEnabled: args.patch?.analyticsEnabled ?? false,
        analyticsRequestRetentionDays: args.patch?.analyticsRequestRetentionDays ?? 90,
        analyticsThreshold: args.patch?.analyticsThreshold,
        aiDescriptionsEnabled: args.patch?.aiDescriptionsEnabled ?? false,
        aiProvider: args.patch?.aiProvider ?? "claude",
        fullTxtEnabled: args.patch?.fullTxtEnabled ?? false,
        permissiveMode: args.patch?.permissiveMode ?? false,
        versioningEnabled: args.patch?.versioningEnabled ?? false,
        onGenerationComplete: args.patch?.onGenerationComplete,
        onAnalyticsThreshold: args.patch?.onAnalyticsThreshold,
      });
      const doc = await ctx.db.get(inserted);
      if (!doc) throw new Error("settings insert failed");
      return doc;
    }
    await ctx.db.patch(existing._id, args.patch ?? {});
    const doc = await ctx.db.get(existing._id);
    if (!doc) throw new Error("settings update failed");
    return doc;
  },
});

// ---------- Pages ----------

export const listPages = query({
  args: { includeAllStatuses: v.optional(v.boolean()) },
  returns: v.array(pageDocValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pages")
      .withIndex("by_deleted", (q) => q.eq("deletedAt", undefined))
      .collect();
    const filtered = args.includeAllStatuses
      ? rows
      : rows.filter((r) => r.status === "published");
    filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return filtered;
  },
});

export const upsertPage = mutation({
  args: {
    title: v.string(),
    path: v.string(),
    description: v.string(),
    fullContent: v.optional(v.string()),
    status: v.optional(contentStatusValidator),
    isOptional: v.optional(v.boolean()),
    order: v.optional(v.number()),
    descriptionGeneratedByAi: v.optional(v.boolean()),
  },
  returns: v.id("pages"),
  handler: async (ctx, args) => {
    if (args.fullContent && args.fullContent.length > MAX_PAGE_CONTENT_CHARS) {
      throw new Error(`fullContent exceeds ${MAX_PAGE_CONTENT_CHARS} chars`);
    }
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .unique();

    // Snapshot for version history if enabled.
    const settings = await ctx.db.query("settings").unique();
    if (settings?.versioningEnabled && existing) {
      await ctx.db.insert("pageVersions", {
        pagePath: existing.path,
        snapshotAt: Date.now(),
        title: existing.title,
        description: existing.description,
        fullContent: existing.fullContent,
        status: existing.status,
      });
    }

    if (!existing) {
      return await ctx.db.insert("pages", {
        title: args.title,
        path: args.path,
        description: args.description,
        fullContent: args.fullContent,
        status: args.status ?? "published",
        isOptional: args.isOptional,
        order: args.order,
        descriptionGeneratedByAi: args.descriptionGeneratedByAi,
      });
    }
    await ctx.db.patch(existing._id, {
      title: args.title,
      description: args.description,
      fullContent: args.fullContent,
      status: args.status ?? existing.status,
      isOptional: args.isOptional ?? existing.isOptional,
      order: args.order ?? existing.order,
      descriptionGeneratedByAi:
        args.descriptionGeneratedByAi ?? existing.descriptionGeneratedByAi,
      deletedAt: undefined,
    });
    return existing._id;
  },
});

export const deletePage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .unique();
    if (!existing) return null;
    await ctx.db.patch(existing._id, { deletedAt: Date.now() });
    return null;
  },
});

export const restorePage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .unique();
    if (!existing) return null;
    await ctx.db.patch(existing._id, { deletedAt: undefined });
    return null;
  },
});

export const publishPage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setPageStatus(ctx, args.path, "published");
    return null;
  },
});

export const draftPage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setPageStatus(ctx, args.path, "draft");
    return null;
  },
});

export const archivePage = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setPageStatus(ctx, args.path, "archived");
    return null;
  },
});

async function setPageStatus(
  ctx: MutationCtx,
  path: string,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const existing = await ctx.db
    .query("pages")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique();
  if (!existing) return;
  await ctx.db.patch(existing._id, { status });
}

// ---------- API endpoints ----------

export const listApiEndpoints = query({
  args: { includeAllStatuses: v.optional(v.boolean()) },
  returns: v.array(endpointDocValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("apiEndpoints")
      .withIndex("by_deleted", (q) => q.eq("deletedAt", undefined))
      .collect();
    return args.includeAllStatuses
      ? rows
      : rows.filter((r) => r.status === "published");
  },
});

export const upsertEndpoint = mutation({
  args: {
    method: v.string(),
    path: v.string(),
    description: v.string(),
    group: v.optional(v.string()),
    status: v.optional(contentStatusValidator),
    descriptionGeneratedByAi: v.optional(v.boolean()),
  },
  returns: v.id("apiEndpoints"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiEndpoints")
      .withIndex("by_method_path", (q) =>
        q.eq("method", args.method).eq("path", args.path),
      )
      .unique();
    if (!existing) {
      return await ctx.db.insert("apiEndpoints", {
        method: args.method,
        path: args.path,
        description: args.description,
        group: args.group,
        status: args.status ?? "published",
        descriptionGeneratedByAi: args.descriptionGeneratedByAi,
      });
    }
    await ctx.db.patch(existing._id, {
      description: args.description,
      group: args.group ?? existing.group,
      status: args.status ?? existing.status,
      descriptionGeneratedByAi:
        args.descriptionGeneratedByAi ?? existing.descriptionGeneratedByAi,
      deletedAt: undefined,
    });
    return existing._id;
  },
});

export const deleteEndpoint = mutation({
  args: { method: v.string(), path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiEndpoints")
      .withIndex("by_method_path", (q) =>
        q.eq("method", args.method).eq("path", args.path),
      )
      .unique();
    if (!existing) return null;
    await ctx.db.patch(existing._id, { deletedAt: Date.now() });
    return null;
  },
});

// ---------- Cached files ----------

export const getCachedFile = query({
  args: { fileType: fileTypeValidator },
  returns: v.union(v.null(), cachedFileDocValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("cachedFiles")
      .withIndex("by_file_type", (q) => q.eq("fileType", args.fileType))
      .unique();
    return row ?? null;
  },
});

export const getCacheStatus = query({
  args: {},
  returns: v.object({
    testMode: v.boolean(),
    appName: v.union(v.string(), v.null()),
    appUrl: v.union(v.string(), v.null()),
    lastGeneratedAt: v.union(v.number(), v.null()),
    generatedFromVersion: v.union(v.string(), v.null()),
    generationInProgress: v.boolean(),
    hasDrafts: v.boolean(),
    fullTxtEnabled: v.boolean(),
    widgetStatusVisible: v.boolean(),
    widgetShowFiles: v.boolean(),
    widgetShowAppName: v.boolean(),
    widgetShowDescription: v.boolean(),
    widgetShowMeta: v.boolean(),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").unique();
    const files = await ctx.db.query("cachedFiles").collect();
    const hasDrafts =
      (
        await ctx.db
          .query("pages")
          .withIndex("by_status_order", (q) => q.eq("status", "draft"))
          .first()
      ) !== null;
    const latest = files.reduce<number | null>((acc, row) => {
      if (acc === null) return row.generatedAt;
      return row.generatedAt > acc ? row.generatedAt : acc;
    }, null);
    const llms = files.find((f) => f.fileType === "llms.txt");
    return {
      testMode: settings?.testMode ?? true,
      appName: settings?.appName ?? null,
      appUrl: settings?.appUrl ?? null,
      lastGeneratedAt: latest,
      generatedFromVersion: llms?.generatedFromVersion ?? null,
      generationInProgress: files.some((f) => f.status === "generating"),
      hasDrafts,
      fullTxtEnabled: settings?.fullTxtEnabled ?? false,
      widgetStatusVisible: settings?.widgetStatusVisible ?? true,
      widgetShowFiles: settings?.widgetShowFiles ?? true,
      widgetShowAppName: settings?.widgetShowAppName ?? true,
      widgetShowDescription: settings?.widgetShowDescription ?? true,
      widgetShowMeta: settings?.widgetShowMeta ?? true,
    };
  },
});

export const getGenerationStatus = query({
  args: { jobId: v.string() },
  returns: v.object({
    jobId: v.string(),
    state: v.union(
      v.literal("unknown"),
      v.literal("failed"),
      v.literal("running"),
      v.literal("complete"),
    ),
    files: v.optional(
      v.array(
        v.object({
          fileType: fileTypeValidator,
          status: v.union(
            v.literal("current"),
            v.literal("generating"),
            v.literal("failed"),
          ),
          generatedAt: v.number(),
          version: v.string(),
        }),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("cachedFiles").collect();
    const relevant = rows.filter((r) => r.lastJobId === args.jobId);
    if (relevant.length === 0) return { jobId: args.jobId, state: "unknown" as const };
    const anyFailed = relevant.some((r) => r.status === "failed");
    const anyRunning = relevant.some((r) => r.status === "generating");
    return {
      jobId: args.jobId,
      state: anyFailed ? "failed" as const : anyRunning ? "running" as const : "complete" as const,
      files: relevant.map((r) => ({
        fileType: r.fileType,
        status: r.status,
        generatedAt: r.generatedAt,
        version: r.generatedFromVersion,
      })),
    };
  },
});

// Internal query. Loads the bundle used by the generation action.
export const loadBundle = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      settings: settingsDocValidator,
      pages: v.array(pageDocValidator),
      endpoints: v.array(endpointDocValidator),
    }),
  ),
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").unique();
    if (!settings) return null;
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_deleted", (q) => q.eq("deletedAt", undefined))
      .collect();
    const endpoints = await ctx.db
      .query("apiEndpoints")
      .withIndex("by_deleted", (q) => q.eq("deletedAt", undefined))
      .collect();
    const publishedPages = pages
      .filter((p) => p.status === "published")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const publishedEndpoints = endpoints.filter((e) => e.status === "published");
    return { settings, pages: publishedPages, endpoints: publishedEndpoints };
  },
});

export const rollbackCache = mutation({
  args: { fileType: fileTypeValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("cachedFiles")
      .withIndex("by_file_type", (q) => q.eq("fileType", args.fileType))
      .unique();
    if (!row || !row.previousContent) return null;
    if (row.previousContent.length > MAX_CACHED_FILE_BYTES) {
      throw new Error("previousContent exceeds cache size limit");
    }
    await ctx.db.patch(row._id, {
      content: row.previousContent,
      generatedAt: row.previousGeneratedAt ?? Date.now(),
      previousContent: row.content,
      previousGeneratedAt: row.generatedAt,
      status: "current",
    });
    return null;
  },
});

// Public action wrapper. Fires a regeneration and returns the CacheJobId.
export const regenerateAll = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    return await ctx.runMutation(internal.contentInternal.invalidateCache, {});
  },
});

type GenerateDescriptionsResult = {
  queued: number;
  provider: "claude" | "openai";
};

export const generateDescriptions = action({
  args: { force: v.optional(v.boolean()) },
  returns: v.object({
    queued: v.number(),
    provider: v.union(v.literal("claude"), v.literal("openai")),
  }),
  handler: async (ctx, args): Promise<GenerateDescriptionsResult> => {
    // AI description generator. Caps to 100 items, 1 call per second.
    const settings = await ctx.runQuery(internal.contentInternal.getSettings, {});
    if (!settings || !settings.aiDescriptionsEnabled) {
      throw new Error("aiDescriptionsEnabled is false");
    }
    const pages = await ctx.runQuery(internal.contentInternal.listPages, {});
    const targets = pages
      .filter((p) => args.force === true || !p.description || p.description.trim() === "")
      .slice(0, 100);
    return { queued: targets.length, provider: settings.aiProvider ?? "claude" };
  },
});

type SyncResult = {
  ok: true;
  jobId: string;
};

export const sync = action({
  args: { config: syncConfigValidator },
  returns: v.object({ ok: v.literal(true), jobId: v.string() }),
  handler: async (ctx, args): Promise<SyncResult> => {
    // CI/CD entry. Applies a parsed agent-ready.config.json payload to the deployment.
    await ctx.runMutation(internal.contentInternal.applySyncConfig, { config: args.config });
    const jobId: string = await ctx.runMutation(
      internal.contentInternal.invalidateCache,
      {},
    );
    return { ok: true, jobId };
  },
});

export const getPageVersions = query({
  args: { path: v.string() },
  returns: v.array(pageVersionDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pageVersions")
      .withIndex("by_page_snapshot", (q) => q.eq("pagePath", args.path))
      .order("desc")
      .collect();
  },
});

