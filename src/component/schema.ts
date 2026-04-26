import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Status literal reused across pages and endpoints.
const contentStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

// File type literal reused across cached files and analytics.
const fileType = v.union(
  v.literal("llms.txt"),
  v.literal("agents.md"),
  v.literal("llms-full.txt"),
);

export default defineSchema({
  // Singleton row. Queried without a filter, written with upsert semantics.
  settings: defineTable({
    appName: v.string(),
    appUrl: v.string(),
    description: v.string(),
    agentInstructions: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    widgetPosition: v.union(
      v.literal("footer"),
      v.literal("floating-bottom-right"),
      v.literal("floating-bottom-left"),
      v.literal("floating-center"),
    ),
    widgetStatusVisible: v.optional(v.boolean()),
    widgetColors: v.optional(
      v.object({
        bg: v.optional(v.string()),
        border: v.optional(v.string()),
        textActive: v.optional(v.string()),
        textInactive: v.optional(v.string()),
        tabActiveBg: v.optional(v.string()),
        accent: v.optional(v.string()),
      }),
    ),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    testMode: v.boolean(),
    cronEnabled: v.boolean(),
    cronIntervalHours: v.number(),
    analyticsEnabled: v.boolean(),
    analyticsRequestRetentionDays: v.number(),
    analyticsThreshold: v.optional(v.number()),
    aiDescriptionsEnabled: v.boolean(),
    aiProvider: v.optional(v.union(v.literal("claude"), v.literal("openai"))),
    fullTxtEnabled: v.boolean(),
    permissiveMode: v.boolean(),
    versioningEnabled: v.boolean(),
    // Stored function handles for event callbacks. Populated by registerRoutes options.
    onGenerationComplete: v.optional(v.string()),
    onAnalyticsThreshold: v.optional(v.string()),
  }),

  pages: defineTable({
    title: v.string(),
    path: v.string(),
    description: v.string(),
    fullContent: v.optional(v.string()),
    status: contentStatus,
    isOptional: v.optional(v.boolean()),
    order: v.optional(v.number()),
    descriptionGeneratedByAi: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_path", ["path"])
    .index("by_status_order", ["status", "order"])
    .index("by_deleted", ["deletedAt"]),

  apiEndpoints: defineTable({
    method: v.string(),
    path: v.string(),
    description: v.string(),
    group: v.optional(v.string()),
    status: contentStatus,
    descriptionGeneratedByAi: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_method_path", ["method", "path"])
    .index("by_status_group", ["status", "group"])
    .index("by_deleted", ["deletedAt"]),

  cachedFiles: defineTable({
    fileType,
    content: v.string(),
    generatedAt: v.number(),
    generatedFromVersion: v.string(),
    previousContent: v.optional(v.string()),
    previousGeneratedAt: v.optional(v.number()),
    status: v.union(
      v.literal("current"),
      v.literal("generating"),
      v.literal("failed"),
    ),
    lastJobId: v.optional(v.string()),
  })
    .index("by_file_type", ["fileType"])
    .index("by_status", ["status"]),

  agentRequests: defineTable({
    fileType,
    requestedAt: v.number(),
    agentName: v.string(),
    rawUserAgent: v.string(),
    isKnownAgent: v.boolean(),
  })
    .index("by_requested_at", ["requestedAt"])
    .index("by_agent_name_time", ["agentName", "requestedAt"]),

  // Opt-in version history. Only written when settings.versioningEnabled is true.
  pageVersions: defineTable({
    pagePath: v.string(),
    snapshotAt: v.number(),
    title: v.string(),
    description: v.string(),
    fullContent: v.optional(v.string()),
    status: contentStatus,
  }).index("by_page_snapshot", ["pagePath", "snapshotAt"]),
});
