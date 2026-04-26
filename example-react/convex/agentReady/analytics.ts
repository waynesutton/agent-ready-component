import { components } from "../_generated/api";
import { v } from "convex/values";
import { authQuery, assertAdmin } from "../functions";

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

// Admin-only analytics queries
export const getSummary = authQuery({
  args: { now: v.number() },
  returns: summaryValidator,
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.runQuery(components.agentReady.analytics.getSummary, args);
  },
});

export const getTimeSeries = authQuery({
  args: { now: v.number(), bucketHours: v.optional(v.number()) },
  returns: v.array(seriesPointValidator),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.runQuery(components.agentReady.analytics.getTimeSeries, args);
  },
});
