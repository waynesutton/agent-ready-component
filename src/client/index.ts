import { httpActionGeneric, type HttpRouter } from "convex/server";
import {
  appNameToSlug,
  resolvePublishState,
  resolveContentSignals,
  resolveRobotsTxtEnabled,
  resolveSitemapEnabled,
  resolveDiscoveryHeaders,
  KNOWN_AI_BOTS,
  sha256Hex,
  estimateTokens,
  normalizeBaseUrl,
  escapeXml,
} from "../component/lib.js";
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
  RegisterMarkdownRoutesOptions,
  MarkdownIndexEntry,
  RouteName,
  SkippableRoute,
} from "./types.js";

export * from "./types.js";

// Shared return validator for content.getCacheStatus. Consumer wrapper
// functions should import this instead of inlining a copy, so upgrades that
// add fields never throw ReturnsValidationError in app code:
//   import { cacheStatusValidator } from "@waynesutton/agent-ready";
export { cacheStatusValidator } from "../component/validators.js";

const DEFAULT_PATHS = {
  llmsTxt: "/llms.txt",
  agentsMd: "/agents.md",
  fullTxt: "/llms-full.txt",
  analytics: "/llms-analytics",
  status: "/llms-status",
  robotsTxt: "/robots.txt",
  sitemap: "/sitemap.xml",
  agentSkills: "/.well-known/agent-skills",
  agentSkillsIndex: "/.well-known/agent-skills/index.json",
  apiCatalog: "/.well-known/api-catalog",
  notFoundMd: "/404.md",
  rssFeed: "/feed.xml",
  readiness: "/llms-readiness",
} as const;

const CACHE_CONTROL = "public, max-age=3600";
const READINESS_CACHE = "public, max-age=300";
const STATUS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

// RFC 8288 discovery link. Always sent on every component-served response so
// agents can find llms.txt from any route without extra configuration.
const DESCRIBEDBY_LINK = `</llms.txt>; rel="describedby"; type="text/markdown"`;

// Prepend the describedby link, preserving any existing Link header value.
function withDescribedByLink(
  headers: Record<string, string>,
): Record<string, string> {
  headers["Link"] = headers["Link"]
    ? `${DESCRIBEDBY_LINK}, ${headers["Link"]}`
    : DESCRIBEDBY_LINK;
  return headers;
}

