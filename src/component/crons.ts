import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Dynamic cron worker. Registered with @convex-dev/crons at setup time.
// The component's settings row dictates the cadence. When settings change, the app reschedules
// the cron via ctx.runMutation against the @convex-dev/crons component API.
export const runCronCycle = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await ctx.runQuery(internal.content.getSettingsInternal, {});
    if (!settings || !settings.cronEnabled) return null;
    await ctx.runAction(internal.generation.runGeneration, {
      jobId: `cron-${Date.now()}`,
    });
    // Also trim old analytics rows. Public mutation so we reach it via the api ref.
    await ctx.runMutation(api.analytics.cleanupOldRequests, {});
    return null;
  },
});
