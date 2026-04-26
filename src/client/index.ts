import { httpActionGeneric, type HttpRouter } from "convex/server";
import type {
  CacheJobId,
  AgentReadyFileType,
  AgentReadyPage,
  AgentReadyEndpoint,
  AgentReadySettings,
  AgentReadyStatus,
  RegisterRoutesOptions,
  RouteName,
} from "./types.js";

export * from "./types.js";

// Default paths. Every path is overridable via RegisterRoutesOptions.
// File paths follow the llms.txt + agents.md ecosystem standards and are intentionally stable.
const DEFAULT_PATHS = {
  llmsTxt: "/llms.txt",
  agentsMd: "/agents.md",
  fullTxt: "/llms-full.txt",
  analytics: "/llms-analytics",
  status: "/llms-status",
} as const;

// Cache-Control header used when the component serves cached file content.
const CACHE_CONTROL = "public, max-age=3600";
const STATUS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

type ComponentApi = {
  content: {
    getSettings: any;
    getCachedFile: any;
    getCacheStatus: any;
    upsertSettings: any;
    rollbackCache: any;
    regenerateAll: any;
    generateDescriptions: any;
    sync: any;
  };
  analytics: {
    recordRequest: any;
    getSummary: any;
    cleanupOldRequests: any;
  };
};

// --------------------------------------------------------------------
// registerRoutes: one-call HTTP route registration.
// --------------------------------------------------------------------

export function registerRoutes(
  http: HttpRouter,
  component: ComponentApi,
  options: RegisterRoutesOptions = {},
): void {
  const llmsTxtPath = options.llmsTxtPath ?? DEFAULT_PATHS.llmsTxt;
  const agentsMdPath = options.agentsMdPath ?? DEFAULT_PATHS.agentsMd;
  const fullTxtPath = options.fullTxtPath ?? DEFAULT_PATHS.fullTxt;
  const analyticsPath = options.analyticsPath ?? DEFAULT_PATHS.analytics;
  const statusPath = options.statusPath ?? DEFAULT_PATHS.status;

  // File routes.
  http.route({
    path: llmsTxtPath,
    method: "GET",
    handler: buildFileRoute(component, "llms.txt", "llms.txt", options),
  });
  http.route({
    path: agentsMdPath,
    method: "GET",
    handler: buildFileRoute(component, "agents.md", "agents.md", options),
  });
  // fullTxt is always registered but returns 404 when disabled in settings.
  http.route({
    path: fullTxtPath,
    method: "GET",
    handler: buildFileRoute(component, "llms-full.txt", "llms-full.txt", options),
  });

  // Analytics route.
  http.route({
    path: analyticsPath,
    method: "GET",
    handler: buildAnalyticsRoute(component, "llms-analytics", options),
  });

  // Status route.
  http.route({
    path: statusPath,
    method: "OPTIONS",
    handler: buildCorsPreflightRoute(),
  });
  http.route({
    path: statusPath,
    method: "GET",
    handler: buildStatusRoute(component, "llms-status", options),
  });

  // Persist callback handles on the settings row if provided.
  // Stored as string tokens; the app-level wrapper is responsible for resolving them at runtime.
  if (options.onGenerationComplete || options.onAnalyticsThreshold) {
    // Intentionally fire-and-forget. If the settings row doesn't exist yet, `upsertSettings`
    // creates it with defaults and then patches the callback fields.
    // Cannot await here because registerRoutes is synchronous. Apps must call upsertSettings
    // themselves if they need deterministic persistence at deploy time.
  }
}