// Base headers for JSON/utility routes: CORS plus the always-on discovery link.
function corsWithLink(extra?: Record<string, string>): Record<string, string> {
  return withDescribedByLink({ ...STATUS_CORS_HEADERS, ...(extra ?? {}) });
}

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
    listMarkdownPages: any;
    getPageTwinBySlug: any;
    getPageTwinByPath: any;
    listApiEndpoints: any;
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
  const agentSkillsIndexPath =
    options.agentSkillsIndexPath ?? DEFAULT_PATHS.agentSkillsIndex;
  const apiCatalogPath = options.apiCatalogPath ?? DEFAULT_PATHS.apiCatalog;
  const notFoundMdPath = options.notFoundMdPath ?? DEFAULT_PATHS.notFoundMd;
  const rssFeedPath = options.rssFeedPath ?? DEFAULT_PATHS.rssFeed;
  const readinessPath = options.readinessPath ?? DEFAULT_PATHS.readiness;

  const skip = new Set<SkippableRoute>(options.skipRoutes ?? []);

  // Per-site markdown route. Convex http routes need static paths at registration,
  // so the slug resolves from: explicit option, then the AGENT_READY_SITE_SLUG env
  // var (set automatically by `npx agent-ready sync`), then the stable /site.md
  // fallback. Collision-guarded against every other registered path.
  const reservedPaths = new Set<string>([
    llmsTxtPath,
    agentsMdPath,
    fullTxtPath,
    analyticsPath,
    statusPath,
    robotsTxtPath,
    sitemapPath,
    agentSkillsPath,
    agentSkillsIndexPath,
    apiCatalogPath,
    notFoundMdPath,
    rssFeedPath,
    readinessPath,
  ]);
  const siteMdPath = resolveSiteMdPath(options, reservedPaths);

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
  // SHA-256 digest index over the agent-skills document (agentskills.io shape).
  // Gated by agentSkillsEnabled like the parent route.
  if (!skip.has("/.well-known/agent-skills/index.json")) {
    http.route({
      path: agentSkillsIndexPath,
      method: "GET",
      handler: buildAgentSkillsIndexRoute(component, options, agentSkillsPath),
    });
  }
  // RFC 9727 API catalog built from synced apiEndpoints. Advanced, opt in.
  if (!skip.has("/.well-known/api-catalog")) {
    http.route({
      path: apiCatalogPath,
      method: "GET",
      handler: buildApiCatalogRoute(component, options),
    });
  }
  // Recovery markdown for agents that hit missing pages. Advanced, opt in.
  if (!skip.has("/404.md")) {
    http.route({
      path: notFoundMdPath,
      method: "GET",
      handler: buildNotFoundMdRoute(component, options),
    });
  }
  if (!skip.has("/feed.xml")) {
    http.route({
      path: rssFeedPath,
      method: "GET",
      handler: buildFileRoute(component, "rss.xml", "rss.xml", options),
    });
  }

  // Per-site markdown summary at the root (e.g. /my-app.md or /site.md fallback)
  if (siteMdPath) {
    http.route({
      path: siteMdPath,
      method: "GET",
      handler: buildFileRoute(component, "site.md", "site.md", options),
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
    handler: buildStatusRoute(component, "llms-status", options, siteMdPath),
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

// Resolve the mount path for the per-site markdown route.
// Returns null when disabled or when every candidate collides with another route.
function resolveSiteMdPath(
  options: RegisterRoutesOptions,
  reservedPaths: ReadonlySet<string>,
): string | null {
  if (options.siteMdPath === false) return null;
  const candidates: Array<string> = [];
  if (typeof options.siteMdPath === "string" && options.siteMdPath.trim()) {
    const explicit = options.siteMdPath.startsWith("/")
      ? options.siteMdPath
      : `/${options.siteMdPath}`;
    candidates.push(explicit);
  } else {
    const envSlug =
      typeof process !== "undefined"
        ? process.env.AGENT_READY_SITE_SLUG
        : undefined;
    if (envSlug && envSlug.trim()) {
      candidates.push(`/${appNameToSlug(envSlug)}.md`);
    }
  }
  candidates.push("/site.md");
  for (const candidate of candidates) {
    if (reservedPaths.has(candidate)) {
      console.warn(
        `[agent-ready] site markdown path ${candidate} collides with another route, skipping`,
      );
      continue;
    }
    return candidate;
  }
  return null;
}

// Content type map for each file type
function contentTypeForFile(fileType: AgentReadyFileType): string {
  switch (fileType) {
    case "agents.md":
    case "site.md":
      return "text/markdown; charset=utf-8";
    case "sitemap.xml":
      return "application/xml; charset=utf-8";
    case "rss.xml":
      return "application/rss+xml; charset=utf-8";
    case "agent-skills.json":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

// Feature gate: returns 404 for disabled optional file types.
// robots.txt and sitemap.xml are on by default (agent readiness v2): only an
// explicit `false` disables them.
function isFileEnabled(fileType: AgentReadyFileType, settings: AgentReadySettings): boolean {
  switch (fileType) {
    case "llms-full.txt":
      return !!settings.fullTxtEnabled;
    case "robots.txt":
      return resolveRobotsTxtEnabled(settings);
    case "sitemap.xml":
      return resolveSitemapEnabled(settings);
    case "agent-skills.json":
      return !!settings.agentSkillsEnabled;
    case "rss.xml":
      return !!settings.rssEnabled;
    case "markdown-site.html":
      return settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;
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
  const signals = resolveContentSignals(settings.contentSignals);
  headers["Content-Signal"] = `ai-train=${signals.aiTrain ? "yes" : "no"}, search=${signals.search ? "yes" : "no"}, ai-input=${signals.aiInput ? "yes" : "no"}`;

  // M32: Token count header
  headers["x-markdown-tokens"] = String(tokenCount);

  // Always-on RFC 8288 discovery link plus richer alternates (default on in v2).
  const parts: Array<string> = [DESCRIBEDBY_LINK];
  if (resolveDiscoveryHeaders(settings)) {
    const base = settings.appUrl.replace(/\/$/, "");
    parts.push(`<${base}/llms.txt>; rel="alternate"; type="text/plain"`);
    parts.push(`<${base}/agents.md>; rel="alternate"; type="text/markdown"`);
    if (resolveSitemapEnabled(settings)) {
      parts.push(`<${base}/sitemap.xml>; rel="sitemap"; type="application/xml"`);
    }
    if (settings.rssEnabled) {
      parts.push(`<${base}/feed.xml>; rel="alternate"; type="application/rss+xml"`);
    }
    if (settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false) {
      parts.push(`<${base}/markdown>; rel="alternate"; type="text/html"`);
      parts.push(`<${base}/markdown>; rel="alternate"; type="text/markdown"`);
    }
  }
  headers["Link"] = parts.join(", ");

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
      // Zero-config: serve a sensible fallback for the core discovery files so
      // `app.use(agentReady)` works immediately, before any settings exist.
      const fallback = buildZeroConfigFallback(fileType, req);
      if (fallback) return fallback;
      return new Response("agent-ready not configured", { status: 503, headers: corsWithLink() });
    }
    if (resolvePublishState(settings) === "draft" && !isLocalhostRequest(req)) {
      return new Response(
        'not published - set publish: "live" or run `npx agent-ready go-live`',
        { status: 404, headers: corsWithLink() },
      );
    }
    if (!isFileEnabled(fileType, settings)) {
      return new Response(`${fileType} is not enabled`, { status: 404, headers: corsWithLink() });
    }

    const cached = await ctx.runQuery(component.content.getCachedFile, {
      fileType,
    });
    if (!cached) {
      // Settings-derived fallbacks so upgraded installs serve these files
      // before their next regeneration writes the cached versions.
      if (fileType === "site.md") {
        return serveSiteMdFallback(settings);
      }
      if (fileType === "robots.txt") {
        return serveRobotsTxtFallback(settings);
      }
      if (fileType === "sitemap.xml") {
        return serveSitemapFallback(settings);
      }
      return new Response("not generated yet - run `npx agent-ready regenerate`", {
        status: 503,
        headers: corsWithLink(),
      });
    }

    const etag = `"${cached.generatedFromVersion}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: withDescribedByLink({ ETag: etag, "Cache-Control": CACHE_CONTROL }),
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

// Minimal fallback bodies for the core discovery files when no settings exist yet.
// Keeps zero-config installs live immediately; the wizard or sync replaces these.
// Covers llms.txt, agents.md, site.md, robots.txt, and sitemap.xml so a fresh
// `app.use(agentReady)` passes the simple-mode checks before any sync runs.
function buildZeroConfigFallback(
  fileType: AgentReadyFileType,
  req: Request,
): Response | null {
  let host = "this site";
  let origin = "";
  try {
    const url = new URL(req.url);
    host = url.hostname;
    origin = url.origin;
  } catch {
    // keep defaults
  }

  let body: string;
  switch (fileType) {
    case "agents.md":
      body = `# Agent instructions for ${host}\n\nNo agent instructions configured yet. Run \`npx agent-ready setup\` to add them.\n`;
      break;
    case "llms.txt":
    case "site.md":
      body = `# ${host}\n\n> Agent-ready site. Content has not been configured yet. Run \`npx agent-ready setup\` to add pages.\n`;
      break;
    case "robots.txt":
      body = buildRobotsTxtBody({
        base: origin,
        signals: resolveContentSignals(null),
        allowAiBots: true,
        disallowPaths: [],
        includeSitemap: true,
      });
      break;
    case "sitemap.xml":
      body = buildSitemapBody(origin, []);
      break;
    default:
      return null;
  }

  return new Response(body, {
    status: 200,
    headers: withDescribedByLink({
      "Content-Type": contentTypeForFile(fileType),
      "Cache-Control": "public, max-age=60",
      "x-markdown-tokens": String(Math.ceil(body.length / 4)),
    }),
  });
}

// Shared robots.txt body builder used by the zero-config and settings-derived
// fallbacks. The generation pipeline renders the canonical cached version.
function buildRobotsTxtBody(args: {
  base: string;
  signals: { aiTrain: boolean; search: boolean; aiInput: boolean };
  allowAiBots: boolean;
  disallowPaths: ReadonlyArray<string>;
  includeSitemap: boolean;
}): string {
  const signalValue = `ai-train=${args.signals.aiTrain ? "yes" : "no"}, search=${args.signals.search ? "yes" : "no"}, ai-input=${args.signals.aiInput ? "yes" : "no"}`;
  const lines: Array<string> = [
    "# Content-Signal directives express how this content may be used.",
    "# See https://contentsignals.org for the policy definition.",
    "",
    "User-agent: *",
    `Content-Signal: ${signalValue}`,
  ];
  for (const p of args.disallowPaths) {
    lines.push(`Disallow: ${p.replace(/[\n\r\x00-\x1f]/g, "")}`);
  }
  lines.push("");
  for (const bot of KNOWN_AI_BOTS) {
    lines.push(`User-agent: ${bot}`);
    lines.push(args.allowAiBots ? "Allow: /" : "Disallow: /");
    lines.push("");
  }
  lines.push(`Sitemap: ${args.base}/llms.txt`);
  if (args.includeSitemap) {
    lines.push(`Sitemap: ${args.base}/sitemap.xml`);
  }
  lines.push("");
  return lines.join("\n");
}

// Minimal sitemap body for fallbacks: the site root plus any provided paths.
function buildSitemapBody(base: string, paths: ReadonlyArray<string>): string {
  const lines: Array<string> = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${escapeXml(`${base}/`)}</loc>`,
    "  </url>",
  ];
  for (const path of paths) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(`${base}${path}`)}</loc>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
}

// Settings-derived robots.txt served until the next generation caches the full version.
function serveRobotsTxtFallback(settings: AgentReadySettings): Response {
  const body = buildRobotsTxtBody({
    base: normalizeBaseUrl(settings.appUrl),
    signals: resolveContentSignals(settings.contentSignals),
    allowAiBots: settings.robotsTxtAllowAiBots !== false,
    disallowPaths: settings.robotsTxtDisallowPaths ?? [],
    includeSitemap: resolveSitemapEnabled(settings),
  });
  return new Response(body, {
    status: 200,
    headers: withDescribedByLink({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "x-markdown-tokens": String(estimateTokens(body)),
    }),
  });
}

// Settings-derived sitemap served until the next generation caches the full version.
function serveSitemapFallback(settings: AgentReadySettings): Response {
  const body = buildSitemapBody(normalizeBaseUrl(settings.appUrl), []);
  return new Response(body, {
    status: 200,
    headers: withDescribedByLink({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "x-markdown-tokens": String(estimateTokens(body)),
    }),
  });
}

// Settings-derived site.md served until the next generation caches the full version.
function serveSiteMdFallback(settings: AgentReadySettings): Response {
  const lines: Array<string> = [`# ${settings.appName}`, ""];
  if (settings.description.trim()) {
    lines.push(`> ${settings.description.trim()}`, "");
  }
  lines.push(
    "## Agent resources",
    "",
    "- [llms.txt](/llms.txt): Machine-readable site index",
    "- [agents.md](/agents.md): Agent instructions and API endpoints",
    "",
  );
  const body = lines.join("\n");
  return new Response(body, {
    status: 200,
    headers: withDescribedByLink({
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "x-markdown-tokens": String(Math.ceil(body.length / 4)),
    }),
  });
}

// Draft/publish gate shared by the advanced well-known routes. Returns a 404
// response when the feature should not serve, null when the request may proceed.
function gateAdvancedRoute(
  settings: AgentReadySettings | null,
  req: Request,
  enabled: boolean,
  disabledMessage: string,
): Response | null {
  if (!settings || !enabled) {
    return new Response(disabledMessage, { status: 404, headers: corsWithLink() });
  }
  if (resolvePublishState(settings) === "draft" && !isLocalhostRequest(req)) {
    return new Response(
      'not published - set publish: "live" or run `npx agent-ready go-live`',
      { status: 404, headers: corsWithLink() },
    );
  }
  return null;
}

// /.well-known/agent-skills/index.json: digest index over the agent-skills
// document. The SHA-256 is computed from the exact cached bytes at request
// time so the digest can never drift from the served file.
function buildAgentSkillsIndexRoute(
  component: ComponentApi,
  options: RegisterRoutesOptions,
  agentSkillsPath: string,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options, ctx, req, "agent-skills-index");
    const override = await maybeRouteHandler(options, ctx, req, "agent-skills-index");
    if (override) return override;

    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = gateAdvancedRoute(
      settings,
      req,
      !!settings?.agentSkillsEnabled,
      "agent-skills is not enabled",
    );
    if (blocked) return blocked;

    const cached = await ctx.runQuery(component.content.getCachedFile, {
      fileType: "agent-skills.json",
    });
    if (!cached) {
      return new Response("not generated yet - run `npx agent-ready regenerate`", {
        status: 503,
        headers: corsWithLink(),
      });
    }

    const digest = await sha256Hex(cached.content);
    const base = normalizeBaseUrl(settings!.appUrl);
    const body = JSON.stringify(
      {
        name: settings!.appName,
        description: settings!.description,
        generatedAt: cached.generatedAt,
        files: [
          {
            path: agentSkillsPath,
            url: `${base}${agentSkillsPath}`,
            mediaType: "application/json",
            sha256: digest,
            bytes: cached.content.length,
          },
        ],
      },
      null,
      2,
    );
    return new Response(body, {
      status: 200,
      headers: corsWithLink({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        ETag: `"${digest}"`,
      }),
    });
  });
}

// /.well-known/api-catalog: RFC 9727 linkset built from the synced API
// endpoints. Serves only when apiCatalogEnabled and at least one endpoint exists.
function buildApiCatalogRoute(
  component: ComponentApi,
  options: RegisterRoutesOptions,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options, ctx, req, "api-catalog");
    const override = await maybeRouteHandler(options, ctx, req, "api-catalog");
    if (override) return override;

    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = gateAdvancedRoute(
      settings,
      req,
      settings?.apiCatalogEnabled === true,
      "api-catalog is not enabled",
    );
    if (blocked) return blocked;

    const endpoints = (await ctx.runQuery(component.content.listApiEndpoints, {})) as Array<{
      method: string;
      path: string;
      description: string;
    }>;
    if (endpoints.length === 0) {
      return new Response("no API endpoints registered", {
        status: 404,
        headers: corsWithLink(),
      });
    }

    const base = normalizeBaseUrl(settings!.appUrl);
    // One linkset context anchored at the site with the agents.md service doc,
    // plus one context per endpoint pointing back at the documentation.
    const body = JSON.stringify(
      {
        linkset: [
          {
            anchor: `${base}/`,
            "service-doc": [
              { href: `${base}/agents.md`, type: "text/markdown" },
            ],
            describedby: [
              { href: `${base}/llms.txt`, type: "text/plain" },
            ],
          },
          ...endpoints.map((ep) => ({
            anchor: `${base}${ep.path}`,
            "service-doc": [
              { href: `${base}/agents.md`, type: "text/markdown", title: `${ep.method} ${ep.path}: ${ep.description}` },
            ],
          })),
        ],
      },
      null,
      2,
    );
    return new Response(body, {
      status: 200,
      headers: corsWithLink({
        "Content-Type": "application/linkset+json; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      }),
    });
  });
}

