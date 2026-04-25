import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Example event callbacks wired into registerRoutes options.
// Replace these with real app logic — send a webhook, insert a toast row, whatever.

export const handleGenerationComplete = internalMutation({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log(`[myApp] generation complete jobId=${args.jobId}`);
    return null;
  },
});

export const handleAnalyticsThreshold = internalMutation({
  args: { count: v.number(), windowStart: v.number() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log(`[myApp] analytics threshold hit count=${args.count} window=${args.windowStart}`);
    return null;
  },
});
