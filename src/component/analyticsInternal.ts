import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal version of cleanupOldRequests for server-to-server use (cron worker).
export const cleanupOldRequests = internalMutation({
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