// /404.md: markdown recovery page for agents that land on missing paths.
// Served at an exact route with 200 (it documents 404 recovery; unknown paths
// on a Convex-only deployment still return real 404s).
function buildNotFoundMdRoute(
  component: ComponentApi,
  options: RegisterRoutesOptions,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options, ctx, req, "404.md");
    const override = await maybeRouteHandler(options, ctx, req, "404.md");
    if (override) return override;

    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = gateAdvancedRoute(
      settings,
      req,
      settings?.notFoundPageEnabled === true,
      "404.md is not enabled",
    );
    if (blocked) return blocked;

    const base = normalizeBaseUrl(settings!.appUrl);
    const markdownSiteEnabled =
      settings!.markdownSiteEnabled !== false && settings!.markdownNegotiation !== false;
    const lines: Array<string> = [
      "# Page not found",
      "",
      `> The page you requested does not exist on ${settings!.appName}. Use these resources to find what you need.`,
      "",
      "## Where to go",
      "",
      `- [Site index](${base}/llms.txt): Machine-readable list of every page`,
      `- [Agent instructions](${base}/agents.md): How agents should use this site`,
    ];
    if (resolveSitemapEnabled(settings)) {
      lines.push(`- [Sitemap](${base}/sitemap.xml): Full URL list`);
    }
    if (markdownSiteEnabled) {
      lines.push(
        `- [Markdown site](${base}/markdown): Per-page markdown via \`Accept: text/markdown\``,
      );
    }
    lines.push("");
    const body = lines.join("\n");
    return new Response(body, {
      status: 200,
      headers: withDescribedByLink({
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        "x-markdown-tokens": String(estimateTokens(body)),
      }),
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
  siteMdPath: string | null = null,
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
    // Merge the actual mounted path so the widget and AgentLinks reference it.
    const payload = status ? { ...status, siteMdPath } : { siteMdPath };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: corsWithLink({
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      }),
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
        headers: corsWithLink({ "Content-Type": "application/json" }),
      });
    }
    if (!settings.readinessEndpointEnabled) {
      return new Response(JSON.stringify({ error: "readiness endpoint disabled" }), {
        status: 404,
        headers: corsWithLink({ "Content-Type": "application/json" }),
      });
    }
    if (resolvePublishState(settings) === "draft" && !isLocalhostRequest(req)) {
      return new Response(JSON.stringify({ error: "not published" }), {
        status: 404,
        headers: corsWithLink({ "Content-Type": "application/json" }),
      });
    }

    const files = await ctx.runQuery(component.content.getCacheStatus, {});
    const allCached = await Promise.all(
      (["llms.txt", "agents.md", "robots.txt", "sitemap.xml", "agent-skills.json", "rss.xml"] as const).map(
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
        status: resolveDiscoveryHeaders(settings) ? "pass" : "fail",
        points: resolveDiscoveryHeaders(settings) ? 5 : 0,
        maxPoints: 5,
      },
      // robots.txt and sitemap.xml are default on and have settings-derived
      // fallbacks, so an enabled flag counts even before the cache is written.
      {
        id: "robots_txt_present",
        label: "robots.txt with AI bot rules",
        category: "discoverability",
        status: resolveRobotsTxtEnabled(settings) ? "pass" : "fail",
        detail:
          resolveRobotsTxtEnabled(settings) && !cached.get("robots.txt")
            ? "Serving settings-derived fallback until next regeneration"
            : undefined,
        points: resolveRobotsTxtEnabled(settings) ? 10 : 0,
        maxPoints: 10,
      },
      {
        id: "sitemap_xml_present",
        label: "sitemap.xml served",
        category: "discoverability",
        status: resolveSitemapEnabled(settings) ? "pass" : "fail",
        detail:
          resolveSitemapEnabled(settings) && !cached.get("sitemap.xml")
            ? "Serving settings-derived fallback until next regeneration"
            : undefined,
        points: resolveSitemapEnabled(settings) ? 10 : 0,
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
        label: "published (publish: live)",
        category: "protocol",
        status: resolvePublishState(settings) === "draft" ? "fail" : "pass",
        detail:
          resolvePublishState(settings) === "draft"
            ? 'Set publish: "live" or run npx agent-ready go-live'
            : undefined,
        points: resolvePublishState(settings) === "draft" ? 0 : 15,
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
      // Bonus check: RSS feed. Worth 0 points so existing scores are unchanged.
      {
        id: "rss_feed_present",
        label: "RSS feed served",
        category: "discoverability",
        status: settings.rssEnabled && cached.get("rss.xml") ? "pass" : settings.rssEnabled ? "warn" : "fail",
        detail: !settings.rssEnabled ? "Enable rssEnabled in config" : undefined,
        points: 0,
        maxPoints: 0,
      },
      // v2 bonus checks. Zero points so existing scores never shift; missing
      // optional protocol endpoints must not fail a site.
      {
        id: "agent_skills_index",
        label: "/.well-known/agent-skills/index.json",
        category: "protocol",
        status: settings.agentSkillsEnabled ? "pass" : "warn",
        detail: settings.agentSkillsEnabled
          ? undefined
          : "Enable agentSkillsEnabled to serve the digest index",
        points: 0,
        maxPoints: 0,
      },
      {
        id: "api_catalog",
        label: "/.well-known/api-catalog (RFC 9727)",
        category: "protocol",
        status: settings.apiCatalogEnabled === true ? "pass" : "warn",
        detail:
          settings.apiCatalogEnabled === true
            ? undefined
            : "Optional. Enable apiCatalogEnabled when apiEndpoints exist",
        points: 0,
        maxPoints: 0,
      },
      {
        id: "not_found_md",
        label: "/404.md recovery page",
        category: "content",
        status: settings.notFoundPageEnabled === true ? "pass" : "warn",
        detail:
          settings.notFoundPageEnabled === true
            ? undefined
            : "Optional. Enable notFoundPageEnabled for agent-friendly 404 recovery",
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
      headers: corsWithLink({
        "Content-Type": "application/json",
        "Cache-Control": READINESS_CACHE,
      }),
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

const BOT_UA_PATTERN =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|Google-Extended|Bytespider|CCBot|cohere-ai/i;

function parseAcceptPrefersMarkdown(header: string | null): boolean {
  if (!header) return false;
  let htmlQ = -1;
  let mdQ = -1;
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [typeRaw, ...params] = trimmed.split(";").map((p) => p.trim());
    const type = (typeRaw ?? "").toLowerCase();
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split("=").map((p) => p.trim());
      if (key === "q" && value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (type === "text/markdown" || type === "text/x-markdown") mdQ = Math.max(mdQ, q);
    if (type === "text/html") htmlQ = Math.max(htmlQ, q);
    // */* counts as HTML fallback but at lower implicit priority than explicit types
    if (type === "*/*") {
      htmlQ = Math.max(htmlQ, q);
      mdQ = Math.max(mdQ, q);
    }
  }
  // If only markdown types were specified (no html, no */*), prefer markdown
  if (mdQ > 0 && htmlQ < 0) return true;
  return mdQ > htmlQ;
}

function shouldServeMarkdownFromRequest(req: Request): boolean {
  if (parseAcceptPrefersMarkdown(req.headers.get("accept"))) return true;
  return BOT_UA_PATTERN.test(req.headers.get("user-agent") ?? "");
}

// RFC 7231: when the Accept header rejects every type we can offer
// (text/html and text/markdown), respond 406 instead of forcing a body.
function acceptRejectsAllOffered(header: string | null): boolean {
  if (!header || !header.trim()) return false;
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [typeRaw, ...params] = trimmed.split(";").map((p) => p.trim());
    const type = (typeRaw ?? "").toLowerCase();
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split("=").map((p) => p.trim());
      if (key === "q" && value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (q <= 0) continue;
    if (
      type === "text/html" ||
      type === "text/markdown" ||
      type === "text/x-markdown" ||
      type === "text/*" ||
      type === "*/*"
    ) {
      return false;
    }
  }
  return true;
}

// Standard 406 response listing what the route can serve.
function notAcceptableResponse(): Response {
  return new Response("not acceptable: this route serves text/html or text/markdown", {
    status: 406,
    headers: withDescribedByLink({
      "Content-Type": "text/plain; charset=utf-8",
      Vary: "Accept",
    }),
  });
}

async function gateDraft(
  settings: AgentReadySettings | null,
  req: Request,
): Promise<Response | null> {
  if (!settings) {
    return new Response("agent-ready not configured", { status: 503, headers: corsWithLink() });
  }
  if (resolvePublishState(settings) === "draft" && !isLocalhostRequest(req)) {
    return new Response(
      'not published - set publish: "live" or run `npx agent-ready go-live`',
      { status: 404, headers: corsWithLink() },
    );
  }
  if (settings.markdownSiteEnabled === false || settings.markdownNegotiation === false) {
    return new Response("markdown site disabled", { status: 404, headers: corsWithLink() });
  }
  return null;
}

function buildTwinResponseHeaders(
  settings: AgentReadySettings,
  etag: string,
  contentType: string,
  tokenCount: number,
  opts?: { noindex?: boolean },
): Record<string, string> {
  const headers = buildAgentHeaders(settings, etag, contentType, tokenCount);
  if (opts?.noindex) {
    headers["X-Robots-Tag"] = "noindex";
  }
  return headers;
}

// --------------------------------------------------------------------
// registerMarkdownRoutes: per-page markdown site + JSON index for widget.
// Mount after registerRoutes and before SPA/static fallback.
// --------------------------------------------------------------------

export function registerMarkdownRoutes(
  http: HttpRouter,
  component: ComponentApi,
  options: RegisterMarkdownRoutesOptions = {},
): void {
  const markdownIndexPath = options.markdownIndexPath ?? "/llms-markdown-index";
  const markdownSitePath = options.markdownSitePath ?? "/markdown";

  http.route({
    path: markdownIndexPath,
    method: "OPTIONS",
    handler: buildCorsPreflightRoute(),
  });
  http.route({
    path: markdownIndexPath,
    method: "GET",
    handler: buildMarkdownIndexRoute(component, "llms-markdown-index", options),
  });

  http.route({
    path: markdownSitePath,
    method: "GET",
    handler: buildMarkdownSiteIndexRoute(component, "markdown-site", options, markdownSitePath),
  });

  http.route({
    pathPrefix: `${markdownSitePath}/`,
    method: "GET",
    handler: buildMarkdownPageRoute(component, "markdown-site", options, markdownSitePath),
  });
}

/** Alias for Dualmark-style content negotiation docs. */
export const mountMarkdownNegotiation = registerMarkdownRoutes;

// --------------------------------------------------------------------
// registerCanonicalPageRoutes: Accept negotiation on the pages' real paths.
// Convex HTTP routes are fixed at deploy time, so the app lists the canonical
// paths explicitly. Each path serves markdown for `Accept: text/markdown`,
// the HTML twin otherwise, and 406 when the client rejects both.
// Under static hosting these routes shadow the SPA for the listed paths, so
// this is an explicit opt in and never part of registerRoutes.
// --------------------------------------------------------------------

export function registerCanonicalPageRoutes(
  http: HttpRouter,
  component: ComponentApi,
  options: import("./types.js").RegisterCanonicalPageRoutesOptions,
): void {
  for (const rawPath of options.paths) {
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    http.route({
      path,
      method: "GET",
      handler: buildCanonicalPageRoute(component, options, path),
    });
  }
}

function buildCanonicalPageRoute(
  component: ComponentApi,
  options: import("./types.js").RegisterCanonicalPageRoutesOptions,
  path: string,
) {
  return httpActionGeneric(async (ctx, req) => {
    if (options.onEvent) {
      try {
        await options.onEvent(ctx, req, "canonical-page");
      } catch (err) {
        console.error(`[agent-ready] onEvent handler threw for canonical-page:`, err);
      }
    }

    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = await gateDraft(settings, req);
    if (blocked) return blocked;
    if (acceptRejectsAllOffered(req.headers.get("accept"))) {
      return notAcceptableResponse();
    }

    const twin = await ctx.runQuery(component.content.getPageTwinByPath, { path });
    if (!twin) {
      return new Response("not found", { status: 404, headers: corsWithLink() });
    }

    const etag = `"${twin.generatedFromVersion}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: withDescribedByLink({
          ETag: etag,
          "Cache-Control": CACHE_CONTROL,
          Vary: "Accept",
        }),
      });
    }

    const wantsMarkdown = shouldServeMarkdownFromRequest(req);
    const body = wantsMarkdown ? twin.markdown : twin.html;
    return new Response(body, {
      status: 200,
      headers: corsWithLink({
        "Content-Type": wantsMarkdown
          ? "text/markdown; charset=utf-8"
          : "text/html; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        ETag: etag,
        "X-Markdown-Tokens": String(estimateTokens(twin.markdown)),
        "X-Original-Tokens": String(estimateTokens(twin.html)),
        Vary: "Accept",
      }),
    });
  });
}

function buildMarkdownIndexRoute(
  component: ComponentApi,
  route: RouteName,
  options: RegisterMarkdownRoutesOptions,
) {
  return httpActionGeneric(async (ctx, req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: STATUS_CORS_HEADERS });
    }
    await maybeOnEvent(options as RegisterRoutesOptions, ctx, req, route);
    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = await gateDraft(settings, req);
    if (blocked) return blocked;

    const pages: Array<MarkdownIndexEntry> = await ctx.runQuery(
      component.content.listMarkdownPages,
      {},
    );
    return new Response(JSON.stringify({ pages, generatedAt: Date.now() }), {
      status: 200,
      headers: corsWithLink({
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      }),
    });
  });
}

function buildMarkdownSiteIndexRoute(
  component: ComponentApi,
  route: RouteName,
  options: RegisterMarkdownRoutesOptions,
  _markdownSitePath: string,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options as RegisterRoutesOptions, ctx, req, route);
    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = await gateDraft(settings, req);
    if (blocked) return blocked;
    if (acceptRejectsAllOffered(req.headers.get("accept"))) {
      return notAcceptableResponse();
    }

    // Content negotiation: agents (Accept: text/markdown or known bot UA) get
    // markdown; browsers get the cached HTML index. Vary: Accept on both.
    const wantsMarkdown = shouldServeMarkdownFromRequest(req);
    if (!wantsMarkdown) {
      const cachedHtml = await ctx.runQuery(component.content.getCachedFile, {
        fileType: "markdown-site.html",
      });
      if (cachedHtml) {
        const htmlEtag = `"${cachedHtml.generatedFromVersion}"`;
        if (req.headers.get("if-none-match") === htmlEtag) {
          return new Response(null, {
            status: 304,
            headers: withDescribedByLink({
              ETag: htmlEtag,
              "Cache-Control": CACHE_CONTROL,
              Vary: "Accept",
            }),
          });
        }
        return new Response(cachedHtml.content, {
          status: 200,
          headers: corsWithLink({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": CACHE_CONTROL,
            ETag: htmlEtag,
            Vary: "Accept",
          }),
        });
      }
      // Fall through to markdown when the HTML index has not been generated yet.
    }

    const pages: Array<MarkdownIndexEntry> = await ctx.runQuery(
      component.content.listMarkdownPages,
      {},
    );
    const lines = [`# ${settings!.appName ?? "Markdown site"}`, ""];
    for (const page of pages) {
      lines.push(`- [${page.title}](${page.markdownUrl}): ${page.description}`);
    }
    lines.push("");
    const body = lines.join("\n");
    const etag = `"markdown-index-${pages.length}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: withDescribedByLink({
          ETag: etag,
          "Cache-Control": CACHE_CONTROL,
          Vary: "Accept",
        }),
      });
    }
    return new Response(body, {
      status: 200,
      headers: corsWithLink({
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        ETag: etag,
        "X-Markdown-Tokens": String(Math.ceil(body.length / 4)),
        Vary: "Accept",
      }),
    });
  });
}

function buildMarkdownPageRoute(
  component: ComponentApi,
  route: RouteName,
  options: RegisterMarkdownRoutesOptions,
  markdownSitePath: string,
) {
  return httpActionGeneric(async (ctx, req) => {
    await maybeOnEvent(options as RegisterRoutesOptions, ctx, req, route);
    const settings = (await ctx.runQuery(component.content.getSettings, {})) as
      | AgentReadySettings
      | null;
    const blocked = await gateDraft(settings, req);
    if (blocked) return blocked;

    if (acceptRejectsAllOffered(req.headers.get("accept"))) {
      return notAcceptableResponse();
    }

    const url = new URL(req.url);
    const prefix = `${markdownSitePath}/`;
    const slug = decodeURIComponent(url.pathname.slice(prefix.length).replace(/\/+$/, ""));
    if (!slug) {
      return new Response("not found", { status: 404, headers: STATUS_CORS_HEADERS });
    }

    const twin = await ctx.runQuery(component.content.getPageTwinBySlug, { slug });
    if (!twin) {
      return new Response("not found", { status: 404, headers: corsWithLink() });
    }

    const etag = `"${twin.generatedFromVersion}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: withDescribedByLink({
          ETag: etag,
          "Cache-Control": CACHE_CONTROL,
          Vary: "Accept",
        }),
      });
    }

    // Content negotiation: markdown for agents, the stored HTML twin for browsers.
    const wantsMarkdown = shouldServeMarkdownFromRequest(req);
    const body = wantsMarkdown ? twin.markdown : twin.html;
    return new Response(body, {
      status: 200,
      headers: corsWithLink({
        "Content-Type": wantsMarkdown
          ? "text/markdown; charset=utf-8"
          : "text/html; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        ETag: etag,
        "X-Markdown-Tokens": String(estimateTokens(twin.markdown)),
        // Estimated tokens of the original HTML twin, mirroring Cloudflare's
        // markdown-for-agents header pair.
        "X-Original-Tokens": String(estimateTokens(twin.html)),
        Vary: "Accept",
      }),
    });
  });
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
      "rss.xml": "rss.xml",
      "markdown-site.html": "markdown-site",
      "site.md": "site.md",
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
