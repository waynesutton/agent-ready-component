import { v } from "convex/values";

export const contentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const fileTypeValidator = v.union(
  v.literal("llms.txt"),
  v.literal("agents.md"),
  v.literal("llms-full.txt"),
  v.literal("robots.txt"),
  v.literal("sitemap.xml"),
  v.literal("agent-skills.json"),
);

export const contentSignalsValidator = v.object({
  aiTrain: v.boolean(),
  search: v.boolean(),
  aiInput: v.boolean(),
});

export const widgetPositionValidator = v.union(
  v.literal("footer"),
  v.literal("floating-bottom-right"),
  v.literal("floating-bottom-left"),
  v.literal("floating-center"),
);

export const widgetColorsValidator = v.object({
  bg: v.optional(v.string()),
  border: v.optional(v.string()),
  textActive: v.optional(v.string()),
  textInactive: v.optional(v.string()),
  tabActiveBg: v.optional(v.string()),
  accent: v.optional(v.string()),
});

export const themeValidator = v.union(
  v.literal("light"),
  v.literal("dark"),
  v.literal("system"),
);

export const aiProviderValidator = v.union(v.literal("claude"), v.literal("openai"));

export const settingsPatchValidator = v.object({
  appName: v.optional(v.string()),
  appUrl: v.optional(v.string()),
  description: v.optional(v.string()),
  agentInstructions: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  widgetPosition: v.optional(widgetPositionValidator),
  widgetStatusVisible: v.optional(v.boolean()),
  widgetShowFiles: v.optional(v.boolean()),
  widgetShowAppName: v.optional(v.boolean()),
  widgetShowDescription: v.optional(v.boolean()),
  widgetShowMeta: v.optional(v.boolean()),
  widgetShowScoreTab: v.optional(v.boolean()),
  widgetColors: v.optional(widgetColorsValidator),
  theme: v.optional(themeValidator),
  testMode: v.optional(v.boolean()),
  cronEnabled: v.optional(v.boolean()),
  cronIntervalHours: v.optional(v.number()),
  analyticsEnabled: v.optional(v.boolean()),
  analyticsRequestRetentionDays: v.optional(v.number()),
  analyticsThreshold: v.optional(v.number()),
  aiDescriptionsEnabled: v.optional(v.boolean()),
  aiProvider: v.optional(aiProviderValidator),
  fullTxtEnabled: v.optional(v.boolean()),
  permissiveMode: v.optional(v.boolean()),
  versioningEnabled: v.optional(v.boolean()),
  contentSignals: v.optional(contentSignalsValidator),
  markdownNegotiation: v.optional(v.boolean()),
  discoveryHeaders: v.optional(v.boolean()),
  robotsTxtEnabled: v.optional(v.boolean()),
  robotsTxtAllowAiBots: v.optional(v.boolean()),
  robotsTxtDisallowPaths: v.optional(v.array(v.string())),
  sitemapEnabled: v.optional(v.boolean()),
  agentSkillsEnabled: v.optional(v.boolean()),
  readinessEndpointEnabled: v.optional(v.boolean()),
  onGenerationComplete: v.optional(v.string()),
  onAnalyticsThreshold: v.optional(v.string()),
});

export const settingsDocValidator = v.object({
  _id: v.id("settings"),
  _creationTime: v.number(),
  appName: v.string(),
  appUrl: v.string(),
  description: v.string(),
  agentInstructions: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  widgetPosition: widgetPositionValidator,
  widgetStatusVisible: v.optional(v.boolean()),
  widgetShowFiles: v.optional(v.boolean()),
  widgetShowAppName: v.optional(v.boolean()),
  widgetShowDescription: v.optional(v.boolean()),
  widgetShowMeta: v.optional(v.boolean()),
  widgetShowScoreTab: v.optional(v.boolean()),
  widgetColors: v.optional(widgetColorsValidator),
  theme: themeValidator,
  testMode: v.boolean(),
  cronEnabled: v.boolean(),
  cronIntervalHours: v.number(),
  analyticsEnabled: v.boolean(),
  analyticsRequestRetentionDays: v.number(),
  analyticsThreshold: v.optional(v.number()),
  aiDescriptionsEnabled: v.boolean(),
  aiProvider: v.optional(aiProviderValidator),
  fullTxtEnabled: v.boolean(),
  permissiveMode: v.boolean(),
  versioningEnabled: v.boolean(),
  contentSignals: v.optional(contentSignalsValidator),
  markdownNegotiation: v.optional(v.boolean()),
  discoveryHeaders: v.optional(v.boolean()),
  robotsTxtEnabled: v.optional(v.boolean()),
  robotsTxtAllowAiBots: v.optional(v.boolean()),
  robotsTxtDisallowPaths: v.optional(v.array(v.string())),
  sitemapEnabled: v.optional(v.boolean()),
  agentSkillsEnabled: v.optional(v.boolean()),
  readinessEndpointEnabled: v.optional(v.boolean()),
  onGenerationComplete: v.optional(v.string()),
  onAnalyticsThreshold: v.optional(v.string()),
});

export const pageDocValidator = v.object({
  _id: v.id("pages"),
  _creationTime: v.number(),
  title: v.string(),
  path: v.string(),
  description: v.string(),
  fullContent: v.optional(v.string()),
  status: contentStatusValidator,
  isOptional: v.optional(v.boolean()),
  order: v.optional(v.number()),
  descriptionGeneratedByAi: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
});

export const endpointDocValidator = v.object({
  _id: v.id("apiEndpoints"),
  _creationTime: v.number(),
  method: v.string(),
  path: v.string(),
  description: v.string(),
  group: v.optional(v.string()),
  status: contentStatusValidator,
  descriptionGeneratedByAi: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
});

export const cachedFileDocValidator = v.object({
  _id: v.id("cachedFiles"),
  _creationTime: v.number(),
  fileType: fileTypeValidator,
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
});

export const pageVersionDocValidator = v.object({
  _id: v.id("pageVersions"),
  _creationTime: v.number(),
  pagePath: v.string(),
  snapshotAt: v.number(),
  title: v.string(),
  description: v.string(),
  fullContent: v.optional(v.string()),
  status: contentStatusValidator,
});

export const syncConfigValidator = v.object({
  settings: v.optional(settingsPatchValidator),
  pages: v.optional(
    v.array(
      v.object({
        title: v.string(),
        path: v.string(),
        description: v.optional(v.string()),
        fullContent: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        isOptional: v.optional(v.boolean()),
        order: v.optional(v.number()),
        descriptionGeneratedByAi: v.optional(v.boolean()),
      }),
    ),
  ),
  endpoints: v.optional(
    v.array(
      v.object({
        method: v.string(),
        path: v.string(),
        description: v.optional(v.string()),
        group: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        descriptionGeneratedByAi: v.optional(v.boolean()),
      }),
    ),
  ),
});