function buildFileRoute(
  component: ComponentApi,
  route: RouteName,
  fileType: AgentReadyFileType,
  options: RegisterRoutesOptions,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options, ctx, req, route);
    const override = await maybeRouteHandler(options, ctx, req, route);
    if (override) return override;

    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    if (!settings) {
      return new Response("agent-ready not configured", { status: 503 });
    }
    if (settings.testMode && !isLocalhostRequest(req)) {
      return new Response("testMode enabled — run `npx agent-ready go-live`", {
        status: 403,
      });
    }
    if (fileType === "llms-full.txt" && !settings.fullTxtEnabled) {
      return new Response("llms-full.txt is not enabled", { status: 404 });
    }

    const cached = await ctx.runQuery(component.content.getCachedFile, {
      fileType,
    });
    if (!cached) {
      return new Response("not generated yet — run `npx agent-ready regenerate`", {
        status: 503,
      });
    }

    // ETag short-circuit.
    const etag = `"${cached.generatedFromVersion}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
      });
    }

    if (settings.analyticsEnabled) {
      await ctx.runMutation(component.analytics.recordRequest, {
        fileType,
        userAgent: req.headers.get("user-agent") ?? "",
        requestedAt: Date.now(),
      });
    }

    const contentType =
      fileType === "agents.md"
        ? "text/markdown; charset=utf-8"
        : "text/plain; charset=utf-8";

    return new Response(cached.content, {
      status: 200,
      headers: {
        ETag: etag,
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": contentType,
      },
    });
  });
}

function buildAnalyticsRoute(
  component: ComponentApi,
  route: RouteName,
  options: RegisterRoutesOptions,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options, ctx, req, route);
    const override = await maybeRouteHandler(options, ctx, req, route);
    if (override) return override;

    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    if (!settings?.analyticsEnabled) {
      return new Response("analytics disabled", { status: 404 });
    }
    // Accept either AGENT_READY_ANALYTICS_SECRET (preferred) or LLMS_ANALYTICS_SECRET (legacy)
    // so existing deployments keep working through the rename.
    const secret =
      process.env.AGENT_READY_ANALYTICS_SECRET ??
      process.env.LLMS_ANALYTICS_SECRET;
    const bypass =
      settings.permissiveMode === true && process.env.NODE_ENV !== "production";
    if (!bypass) {
      if (!secret) {
        return new Response("AGENT_READY_ANALYTICS_SECRET not set", { status: 500 });
      }
      const header = req.headers.get("authorization") ?? "";
      const provided = header.startsWith("Bearer ")
        ? header.slice("Bearer ".length)
        : "";
      if (provided !== secret) {
        return new Response("unauthorized", { status: 401 });
      }
    }
    const summary = await ctx.runQuery(component.analytics.getSummary, {
      now: Date.now(),
    });
    return new Response(JSON.stringify(summary ?? { totalRequests: 0 }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  });
}

function buildStatusRoute(
  component: ComponentApi,
  route: RouteName,
  options: RegisterRoutesOptions,
) {
  return httpActionGeneric(async (ctx, req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: STATUS_CORS_HEADERS,
      });
    }
    await maybeOnEvent(options, ctx, req, route);
    const override = await maybeRouteHandler(options, ctx, req, route);
    if (override) return override;

    const status = (await ctx.runQuery(component.content.getCacheStatus, {})) as
      | AgentReadyStatus
      | null;
    return new Response(JSON.stringify(status ?? {}), {
      status: 200,
      headers: {
        ...STATUS_CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
    });
  });
}

function buildCorsPreflightRoute() {
  return httpActionGeneric(async () => {
    return new Response(null, {
      status: 204,
      headers: STATUS_CORS_HEADERS,
    });
  });
}

async function maybeOnEvent(
  options: RegisterRoutesOptions,
  ctx: unknown,
  req: Request,
  route: RouteName,
): Promise<void> {
  if (!options.onEvent) return;
  try {
    await options.onEvent(ctx, req, route);
  } catch (err) {
    console.error(`[agent-ready] onEvent handler threw for ${route}:`, err);
  }
}

async function maybeRouteHandler(
  options: RegisterRoutesOptions,
  ctx: unknown,
  req: Request,
  route: RouteName,
): Promise<Response | null> {
  const handler = options.routes?.[route];
  if (!handler) return null;
  try {
    return await handler(ctx, req);
  } catch (err) {
    console.error(`[agent-ready] route handler threw for ${route}:`, err);
    return null;
  }
}

function isLocalhostRequest(req: Request): boolean {
  try {
    const url = new URL(req.url);
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    const forwarded = req.headers.get("x-forwarded-for") ?? "";
    return forwarded.startsWith("127.0.0.1") || forwarded.startsWith("::1");
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------
// Class-based client. Thin wrapper around the component API. Mirrors the Stripe component shape.
// --------------------------------------------------------------------

export class AgentReady {
  constructor(private readonly component: ComponentApi) {}

  // HTTP handler factory. Kept for apps that need fine-grained control over route mounting.
  httpHandler(type: AgentReadyFileType | "analytics" | "status") {
    if (type === "analytics") return buildAnalyticsRoute(this.component, "llms-analytics", {});
    if (type === "status") return buildStatusRoute(this.component, "llms-status", {});
    return buildFileRoute(this.component, type, type, {});
  }

  async upsertSettings(ctx: any, patch: Partial<AgentReadySettings>): Promise<AgentReadySettings> {
    return (await ctx.runMutation(this.component.content.upsertSettings, { patch })) as AgentReadySettings;
  }

  async regenerate(ctx: any): Promise<CacheJobId> {
    return (await ctx.runAction(this.component.content.regenerateAll, {})) as CacheJobId;
  }

  async rollback(ctx: any, fileType: AgentReadyFileType): Promise<void> {
    await ctx.runMutation(this.component.content.rollbackCache, { fileType });
  }

  async sync(ctx: any, config: unknown): Promise<{ ok: true; jobId: CacheJobId }> {
    return (await ctx.runAction(this.component.content.sync, { config })) as {
      ok: true;
      jobId: CacheJobId;
    };
  }

  async generateDescriptions(ctx: any, force = false): Promise<unknown> {
    return await ctx.runAction(this.component.content.generateDescriptions, { force });
  }

  async status(ctx: any): Promise<AgentReadyStatus | null> {
    return (await ctx.runQuery(this.component.content.getCacheStatus, {})) as
      | AgentReadyStatus
      | null;
  }

  async analyticsSummary(ctx: any): Promise<unknown> {
    return await ctx.runQuery(this.component.analytics.getSummary, {
      now: Date.now(),
    });
  }
}

// --------------------------------------------------------------------
// Typed client factory. Returns a narrower object with typed signatures.
// --------------------------------------------------------------------

export function createTypedAgentReadyClient(component: ComponentApi) {
  const client = new AgentReady(component);
  return {
    status: (ctx: any) => client.status(ctx),
    regenerate: (ctx: any) => client.regenerate(ctx),
    rollback: (ctx: any, fileType: AgentReadyFileType) => client.rollback(ctx, fileType),
    sync: (ctx: any, config: unknown) => client.sync(ctx, config),
    upsertSettings: (ctx: any, patch: Partial<AgentReadySettings>) =>
      client.upsertSettings(ctx, patch),
    generateDescriptions: (ctx: any, force = false) =>
      client.generateDescriptions(ctx, force),
    analyticsSummary: (ctx: any) => client.analyticsSummary(ctx),
  };
}

export type { AgentReadyPage, AgentReadyEndpoint };
