import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { classifyUserAgent, MAX_USER_AGENT_CHARS } from "./lib.js";
import { fileTypeValidator } from "./validators.js";

// Public mutation. Called across the component boundary by the app-side HTTP handler
// that registerRoutes mounts on the host app's httpRouter. Must stay public because app
// code invokes it via ctx.runMutation; internal functions are hidden across the boundary.
export const recordRequest = mutation({
  args: {
    fileType: fileTypeValidator,
    userAgent: v.string(),
    requestedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const classified = classifyUserAgent(args.userAgent);
    await ctx.db.insert("agentRequests", {
      fileType: args.fileType,
      requestedAt: args.requestedAt,
      agentName: classified.agentName,
      rawUserAgent: classified.rawUserAgent.slice(0, MAX_USER_AGENT_CHARS),
      isKnownAgent: classified.isKnownAgent,
    });

    // Check against the optional threshold. Fires the onAnalyticsThreshold callback if set.
    const settings = await ctx.db.query("settings").unique();
    if (!settings?.analyticsThreshold || !settings.onAnalyticsThreshold) return null;

    // Count total requests for the current day. Cheap bounded scan using the by_requested_at index.
    const dayStart = args.requestedAt - 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("agentRequests")
      .withIndex("by_requested_at", (q) => q.gte("requestedAt", dayStart))
      .take(10000);
    if (recent.length >= settings.analyticsThreshold) {
      // Stored function handle. Actual dispatch handled at the app layer.
      // No-op stub here. See notes in src/component/generation.ts invokeOnGenerationComplete.
    }
    return null;
  },
});

export const getSummary = query({
  args: { now: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      windowStartedAt: v.number(),
      totalRequests: v.number(),
      byAgent: v.record(v.string(), v.number()),
      byFile: v.record(v.string(), v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("settings").unique();
    if (!settings?.analyticsEnabled) return null;
    const since = args.now - 30 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("agentRequests")
      .withIndex("by_requested_at", (q) => q.gte("requestedAt", since))
      .take(10000);
    const byAgent = new Map<string, number>();
    const byFile = new Map<string, number>();
    for (const row of rows) {
      byAgent.set(row.agentName, (byAgent.get(row.agentName) ?? 0) + 1);
      byFile.set(row.fileType, (byFile.get(row.fileType) ?? 0) + 1);
    }
    return {
      windowStartedAt: since,
      totalRequests: rows.length,
      byAgent: Object.fromEntries(byAgent),
      byFile: Object.fromEntries(byFile),
    };
  },
});

export const getTimeSeries = query({
  args: { now: v.number(), bucketHours: v.optional(v.number()) },
  returns: v.array(v.object({ timestamp: v.number(), count: v.number() })),
  handler: async (ctx, args) => {
    const bucketMs = (args.bucketHours ?? 24) * 60 * 60 * 1000;
    const since = args.now - 30 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("agentRequests")
      .withIndex("by_requested_at", (q) => q.gte("requestedAt", since))
      .take(10000);
    const buckets = new Map<number, number>();
    for (const row of rows) {
      const bucket = Math.floor(row.requestedAt / bucketMs) * bucketMs;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, count]) => ({ timestamp, count }));
  },
});

export const cleanupOldRequests = mutation({
  args: { olderThanMs: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("settings").unique();
    const retention =
      args.olderThanMs ??
      (settings?.analyticsRequestRetentionDays ?? 90) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retention;
    const rows = await ctx.db
      .query("agentRequests")
      .withIndex("by_requested_at", (q) => q.lt("requestedAt", cutoff))
      .take(1000);
    let deleted = 0;
    for (const row of rows) {
      await ctx.db.delete(row._id);
      deleted++;
    }
    return deleted;
  },
});

// Internal version for server-to-server calls (cron worker)
export const internalCleanupOldRequests = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("settings").unique();
    const retention =
      args.olderThanMs ??
      (settings?.analyticsRequestRetentionDays ?? 90) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retention;
    const rows = await ctx.db
      .query("agentRequests")
      .withIndex("by_requested_at", (q) => q.lt("requestedAt", cutoff))
      .take(1000);
    let deleted = 0;
    for (const row of rows) {
      await ctx.db.delete(row._id);
      deleted++;
    }
    return deleted;
  },
});

export const cleanupOrphanedCacheEntries = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rows = await ctx.db.query("cachedFiles").take(1000);
    let deleted = 0;
    for (const row of rows) {
      // Drop cachedFiles rows older than 90 days that are in a failed state.
      if (
        row.status === "failed" &&
        row.generatedAt < Date.now() - 90 * 24 * 60 * 60 * 1000
      ) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return deleted;
  },
});
