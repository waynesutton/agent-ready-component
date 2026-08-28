import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  buildVersionInput,
  sha256Hex,
  escapeXml,
  sanitizePath,
  KNOWN_AI_BOTS,
  buildMarkdownTwinBody,
  buildMarkdownIndexHtml,
  buildMarkdownPageHtml,
  markdownToHtml,
  stripYamlFrontmatter,
  pagePathToMarkdownSlug,
  normalizeBaseUrl,
  appNameToSlug,
  resolveContentSignals,
  resolveRobotsTxtEnabled,
  resolveSitemapEnabled,
  type ContentSignals,
} from "./lib.js";

// Workpool entry point. Called by content.regenerateAll.
// Fetches settings, pages, endpoints, builds each file, diffs hashes, writes cachedFiles rows.
export const runGeneration = internalAction({
  args: { jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await ctx.runQuery(internal.content.loadBundle, {});
    if (!bundle) {
      return null;
    }

    const { settings, pages, endpoints } = bundle;

    const llmsTxt = renderLlmsTxt(settings, pages);
    const agentsMd = renderAgentsMd(settings, endpoints);
    const siteMd = renderSiteMd(settings, pages, endpoints);
    const fullTxt = settings.fullTxtEnabled ? renderFullTxt(settings, pages) : null;
    // Default on (agent readiness v2): generate unless explicitly disabled.
    const robotsTxt = resolveRobotsTxtEnabled(settings) ? renderRobotsTxt(settings, pages) : null;
    const sitemapXml = resolveSitemapEnabled(settings) ? renderSitemap(settings, pages) : null;
    const agentSkills = settings.agentSkillsEnabled
      ? renderAgentSkills(settings, pages, endpoints)
      : null;
    const rssFeed = settings.rssEnabled ? renderRssFeed(settings, pages) : null;
    const markdownSiteEnabled =
      settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;

    type FileEntry = { fileType: string; content: string };
    const files: Array<FileEntry> = [
      { fileType: "llms.txt", content: llmsTxt },
      { fileType: "agents.md", content: agentsMd },
      { fileType: "site.md", content: siteMd },
    ];
    if (fullTxt) files.push({ fileType: "llms-full.txt", content: fullTxt });
    if (robotsTxt) files.push({ fileType: "robots.txt", content: robotsTxt });
    if (sitemapXml) files.push({ fileType: "sitemap.xml", content: sitemapXml });
    if (agentSkills) files.push({ fileType: "agent-skills.json", content: agentSkills });
    if (rssFeed) files.push({ fileType: "rss.xml", content: rssFeed });

    let pageTwinPayload: Array<PageTwinWrite> = [];
    if (markdownSiteEnabled) {
      const built = buildPageTwins(settings, pages);
      pageTwinPayload = await Promise.all(
        built.map(async (t): Promise<PageTwinWrite> => {
          const { versionSeed, ...rest } = t;
          return {
            ...rest,
            generatedFromVersion: await sha256Hex(versionSeed),
          };
        }),
      );
      const indexHtml = buildMarkdownIndexHtml({
        appName: settings.appName,
        description: settings.description,
        siteUrl: settings.appUrl,
        pages: pageTwinPayload.map((t) => ({
          title: t.title,
          path: t.path,
          description: t.description,
          section: t.section,
          slug: t.slug,
        })),
      });
      files.push({ fileType: "markdown-site.html", content: indexHtml });
    }

    const versions = await Promise.all(
      files.map((f) =>
        sha256Hex(buildVersionInput(settings.appName, settings.appUrl, settings.description, [f.content])),
      ),
    );

    const results = files.map((f, i) => ({
      fileType: f.fileType as
        | "llms.txt"
        | "agents.md"
        | "llms-full.txt"
        | "robots.txt"
        | "sitemap.xml"
        | "agent-skills.json"
        | "rss.xml"
        | "markdown-site.html"
        | "site.md",
      content: f.content,
      version: versions[i]!,
    }));

    await ctx.runMutation(internal.generation.writeGenerationResult, {
      jobId: args.jobId,
      results,
    });

    if (markdownSiteEnabled) {
      await ctx.runMutation(internal.generation.writePageTwins, {
        jobId: args.jobId,
        twins: pageTwinPayload,
      });
    }

    if (settings.onGenerationComplete) {
      try {
        await ctx.runMutation(internal.generation.invokeOnGenerationComplete, {
          handle: settings.onGenerationComplete,
          jobId: args.jobId,
        });
      } catch (err) {
        console.error("[agent-ready] onGenerationComplete handler failed:", err);
      }
    }

    // One-time console nudge after the first codegen (dev deployments only).
    if (!settings.nudgePrintedAt && process.env.NODE_ENV !== "production") {
      const slug = appNameToSlug(settings.appName);
      console.log(
        `[agent-ready] Simple mode active. Serving /llms.txt and /${slug}.md (live).`,
      );
      console.log(
        `[agent-ready] Add <link rel="alternate" type="text/markdown" href="/${slug}.md"> to your root layout for full discoverability.`,
      );
      console.log(
        '[agent-ready] Review before publishing? Set publish: "draft". Advanced features: https://github.com/waynesutton/agent-ready-component#advanced',
      );
      await ctx.runMutation(internal.generation.markNudgePrinted, {});
    }

    return null;
  },
});

