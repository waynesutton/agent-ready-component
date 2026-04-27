import { httpActionGeneric, type HttpRouter } from "convex/server";
import type {
  CacheJobId,
  AgentReadyFileType,
  AgentReadyPage,
  AgentReadyEndpoint,
  AgentReadySettings,
  AgentReadyStatus,
  ReadinessReport,
  ReadinessCheck,
  RegisterRoutesOptions,
  RouteName,
  SkippableRoute,
} from "./types.js";

export * from "./types.js";

const DEFAULT_PATHS = {
  llmsTxt: "/llms.txt",
  agentsMd: "/agents.md",
  fullTxt: "/llms-full.txt",
  analytics: "/llms-analytics",
  status: "/llms-status",
  robotsTxt: "/robots.txt",
  sitemap: "/sitemap.xml",
  agentSkills: "/.well-known/agent-skills",
  readiness: "/llms-readiness",
} as const;

const CACHE_CONTROL = "public, max-age=3600";
const READINESS_CACHE = "public, max-age=300";
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
  const robotsTxtPath = options.robotsTxtPath ?? DEFAULT_PATHS.robotsTxt;
  const sitemapPath = options.sitemapPath ?? DEFAULT_PATHS.sitemap;
  const agentSkillsPath = options.agentSkillsPath ?? DEFAULT_PATHS.agentSkills;
  const readinessPath = options.readinessPath ?? DEFAULT_PATHS.readiness;

  const skip = new Set<SkippableRoute>(options.skipRoutes ?? []);

  // Content file routes. Each is skippable so apps that already publish their own
  // llms.txt, agents.md, or llms-full.txt (static hosting or custom HTTP route)
  // can opt out without breaking the rest of the integration.
  if (!skip.has("/llms.txt")) {
    http.route({
      path: llmsTxtPath,
      method: "GET",
      handler: buildFileRoute(component, "llms.txt", "llms.txt", options),
    });
  }
  if (!skip.has("/agents.md")) {
    http.route({
      path: agentsMdPath,
      method: "GET",
      handler: buildFileRoute(component, "agents.md", "agents.md", options),
    });
  }
  if (!skip.has("/llms-full.txt")) {
    http.route({
      path: fullTxtPath,
      method: "GET",
      handler: buildFileRoute(component, "llms-full.txt", "llms-full.txt", options),
    });
  }

  // Agent readiness file routes (skippable for apps that own these paths)
  if (!skip.has("/robots.txt")) {
    http.route({
      path: robotsTxtPath,
      method: "GET",
      handler: buildFileRoute(component, "robots.txt", "robots.txt", options),
    });
  }
  if (!skip.has("/sitemap.xml")) {
    http.route({
      path: sitemapPath,
      method: "GET",
      handler: buildFileRoute(component, "sitemap.xml", "sitemap.xml", options),
    });
  }
  if (!skip.has("/.well-known/agent-skills")) {
    http.route({
      path: agentSkillsPath,
      method: "GET",
      handler: buildFileRoute(component, "agent-skills", "agent-skills.json", options),
    });
  }

  // Analytics route
  http.route({
    path: analyticsPath,
    method: "GET",
    handler: buildAnalyticsRoute(component, "llms-analytics", options),
  });

  // Status route
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

  // Readiness self-score route
  http.route({
    path: readinessPath,
    method: "OPTIONS",
    handler: buildCorsPreflightRoute(),
  });
  http.route({
    path: readinessPath,
    method: "GET",
    handler: buildReadinessRoute(component, "llms-readiness", options),
  });
}

