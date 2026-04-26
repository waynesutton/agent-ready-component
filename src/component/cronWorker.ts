import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Dynamic cron worker. Registered with @convex-dev/crons at setup time.
// The component's settings row dictates the cadence. When settings change, the app reschedules
// the cron via ctx.runMutation against the @convex-dev/crons component API.
export const runCronCycle = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await ctx.runQuery(internal.contentInternal.getSettings, {});
    if (!settings || !settings.cronEnabled) return null;
    await ctx.runAction(internal.generation.runGeneration, {
      jobId: `cron-${Date.now()}`,
    });
    await ctx.runMutation(internal.analytics.internalCleanupOldRequests, {});
    return null;
  },
});