// Records that the one-time console nudge was printed so it never repeats.
export const markNudgePrinted = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").unique();
    if (!settings || settings.nudgePrintedAt) return null;
    await ctx.db.patch(settings._id, { nudgePrintedAt: Date.now() });
    return null;
  },
});

type CachedResult = {
  fileType:
    | "llms.txt"
    | "agents.md"
    | "llms-full.txt"
    | "robots.txt"
    | "sitemap.xml"
    | "agent-skills.json"
    | "rss.xml"
    | "markdown-site.html"
    | "site.md";
  content: string;
  version: string;
};

type PageTwinDraft = {
  path: string;
  slug: string;
  title: string;
  description: string;
  section?: string;
  markdown: string;
  html: string;
  versionSeed: string;
};

type PageTwinWrite = Omit<PageTwinDraft, "versionSeed"> & {
  generatedFromVersion: string;
};

export const writePageTwins = internalMutation({
  args: {
    jobId: v.string(),
    twins: v.array(
      v.object({
        path: v.string(),
        slug: v.string(),
        title: v.string(),
        description: v.string(),
        section: v.optional(v.string()),
        markdown: v.string(),
        html: v.string(),
        generatedFromVersion: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("pageTwins").take(1000);
    await Promise.all(existing.map((row) => ctx.db.delete(row._id)));
    for (const twin of args.twins) {
      await ctx.db.insert("pageTwins", {
        path: twin.path,
        slug: twin.slug,
        title: twin.title,
        description: twin.description,
        section: twin.section,
        markdown: twin.markdown,
        html: twin.html,
        generatedFromVersion: twin.generatedFromVersion,
        generatedAt: now,
      });
    }
    return null;
  },
});

export const writeGenerationResult = internalMutation({
  args: {
    jobId: v.string(),
    results: v.array(
      v.object({
        fileType: v.union(
          v.literal("llms.txt"),
          v.literal("agents.md"),
          v.literal("llms-full.txt"),
          v.literal("robots.txt"),
          v.literal("sitemap.xml"),
          v.literal("agent-skills.json"),
          v.literal("rss.xml"),
          v.literal("markdown-site.html"),
          v.literal("site.md"),
        ),
        content: v.string(),
        version: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const result of args.results) {
      const existing = await ctx.db
        .query("cachedFiles")
        .withIndex("by_file_type", (q) => q.eq("fileType", result.fileType))
        .unique();
      // Idempotent skip. Hash match means no content to write, but reset the
      // status so rows marked "generating" by invalidateCache return to
      // "current" instead of leaving generationInProgress stuck true.
      if (existing && existing.generatedFromVersion === result.version) {
        if (existing.status !== "current") {
          await ctx.db.patch(existing._id, { status: "current", lastJobId: args.jobId });
        }
        continue;
      }

      if (!existing) {
        await ctx.db.insert("cachedFiles", {
          fileType: result.fileType,
          content: result.content,
          generatedAt: now,
          generatedFromVersion: result.version,
          status: "current",
          lastJobId: args.jobId,
        });
      } else {
        await ctx.db.patch(existing._id, {
          content: result.content,
          generatedAt: now,
          generatedFromVersion: result.version,
          previousContent: existing.content,
          previousGeneratedAt: existing.generatedAt,
          status: "current",
          lastJobId: args.jobId,
        });
      }
    }
    return null;
  },
});

// Stored function handle invocation. The handle is a string reference registered via upsertSettings.
// Actual runtime dispatch of stored handles is deployment-managed by Convex — this wrapper exists
// so generation logic can stay side-effect free.
export const invokeOnGenerationComplete = internalMutation({
  args: { handle: v.string(), jobId: v.string() },
  returns: v.null(),
  handler: async () => {
    // Intentional no-op stub. The registered function runs in the app-level scheduler wrapper.
    return null;
  },
});

// -------- Rendering --------

type SettingsLike = {
  appName: string;
  appUrl: string;
  description: string;
  agentInstructions?: string;
  fullTxtEnabled: boolean;
  onGenerationComplete?: string;
  contentSignals?: ContentSignals;
  robotsTxtEnabled?: boolean;
  robotsTxtAllowAiBots?: boolean;
  robotsTxtDisallowPaths?: string[];
  sitemapEnabled?: boolean;
  rssEnabled?: boolean;
  agentSkillsEnabled?: boolean;
  markdownNegotiation?: boolean;
  markdownSiteEnabled?: boolean;
  notFoundPageEnabled?: boolean;
};

type PageLike = {
  title: string;
  path: string;
  description: string;
  fullContent?: string;
  isOptional?: boolean;
  order?: number;
  // Optional grouping label. When set, the page renders under its own H2 in llms.txt.
  // When unset, the page renders under the default `## Pages` heading.
  section?: string;
};

type EndpointLike = {
  method: string;
  path: string;
  description: string;
  group?: string;
};

function renderLlmsTxt(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const core = pages.filter((p) => !p.isOptional);
  const optional = pages.filter((p) => p.isOptional);
  const base = normalizeBaseUrl(settings.appUrl);
  const markdownSiteEnabled =
    settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;
  const lines: Array<string> = [];
  lines.push(`# ${settings.appName}`);
  lines.push("");
  lines.push(`> ${settings.description}`);
  if (markdownSiteEnabled) {
    lines.push("");
    lines.push("## Markdown site");
    lines.push(
      `- [Markdown site](${base}/markdown): Human-readable HTML pages with markdown available via \`Accept: text/markdown\` for agents.`,
    );
  }

  // Group core pages by section. Pages without a section land under the default
  // "Pages" heading. Section order follows first-appearance so apps can hand-tune
  // ordering by reordering pages in their config.
  if (core.length > 0) {
    const sections = new Map<string, Array<PageLike>>();
    for (const page of core) {
      const key = page.section?.trim() || "Pages";
      const bucket = sections.get(key) ?? [];
      bucket.push(page);
      sections.set(key, bucket);
    }
    for (const [section, group] of sections) {
      lines.push("");
      lines.push(`## ${section}`);
      for (const page of group) {
        lines.push(`- [${page.title}](${settings.appUrl}${page.path}): ${page.description}`);
      }
    }
  }

  if (optional.length > 0) {
    lines.push("");
    lines.push("## Optional");
    for (const page of optional) {
      lines.push(`- [${page.title}](${settings.appUrl}${page.path}): ${page.description}`);
    }
  }

  // Recovery pointer for agents that land on missing pages (advanced, opt in).
  if (settings.notFoundPageEnabled === true) {
    lines.push("");
    lines.push("## Errors");
    lines.push(
      `- [404 guide](${base}/404.md): Where to go when a page is missing.`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// Per-site markdown summary served at /{slug}.md. A richer, human-and-agent
// readable overview than llms.txt: description, instructions, pages, endpoints,
// and pointers to the other discovery files.
function renderSiteMd(
  settings: SettingsLike,
  pages: ReadonlyArray<PageLike>,
  endpoints: ReadonlyArray<EndpointLike>,
): string {
  const base = normalizeBaseUrl(settings.appUrl);
  const markdownSiteEnabled =
    settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;
  const lines: Array<string> = [];
  lines.push(`# ${settings.appName}`);
  lines.push("");
  if (settings.description.trim()) {
    lines.push(`> ${settings.description.trim()}`);
    lines.push("");
  }
  if (settings.agentInstructions?.trim()) {
    lines.push("## Agent instructions");
    lines.push("");
    lines.push(settings.agentInstructions.trim());
    lines.push("");
  }
  if (pages.length > 0) {
    const sections = new Map<string, Array<PageLike>>();
    for (const page of pages) {
      const key = page.section?.trim() || "Pages";
      const bucket = sections.get(key) ?? [];
      bucket.push(page);
      sections.set(key, bucket);
    }
    for (const [section, group] of sections) {
      lines.push(`## ${section}`);
      lines.push("");
      for (const page of group) {
        lines.push(`- [${page.title}](${base}${page.path}): ${page.description}`);
      }
      lines.push("");
    }
  }
  if (endpoints.length > 0) {
    lines.push("## API endpoints");
    lines.push("");
    for (const endpoint of endpoints) {
      lines.push(`- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}`);
    }
    lines.push("");
  }
  lines.push("## Agent resources");
  lines.push("");
  lines.push(`- [llms.txt](${base}/llms.txt): Machine-readable site index`);
  lines.push(`- [agents.md](${base}/agents.md): Agent instructions and API endpoints`);
  if (markdownSiteEnabled) {
    lines.push(
      `- [Markdown site](${base}/markdown): Per-page markdown via \`Accept: text/markdown\``,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderAgentsMd(settings: SettingsLike, endpoints: ReadonlyArray<EndpointLike>): string {
  const lines: Array<string> = [];
  lines.push(`# Agent instructions for ${settings.appName}`);
  lines.push("");
  if (settings.agentInstructions) {
    lines.push(settings.agentInstructions);
    lines.push("");
  }
  if (endpoints.length === 0) {
    lines.push("");
    return lines.join("\n");
  }
  // Group endpoints by their optional group field.
  const grouped = new Map<string, Array<EndpointLike>>();
  for (const endpoint of endpoints) {
    const key = endpoint.group ?? "API";
    const bucket = grouped.get(key) ?? [];
    bucket.push(endpoint);
    grouped.set(key, bucket);
  }
  lines.push("## Available API endpoints");
  for (const [group, list] of grouped) {
    lines.push("");
    lines.push(`### ${group}`);
    for (const endpoint of list) {
      lines.push(`- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function renderFullTxt(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const lines: Array<string> = [];
  lines.push(`# ${settings.appName} full documentation`);
  lines.push("");
  lines.push(`> ${settings.description}`);
  lines.push("");
  for (const page of pages) {
    if (!page.fullContent) continue;
    lines.push(`## ${page.title}`);
    lines.push(`URL: ${settings.appUrl}${page.path}`);
    lines.push("");
    lines.push(page.fullContent);
    lines.push("");
  }
  return lines.join("\n");
}

function renderRobotsTxt(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const base = normalizeBaseUrl(settings.appUrl);
  const markdownSiteEnabled =
    settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;
  const signals = resolveContentSignals(settings.contentSignals);
  const signalValue = `ai-train=${signals.aiTrain ? "yes" : "no"}, search=${signals.search ? "yes" : "no"}, ai-input=${signals.aiInput ? "yes" : "no"}`;
  const lines: Array<string> = [];

  // Content Signals policy (contentsignals.org). Emitted in robots.txt so
  // crawlers that never read HTTP headers still see the usage preferences.
  lines.push("# Content-Signal directives express how this content may be used.");
  lines.push("# See https://contentsignals.org for the policy definition.");
  lines.push("");
  lines.push("User-agent: *");
  lines.push(`Content-Signal: ${signalValue}`);
  if (settings.robotsTxtDisallowPaths) {
    for (const p of settings.robotsTxtDisallowPaths) {
      lines.push(`Disallow: ${sanitizePath(p)}`);
    }
  }
  lines.push("");

  // AI bot directives
  const allow = settings.robotsTxtAllowAiBots !== false;
  for (const bot of KNOWN_AI_BOTS) {
    lines.push(`User-agent: ${bot}`);
    lines.push(allow ? "Allow: /" : "Disallow: /");
    lines.push("");
  }

  lines.push(`Sitemap: ${base}/llms.txt`);
  if (resolveSitemapEnabled(settings)) {
    lines.push(`Sitemap: ${base}/sitemap.xml`);
  }
  if (markdownSiteEnabled) {
    lines.push(`# Markdown site: ${base}/markdown`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderSitemap(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const base = normalizeBaseUrl(settings.appUrl);
  const markdownSiteEnabled =
    settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;
  const lines: Array<string> = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  if (markdownSiteEnabled) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(`${base}/markdown`)}</loc>`);
    lines.push("  </url>");
  }
  for (const page of pages) {
    const loc = escapeXml(`${base}${page.path}`);
    lines.push("  <url>");
    lines.push(`    <loc>${loc}</loc>`);
    lines.push("  </url>");
    if (markdownSiteEnabled) {
      const markdownLoc = escapeXml(`${base}/markdown/${encodeURIComponent(pagePathToMarkdownSlug(page.path))}`);
      lines.push("  <url>");
      lines.push(`    <loc>${markdownLoc}</loc>`);
      lines.push("  </url>");
    }
  }
  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
}

function renderRssFeed(settings: SettingsLike, pages: ReadonlyArray<PageLike>): string {
  const base = settings.appUrl.replace(/\/$/, "");
  const lines: Array<string> = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
  lines.push("  <channel>");
  lines.push(`    <title>${escapeXml(settings.appName)}</title>`);
  lines.push(`    <link>${escapeXml(base)}</link>`);
  lines.push(`    <description>${escapeXml(settings.description)}</description>`);
  lines.push(`    <atom:link href="${escapeXml(base)}/feed.xml" rel="self" type="application/rss+xml" />`);
  for (const page of pages) {
    const url = `${base}${page.path}`;
    lines.push("    <item>");
    lines.push(`      <title>${escapeXml(page.title)}</title>`);
    lines.push(`      <link>${escapeXml(url)}</link>`);
    lines.push(`      <description>${escapeXml(page.description)}</description>`);
    lines.push(`      <guid isPermaLink="true">${escapeXml(url)}</guid>`);
    lines.push("    </item>");
  }
  lines.push("  </channel>");
  lines.push("</rss>");
  lines.push("");
  return lines.join("\n");
}

function renderAgentSkills(
  settings: SettingsLike,
  pages: ReadonlyArray<PageLike>,
  endpoints: ReadonlyArray<EndpointLike>,
): string {
  const base = normalizeBaseUrl(settings.appUrl);
  const markdownSiteEnabled =
    settings.markdownSiteEnabled !== false && settings.markdownNegotiation !== false;
  const skills: Array<Record<string, string>> = [];

  if (markdownSiteEnabled) {
    skills.push({
      name: "Markdown site",
      description: "Human-readable page index with markdown responses for agents.",
      type: "markdown-index",
      url: `${base}/markdown`,
    });
  }

  for (const page of pages) {
    skills.push({
      name: page.title,
      description: page.description,
      type: "page",
      url: `${base}${page.path}`,
      ...(markdownSiteEnabled
        ? { markdownUrl: `${base}/markdown/${encodeURIComponent(pagePathToMarkdownSlug(page.path))}` }
        : {}),
    });
  }

  for (const ep of endpoints) {
    skills.push({
      name: `${ep.method} ${ep.path}`,
      description: ep.description,
      type: "api",
      method: ep.method,
      url: `${base}${ep.path}`,
    });
  }

  return JSON.stringify(
    {
      name: settings.appName,
      description: settings.description,
      skills,
    },
    null,
    2,
  );
}

function buildPageTwins(
  settings: SettingsLike,
  pages: ReadonlyArray<PageLike>,
): Array<PageTwinDraft> {
  const base = normalizeBaseUrl(settings.appUrl);
  const twins: Array<PageTwinDraft> = [];

  for (const page of pages) {
    const slug = pagePathToMarkdownSlug(page.path);
    const markdown = buildMarkdownTwinBody(page);
    // Frontmatter stays in the markdown twin but never renders in the HTML twin.
    const bodyHtml = markdownToHtml(stripYamlFrontmatter(markdown));
    const pageUrl = `${base}/markdown/${encodeURIComponent(slug)}`;
    const html = buildMarkdownPageHtml({
      appName: settings.appName,
      title: page.title,
      description: page.description,
      bodyHtml,
      canonicalUrl: `${base}${page.path}`,
      markdownUrl: pageUrl,
      siteIndexUrl: `${base}/markdown`,
    });
    const versionSeed = buildVersionInput(settings.appName, settings.appUrl, page.path, [
      markdown,
      html,
    ]);
    twins.push({
      path: page.path,
      slug,
      title: page.title,
      description: page.description,
      section: page.section,
      markdown,
      html,
      versionSeed,
    });
  }

  return twins;
}
