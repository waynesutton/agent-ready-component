import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
// Shared return validator for getCacheStatus. Imported from the package so
// it stays in sync with the component when upgrades add fields.
import { cacheStatusValidator } from "@waynesutton/agent-ready";
import { authMutation, authAction, assertAdmin } from "../functions";

const fileTypeValidator = v.union(
  v.literal("llms.txt"),
  v.literal("agents.md"),
  v.literal("llms-full.txt"),
  v.literal("site.md"),
  v.literal("robots.txt"),
  v.literal("sitemap.xml"),
  v.literal("agent-skills.json"),
  v.literal("rss.xml"),
);

const pageStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const pageValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  title: v.string(),
  path: v.string(),
  description: v.string(),
  fullContent: v.optional(v.string()),
  status: pageStatusValidator,
  isOptional: v.optional(v.boolean()),
  order: v.optional(v.number()),
  section: v.optional(v.string()),
  descriptionGeneratedByAi: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
});

// Public read-only queries (no auth needed)
export const getCacheStatus = query({
  args: {},
  returns: cacheStatusValidator,
  handler: async (ctx) => {
    return await ctx.runQuery(components.agentReady.content.getCacheStatus, {});
  },
});

export const listPages = query({
  args: { includeAllStatuses: v.optional(v.boolean()) },
  returns: v.array(pageValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.agentReady.content.listPages, args);
  },
});

// Auth-protected admin mutations (requires ADMIN_EMAILS env var)
export const publishPage = authMutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.runMutation(components.agentReady.content.publishPage, args);
    return null;
  },
});

export const draftPage = authMutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.runMutation(components.agentReady.content.draftPage, args);
    return null;
  },
});

export const archivePage = authMutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.runMutation(components.agentReady.content.archivePage, args);
    return null;
  },
});

export const rollbackCache = authMutation({
  args: { fileType: fileTypeValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.runMutation(components.agentReady.content.rollbackCache, args);
    return null;
  },
});

export const regenerateAll = authAction({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.runAction(components.agentReady.content.regenerateAll, {});
  },
});
