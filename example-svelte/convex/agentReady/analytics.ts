import { query } from "../_generated/server";
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

// Demo wrappers expose browser-safe app API refs and delegate to the component.
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
