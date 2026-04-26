import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  pageDocValidator,
  settingsDocValidator,
  syncConfigValidator,
} from "./validators.js";
import { v } from "convex/values";

export const getSettings = internalQuery({
  args: {},
  returns: v.union(v.null(), settingsDocValidator),
  handler: async (ctx) => (await ctx.db.query("settings").unique()) ?? null,
});

export const listPages = internalQuery({
  args: {},
  returns: v.array(pageDocValidator),
  handler: async (ctx) => await ctx.db.query("pages").collect(),
});

export const invalidateCache = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const jobId = crypto.randomUUID();
    const rows = await ctx.db.query("cachedFiles").collect();
    await Promise.all(
      rows.map((row) =>
        ctx.db.patch(row._id, { status: "generating", lastJobId: jobId }),
      ),
    );
    await ctx.scheduler.runAfter(0, internal.generation.runGeneration, { jobId });
    return jobId;
  },
});

export const applySyncConfig = internalMutation({
  args: { config: syncConfigValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { settings, pages, endpoints } = args.config ?? {};
    if (settings) {
      const existing = await ctx.db.query("settings").unique();
      if (!existing) {
        await ctx.db.insert("settings", {
          appName: settings.appName ?? "Unnamed app",
          appUrl: settings.appUrl ?? "https://example.com",
          description: settings.description ?? "",
          widgetPosition: settings.widgetPosition ?? "floating-bottom-right",
          theme: settings.theme ?? "system",
          testMode: settings.testMode ?? true,
          cronEnabled: settings.cronEnabled ?? true,
          cronIntervalHours: settings.cronIntervalHours ?? 24,
          analyticsEnabled: settings.analyticsEnabled ?? false,
          analyticsRequestRetentionDays: settings.analyticsRequestRetentionDays ?? 90,
          aiDescriptionsEnabled: settings.aiDescriptionsEnabled ?? false,
          fullTxtEnabled: settings.fullTxtEnabled ?? false,
          permissiveMode: settings.permissiveMode ?? false,
          versioningEnabled: settings.versioningEnabled ?? false,
          contentSignals: settings.contentSignals,
          markdownNegotiation: settings.markdownNegotiation,
          discoveryHeaders: settings.discoveryHeaders,
          robotsTxtEnabled: settings.robotsTxtEnabled,
          robotsTxtAllowAiBots: settings.robotsTxtAllowAiBots,
          robotsTxtDisallowPaths: settings.robotsTxtDisallowPaths,
          sitemapEnabled: settings.sitemapEnabled,
          agentSkillsEnabled: settings.agentSkillsEnabled,
          readinessEndpointEnabled: settings.readinessEndpointEnabled,
          widgetShowScoreTab: settings.widgetShowScoreTab,
          widgetCleanMode: settings.widgetCleanMode,
          widgetShowHumanTab: settings.widgetShowHumanTab,
          widgetShowMachineTab: settings.widgetShowMachineTab,
          widgetShowChatLinks: settings.widgetShowChatLinks,
          widgetShowChatGPT: settings.widgetShowChatGPT,
          widgetShowClaude: settings.widgetShowClaude,
          widgetShowPerplexity: settings.widgetShowPerplexity,
        });
      } else {
        await ctx.db.patch(existing._id, settings);
      }
    }
    if (Array.isArray(pages)) {
      for (const page of pages) {
        const existing = await ctx.db
          .query("pages")
          .withIndex("by_path", (q) => q.eq("path", page.path))
          .unique();
        if (!existing) {
          await ctx.db.insert("pages", {
            title: page.title,
            path: page.path,
            description: page.description ?? "",
            fullContent: page.fullContent,
            status: page.status ?? "published",
            isOptional: page.isOptional,
            order: page.order,
          });
        } else {
          await ctx.db.patch(existing._id, page);
        }
      }
    }
    if (Array.isArray(endpoints)) {
      for (const endpoint of endpoints) {
        const existing = await ctx.db
          .query("apiEndpoints")
          .withIndex("by_method_path", (q) =>
            q.eq("method", endpoint.method).eq("path", endpoint.path),
          )
          .unique();
        if (!existing) {
          await ctx.db.insert("apiEndpoints", {
            method: endpoint.method,
            path: endpoint.path,
            description: endpoint.description ?? "",
            group: endpoint.group,
            status: endpoint.status ?? "published",
          });
        } else {
          await ctx.db.patch(existing._id, endpoint);
        }
      }
    }
    return null;
  },
});