// Content type map for each file type
function contentTypeForFile(fileType: AgentReadyFileType): string {
  switch (fileType) {
    case "agents.md":
      return "text/markdown; charset=utf-8";
    case "sitemap.xml":
      return "application/xml; charset=utf-8";
    case "agent-skills.json":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

// Feature gate: returns 404 for disabled optional file types.
function isFileEnabled(fileType: AgentReadyFileType, settings: AgentReadySettings): boolean {
  switch (fileType) {
    case "llms-full.txt":
      return !!settings.fullTxtEnabled;
    case "robots.txt":
      return !!settings.robotsTxtEnabled;
    case "sitemap.xml":
      return !!settings.sitemapEnabled;
    case "agent-skills.json":
      return !!settings.agentSkillsEnabled;
    default:
      return true;
  }
}

// Build response headers with agent readiness signals
function buildAgentHeaders(
  settings: AgentReadySettings,
  etag: string,
  contentType: string,
  tokenCount: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    ETag: etag,
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": contentType,
  };

  // M31: Content-Signal header
  const signals = settings.contentSignals ?? { aiTrain: true, search: true, aiInput: true };
  headers["Content-Signal"] = `ai-train=${signals.aiTrain ? "yes" : "no"}, search=${signals.search ? "yes" : "no"}, ai-input=${signals.aiInput ? "yes" : "no"}`;

  // M32: Token count header
  headers["x-markdown-tokens"] = String(tokenCount);

  // M33: Discovery Link headers
  if (settings.discoveryHeaders) {
    const base = settings.appUrl.replace(/\/$/, "");
    const parts: Array<string> = [
      `<${base}/llms.txt>; rel="alternate"; type="text/plain"`,
      `<${base}/agents.md>; rel="alternate"; type="text/markdown"`,
    ];
    if (settings.sitemapEnabled) {
      parts.push(`<${base}/sitemap.xml>; rel="sitemap"; type="application/xml"`);
    }
    headers["Link"] = parts.join(", ");
  }

  // Vary header for markdown negotiation
  if (settings.markdownNegotiation) {
    headers["Vary"] = "Accept";
  }

  return headers;
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
      return new Response("testMode enabled - run `npx agent-ready go-live`", {
        status: 403,
      });
    }
    if (!isFileEnabled(fileType, settings)) {
      return new Response(`${fileType} is not enabled`, { status: 404 });
    }

    const cached = await ctx.runQuery(component.content.getCachedFile, {
      fileType,
    });
    if (!cached) {
      return new Response("not generated yet - run `npx agent-ready regenerate`", {
        status: 503,
      });
    }

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

    const tokenCount = Math.ceil(cached.content.length / 4);
    const headers = buildAgentHeaders(
      settings,
      etag,
      contentTypeForFile(fileType),
      tokenCount,
    );

    return new Response(cached.content, { status: 200, headers });
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

function buildReadinessRoute(
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
    if (!settings) {
      return new Response(JSON.stringify({ error: "not configured" }), {
        status: 503,
        headers: { ...STATUS_CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!settings.readinessEndpointEnabled) {
      return new Response(JSON.stringify({ error: "readiness endpoint disabled" }), {
        status: 404,
        headers: { ...STATUS_CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (settings.testMode && !isLocalhostRequest(req)) {
      return new Response("testMode enabled", { status: 403 });
    }

    const files = await ctx.runQuery(component.content.getCacheStatus, {});
    const allCached = await Promise.all(
      (["llms.txt", "agents.md", "robots.txt", "sitemap.xml", "agent-skills.json"] as const).map(
        async (ft) => {
          const f = await ctx.runQuery(component.content.getCachedFile, { fileType: ft });
          return { fileType: ft, exists: f !== null, length: f?.content?.length ?? 0 };
        },
      ),
    );
    const cached = new Map(allCached.map((c) => [c.fileType, c.exists]));
    // Track content length so we can warn when llms.txt or agents.md is suspiciously thin.
    // Thin content typically means the wizard finished but pages were never imported.
    const cachedLength = new Map(allCached.map((c) => [c.fileType, c.length]));
    const llmsTxtLength = cachedLength.get("llms.txt") ?? 0;
    const agentsMdLength = cachedLength.get("agents.md") ?? 0;
    // 400 chars is roughly "title + description + a single short link block." Anything below
    // that is likely missing pages or a sections list. The threshold is intentionally low so
    // small marketing sites are not flagged.
    const isThin = (len: number) => len > 0 && len < 400;

    const checks: Array<ReadinessCheck> = [
      {
        id: "llms_txt_present",
        label: "llms.txt served",
        category: "content",
        status: cached.get("llms.txt") ? "pass" : "fail",
        points: cached.get("llms.txt") ? 10 : 0,
        maxPoints: 10,
      },
      {
        id: "agents_md_present",
        label: "agents.md served",
        category: "content",
        status: cached.get("agents.md") ? "pass" : "fail",
        points: cached.get("agents.md") ? 10 : 0,
        maxPoints: 10,
      },
      {
        id: "content_signals_header",
        label: "Content-Signal header",
        category: "bots",
        status: settings.contentSignals ? "pass" : "warn",
        detail: settings.contentSignals ? undefined : "Using defaults (all-yes)",
        points: settings.contentSignals ? 10 : 5,
        maxPoints: 10,
      },
      {
        id: "markdown_tokens_header",
        label: "x-markdown-tokens header",
        category: "content",
        status: "pass",
        detail: "Always on",
        points: 5,
        maxPoints: 5,
      },
      {
        id: "markdown_negotiation",
        label: "Markdown content negotiation",
        category: "content",
        status: settings.markdownNegotiation ? "pass" : "fail",
        points: settings.markdownNegotiation ? 10 : 0,
        maxPoints: 10,
      },
      {
        id: "discovery_link_headers",
        label: "Discovery Link headers",
        category: "discoverability",
        status: settings.discoveryHeaders ? "pass" : "fail",
        points: settings.discoveryHeaders ? 5 : 0,
        maxPoints: 5,
      },
      {
        id: "robots_txt_present",
        label: "robots.txt with AI bot rules",
        category: "discoverability",
        status: settings.robotsTxtEnabled && cached.get("robots.txt") ? "pass" : "fail",
        points: settings.robotsTxtEnabled && cached.get("robots.txt") ? 10 : 0,
        maxPoints: 10,
      },
      {
        id: "sitemap_xml_present",
        label: "sitemap.xml served",
        category: "discoverability",
        status: settings.sitemapEnabled && cached.get("sitemap.xml") ? "pass" : settings.sitemapEnabled ? "warn" : "fail",
        points: settings.sitemapEnabled && cached.get("sitemap.xml") ? 10 : settings.sitemapEnabled ? 5 : 0,
        maxPoints: 10,
      },
      {
        id: "agent_skills_endpoint",
        label: "/.well-known/agent-skills",
        category: "protocol",
        status: settings.agentSkillsEnabled && cached.get("agent-skills.json") ? "pass" : "fail",
        points: settings.agentSkillsEnabled && cached.get("agent-skills.json") ? 10 : 0,
        maxPoints: 10,
      },
      {
        id: "test_mode_off",
        label: "testMode disabled (production)",
        category: "protocol",
        status: settings.testMode ? "fail" : "pass",
        detail: settings.testMode ? "Run npx agent-ready go-live" : undefined,
        points: settings.testMode ? 0 : 15,
        maxPoints: 15,
      },
      {
        id: "etag_supported",
        label: "ETag caching supported",
        category: "content",
        status: "pass",
        detail: "Always on",
        points: 5,
        maxPoints: 5,
      },
      // Thin content warnings. Worth zero points so existing scores are unchanged, but the
      // warn status is surfaced in CLI output and the widget so newcomers know to add pages.
      {
        id: "llms_txt_has_content",
        label: "llms.txt includes pages",
        category: "content",
        status: isThin(llmsTxtLength)
          ? "warn"
          : llmsTxtLength > 0
            ? "pass"
            : "fail",
        detail: isThin(llmsTxtLength)
          ? `Only ${llmsTxtLength} bytes. Run npx agent-ready import or add pages to agent-ready.config.json.`
          : undefined,
        points: 0,
        maxPoints: 0,
      },
      {
        id: "agents_md_has_content",
        label: "agents.md includes pages",
        category: "content",
        status: isThin(agentsMdLength)
          ? "warn"
          : agentsMdLength > 0
            ? "pass"
            : "fail",
        detail: isThin(agentsMdLength)
          ? `Only ${agentsMdLength} bytes. Run npx agent-ready import or add pages to agent-ready.config.json.`
          : undefined,
        points: 0,
        maxPoints: 0,
      },
    ];

    const score = checks.reduce((sum, c) => sum + c.points, 0);
    const report: ReadinessReport = {
      score,
      checks,
      generatedAt: Date.now(),
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: {
        ...STATUS_CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": READINESS_CACHE,
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
    const fileTypeToRoute: Record<AgentReadyFileType, RouteName> = {
      "llms.txt": "llms.txt",
      "agents.md": "agents.md",
      "llms-full.txt": "llms-full.txt",
      "robots.txt": "robots.txt",
      "sitemap.xml": "sitemap.xml",
      "agent-skills.json": "agent-skills",
    };
    const route = fileTypeToRoute[type];
    return buildFileRoute(this.component, route, type, {});
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
