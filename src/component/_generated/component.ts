/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    analytics: {
      cleanupOldRequests: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs?: number },
        number,
        Name
      >;
      cleanupOrphanedCacheEntries: FunctionReference<
        "mutation",
        "internal",
        {},
        number,
        Name
      >;
      getSummary: FunctionReference<
        "query",
        "internal",
        { now: number },
        null | {
          byAgent: Record<string, number>;
          byFile: Record<string, number>;
          totalRequests: number;
          windowStartedAt: number;
        },
        Name
      >;
      getTimeSeries: FunctionReference<
        "query",
        "internal",
        { bucketHours?: number; now: number },
        Array<{ count: number; timestamp: number }>,
        Name
      >;
      recordRequest: FunctionReference<
        "mutation",
        "internal",
        {
          fileType: "llms.txt" | "agents.md" | "llms-full.txt";
          requestedAt: number;
          userAgent: string;
        },
        null,
        Name
      >;
    };
    content: {
      archivePage: FunctionReference<
        "mutation",
        "internal",
        { path: string },
        null,
        Name
      >;
      deleteEndpoint: FunctionReference<
        "mutation",
        "internal",
        { method: string; path: string },
        null,
        Name
      >;
      deletePage: FunctionReference<
        "mutation",
        "internal",
        { path: string },
        null,
        Name
      >;
      draftPage: FunctionReference<
        "mutation",
        "internal",
        { path: string },
        null,
        Name
      >;
      generateDescriptions: FunctionReference<
        "action",
        "internal",
        { force?: boolean },
        { provider: "claude" | "openai"; queued: number },
        Name
      >;
      getCachedFile: FunctionReference<
        "query",
        "internal",
        { fileType: "llms.txt" | "agents.md" | "llms-full.txt" },
        null | {
          _creationTime: number;
          _id: string;
          content: string;
          fileType: "llms.txt" | "agents.md" | "llms-full.txt";
          generatedAt: number;
          generatedFromVersion: string;
          lastJobId?: string;
          previousContent?: string;
          previousGeneratedAt?: number;
          status: "current" | "generating" | "failed";
        },
        Name
      >;
      getCacheStatus: FunctionReference<
        "query",
        "internal",
        {},
        {
          appName: string | null;
          appUrl: string | null;
          fullTxtEnabled: boolean;
          generatedFromVersion: string | null;
          generationInProgress: boolean;
          hasDrafts: boolean;
          lastGeneratedAt: number | null;
          testMode: boolean;
        },
        Name
      >;
      getGenerationStatus: FunctionReference<
        "query",
        "internal",
        { jobId: string },
        {
          files?: Array<{
            fileType: "llms.txt" | "agents.md" | "llms-full.txt";
            generatedAt: number;
            status: "current" | "generating" | "failed";
            version: string;
          }>;
          jobId: string;
          state: "unknown" | "failed" | "running" | "complete";
        },
        Name
      >;
      getPageVersions: FunctionReference<
        "query",
        "internal",
        { path: string },
        Array<{
          _creationTime: number;
          _id: string;
          description: string;
          fullContent?: string;
          pagePath: string;
          snapshotAt: number;
          status: "draft" | "published" | "archived";
          title: string;
        }>,
        Name
      >;
      getSettings: FunctionReference<
        "query",
        "internal",
        {},
        null | {
          _creationTime: number;
          _id: string;
          agentInstructions?: string;
          aiDescriptionsEnabled: boolean;
          aiProvider?: "claude" | "openai";
          analyticsEnabled: boolean;
          analyticsRequestRetentionDays: number;
          analyticsThreshold?: number;
          appName: string;
          appUrl: string;
          contactEmail?: string;
          cronEnabled: boolean;
          cronIntervalHours: number;
          description: string;
          fullTxtEnabled: boolean;
          onAnalyticsThreshold?: string;
          onGenerationComplete?: string;
          permissiveMode: boolean;
          testMode: boolean;
          theme: "light" | "dark" | "system";
          versioningEnabled: boolean;
          widgetPosition:
            | "footer"
            | "floating-bottom-right"
            | "floating-bottom-left";
        },
        Name
      >;
      listApiEndpoints: FunctionReference<
        "query",
        "internal",
        { includeAllStatuses?: boolean },
        Array<{
          _creationTime: number;
          _id: string;
          deletedAt?: number;
          description: string;
          descriptionGeneratedByAi?: boolean;
          group?: string;
          method: string;
          path: string;
          status: "draft" | "published" | "archived";
        }>,
        Name
      >;
      listPages: FunctionReference<
        "query",
        "internal",
        { includeAllStatuses?: boolean },
        Array<{
          _creationTime: number;
          _id: string;
          deletedAt?: number;
          description: string;
          descriptionGeneratedByAi?: boolean;
          fullContent?: string;
          isOptional?: boolean;
          order?: number;
          path: string;
          status: "draft" | "published" | "archived";
          title: string;
        }>,
        Name
      >;
      publishPage: FunctionReference<
        "mutation",
        "internal",
        { path: string },
        null,
        Name
      >;
      regenerateAll: FunctionReference<"action", "internal", {}, string, Name>;
      restorePage: FunctionReference<
        "mutation",
        "internal",
        { path: string },
        null,
        Name
      >;
      rollbackCache: FunctionReference<
        "mutation",
        "internal",
        { fileType: "llms.txt" | "agents.md" | "llms-full.txt" },
        null,
        Name
      >;
      sync: FunctionReference<
        "action",
        "internal",
        {
          config: {
            endpoints?: Array<{
              description?: string;
              descriptionGeneratedByAi?: boolean;
              group?: string;
              method: string;
              path: string;
              status?: "draft" | "published" | "archived";
            }>;
            pages?: Array<{
              description?: string;
              descriptionGeneratedByAi?: boolean;
              fullContent?: string;
              isOptional?: boolean;
              order?: number;
              path: string;
              status?: "draft" | "published" | "archived";
              title: string;
            }>;
            settings?: {
              agentInstructions?: string;
              aiDescriptionsEnabled?: boolean;
              aiProvider?: "claude" | "openai";
              analyticsEnabled?: boolean;
              analyticsRequestRetentionDays?: number;
              analyticsThreshold?: number;
              appName?: string;
              appUrl?: string;
              contactEmail?: string;
              cronEnabled?: boolean;
              cronIntervalHours?: number;
              description?: string;
              fullTxtEnabled?: boolean;
              onAnalyticsThreshold?: string;
              onGenerationComplete?: string;
              permissiveMode?: boolean;
              testMode?: boolean;
              theme?: "light" | "dark" | "system";
              versioningEnabled?: boolean;
              widgetPosition?:
                | "footer"
                | "floating-bottom-right"
                | "floating-bottom-left";
            };
          };
        },
        { jobId: string; ok: true },
        Name
      >;
      upsertEndpoint: FunctionReference<
        "mutation",
        "internal",
        {
          description: string;
          descriptionGeneratedByAi?: boolean;
          group?: string;
          method: string;
          path: string;
          status?: "draft" | "published" | "archived";
        },
        string,
        Name
      >;
      upsertPage: FunctionReference<
        "mutation",
        "internal",
        {
          description: string;
          descriptionGeneratedByAi?: boolean;
          fullContent?: string;
          isOptional?: boolean;
          order?: number;
          path: string;
          status?: "draft" | "published" | "archived";
          title: string;
        },
        string,
        Name
      >;
      upsertSettings: FunctionReference<
        "mutation",
        "internal",
        {
          patch: {
            agentInstructions?: string;
            aiDescriptionsEnabled?: boolean;
            aiProvider?: "claude" | "openai";
            analyticsEnabled?: boolean;
            analyticsRequestRetentionDays?: number;
            analyticsThreshold?: number;
            appName?: string;
            appUrl?: string;
            contactEmail?: string;
            cronEnabled?: boolean;
            cronIntervalHours?: number;
            description?: string;
            fullTxtEnabled?: boolean;
            onAnalyticsThreshold?: string;
            onGenerationComplete?: string;
            permissiveMode?: boolean;
            testMode?: boolean;
            theme?: "light" | "dark" | "system";
            versioningEnabled?: boolean;
            widgetPosition?:
              | "footer"
              | "floating-bottom-right"
              | "floating-bottom-left";
          };
        },
        {
          _creationTime: number;
          _id: string;
          agentInstructions?: string;
          aiDescriptionsEnabled: boolean;
          aiProvider?: "claude" | "openai";
          analyticsEnabled: boolean;
          analyticsRequestRetentionDays: number;
          analyticsThreshold?: number;
          appName: string;
          appUrl: string;
          contactEmail?: string;
          cronEnabled: boolean;
          cronIntervalHours: number;
          description: string;
          fullTxtEnabled: boolean;
          onAnalyticsThreshold?: string;
          onGenerationComplete?: string;
          permissiveMode: boolean;
          testMode: boolean;
          theme: "light" | "dark" | "system";
          versioningEnabled: boolean;
          widgetPosition:
            | "footer"
            | "floating-bottom-right"
            | "floating-bottom-left";
        },
        Name
      >;
    };
  };
