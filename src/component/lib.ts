// Shared helpers. Pure functions only so both the V8 and Node runtimes can import.

// SHA-256 hex digest computed with the Web Crypto API.
// Returns a stable hash used as `generatedFromVersion` and the ETag value.
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const bytesOut = new Uint8Array(digest);
  let hex = "";
  for (const b of bytesOut) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

// Approximate token count matching Cloudflare's approach. No external tokenizer needed.
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

// Normalize a base URL by trimming any trailing slash. Centralized so widgets,
// renderers, and CLI commands all produce identical link prefixes.
export function normalizeBaseUrl(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

// Slugify an app name for the per-site markdown route.
// Lowercase, spaces and unsafe chars become hyphens, collapse repeats, trim edges.
export function appNameToSlug(name: string | null | undefined): string {
  const slug = (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "site";
}

export type PublishState = "live" | "draft";

// Resolve the publish state for public route gating.
// Explicit `publish` wins. `testMode: true` is a deprecated alias for draft.
// Default is live so zero-config installs serve immediately.
export function resolvePublishState(
  settings: { publish?: PublishState; testMode?: boolean } | null | undefined,
): PublishState {
  if (!settings) return "live";
  if (settings.publish) return settings.publish;
  return settings.testMode === true ? "draft" : "live";
}

// Escape XML special characters for sitemap output.
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
}

// Strip control characters from paths before embedding in robots.txt.
export function sanitizePath(path: string): string {
  return path.replace(/[\n\r\x00-\x1f]/g, "");
}

// Content-Signal header builder. Mirrors Cloudflare's Content Signals framework.
export type ContentSignals = {
  aiTrain: boolean;
  search: boolean;
  aiInput: boolean;
};

// Resolve content signals with the all-yes default. Single source of truth for
// the HTTP header and the robots.txt Content-Signal block.
export function resolveContentSignals(
  signals?: ContentSignals | null,
): ContentSignals {
  return signals ?? { aiTrain: true, search: true, aiInput: true };
}

export function buildContentSignalHeader(
  signals?: ContentSignals | null,
): string {
  const s = resolveContentSignals(signals);
  return `ai-train=${s.aiTrain ? "yes" : "no"}, search=${s.search ? "yes" : "no"}, ai-input=${s.aiInput ? "yes" : "no"}`;
}

// -------- Default-on feature resolution (agent readiness v2) --------
// Simple mode ships robots.txt, sitemap.xml, and richer discovery Link headers
// by default. `undefined` resolves to on; only an explicit `false` disables.
// Apps that own these paths keep `skipRoutes` or set the flag to false.

type ReadinessFlags = {
  robotsTxtEnabled?: boolean;
  sitemapEnabled?: boolean;
  discoveryHeaders?: boolean;
};

export function resolveRobotsTxtEnabled(
  settings: ReadinessFlags | null | undefined,
): boolean {
  return settings?.robotsTxtEnabled !== false;
}

export function resolveSitemapEnabled(
  settings: ReadinessFlags | null | undefined,
): boolean {
  return settings?.sitemapEnabled !== false;
}

export function resolveDiscoveryHeaders(
  settings: ReadinessFlags | null | undefined,
): boolean {
  return settings?.discoveryHeaders !== false;
}

// Discovery Link header builder (RFC 8288).
export function buildDiscoveryLinkHeader(
  appUrl: string,
  opts: { sitemapEnabled?: boolean },
): string {
  const base = appUrl.replace(/\/$/, "");
  const parts: Array<string> = [
    `<${base}/llms.txt>; rel="alternate"; type="text/plain"`,
    `<${base}/agents.md>; rel="alternate"; type="text/markdown"`,
  ];
  if (opts.sitemapEnabled) {
    parts.push(`<${base}/sitemap.xml>; rel="sitemap"; type="application/xml"`);
  }
  return parts.join(", ");
}

// Known AI and crawler user agents. Used to classify analytics rows.
// Keep this list tight and explicit. Unknown agents fall through to "other".
const KNOWN_AGENTS: Array<{ match: RegExp; name: string }> = [
  { match: /GPTBot/i, name: "GPTBot" },
  { match: /ChatGPT-User/i, name: "ChatGPT-User" },
  { match: /OAI-SearchBot/i, name: "OAI-SearchBot" },
  { match: /ClaudeBot/i, name: "ClaudeBot" },
  { match: /Claude-Web/i, name: "Claude-Web" },
  { match: /anthropic-ai/i, name: "anthropic-ai" },
  { match: /PerplexityBot/i, name: "PerplexityBot" },
  { match: /Applebot-Extended/i, name: "Applebot-Extended" },
  { match: /Applebot/i, name: "Applebot" },
  { match: /Google-Extended/i, name: "Google-Extended" },
  { match: /Googlebot/i, name: "Googlebot" },
  { match: /Bingbot/i, name: "Bingbot" },
  { match: /Bytespider/i, name: "Bytespider" },
  { match: /CCBot/i, name: "CCBot" },
  { match: /FacebookBot/i, name: "FacebookBot" },
  { match: /cohere-ai/i, name: "cohere-ai" },
  { match: /DuckDuckBot/i, name: "DuckDuckBot" },
  { match: /YandexBot/i, name: "YandexBot" },
];

// AI bot names for robots.txt directives. Superset of analytics agents.
export const KNOWN_AI_BOTS: ReadonlyArray<string> = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Applebot-Extended",
  "Google-Extended",
  "Bytespider",
  "CCBot",
  "cohere-ai",
];

export type AgentClassification = {
  agentName: string;
  isKnownAgent: boolean;
  rawUserAgent: string;
};

// Classify a user agent header. Truncates to 512 chars so agentRequests rows stay small.
export function classifyUserAgent(raw: string | null | undefined): AgentClassification {
  const rawUserAgent = (raw ?? "unknown").slice(0, 512);
  for (const { match, name } of KNOWN_AGENTS) {
    if (match.test(rawUserAgent)) {
      return { agentName: name, isKnownAgent: true, rawUserAgent };
    }
  }
  return { agentName: "other", isKnownAgent: false, rawUserAgent };
}

// Detect localhost requests so testMode can allow local previews while blocking external hits.
export function isLocalhostRequest(req: Request): boolean {
  const url = new URL(req.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  // Also honor the forwarded-for header for proxy setups that hairpin to Convex.
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.startsWith("127.0.0.1") || forwarded.startsWith("::1");
}

// Maximum cached file size. Enforced at write time in mutations.
export const MAX_CACHED_FILE_BYTES = 500 * 1024;
export const MAX_PAGE_CONTENT_CHARS = 50_000;
export const MAX_USER_AGENT_CHARS = 512;

// Build a stable string representation of content used to derive the SHA-256 version.
// Caller builds the string deterministically — sort pages by order then path before passing.
export function buildVersionInput(
  appName: string,
  appUrl: string,
  description: string,
  parts: ReadonlyArray<string>,
): string {
  return [appName, appUrl, description, ...parts].join("\u0001");
}

// -------- Markdown twins (Dualmark-style page content) --------

export type PageTwinInput = {
  title: string;
  path: string;
  description: string;
  fullContent?: string;
  section?: string;
};

// Map app page path to the markdown site subpath. Root becomes "index".
export function pagePathToMarkdownSlug(path: string): string {
  const normalized = sanitizePath(path.trim());
  if (!normalized || normalized === "/") return "index";
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

// Strip a leading YAML frontmatter block. Used before markdown-to-HTML
// conversion so frontmatter never renders as visible paragraphs.
export function stripYamlFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return markdown;
  return markdown.slice(end + 4).replace(/^\n+/, "");
}

// Map markdown site slug back to canonical page path.
export function markdownSlugToPagePath(slug: string): string {
  const cleaned = sanitizePath(slug.trim()).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleaned || cleaned === "index") return "/";
  return `/${cleaned}`;
}

// Quote a value for YAML frontmatter. Double-quoted with escapes so titles
// containing colons, quotes, or hashes never break parsing.
function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
}

// Build clean markdown for a single page. Falls back to description when fullContent is missing.
// Starts with YAML frontmatter (title, description) matching Cloudflare's
// Markdown for Agents output shape.
export function buildMarkdownTwinBody(page: PageTwinInput): string {
  const lines: Array<string> = [];
  lines.push("---");
  lines.push(`title: ${yamlQuote(page.title)}`);
  if (page.description.trim()) {
    lines.push(`description: ${yamlQuote(page.description.trim())}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${page.title}`);
  lines.push("");
  if (page.description.trim()) {
    lines.push(`> ${page.description.trim()}`);
    lines.push("");
  }
  if (page.section?.trim()) {
    lines.push(`Section: ${page.section.trim()}`);
    lines.push("");
  }
  const body = page.fullContent?.trim() || page.description.trim();
  if (body) {
    lines.push(body);
    lines.push("");
  }
  return lines.join("\n");
}

// RFC 7231 Accept header parsing for text/markdown preference.
export function parseAcceptHeader(header: string | null | undefined): {
  prefersMarkdown: boolean;
} {
  if (!header) return { prefersMarkdown: false };
  const parts = header.split(",").map((part) => part.trim()).filter(Boolean);
  let htmlQ = 1;
  let mdQ = 0;
  for (const part of parts) {
    const [typeRaw, ...params] = part.split(";").map((p) => p.trim());
    const type = typeRaw?.toLowerCase() ?? "";
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split("=").map((p) => p.trim());
      if (key === "q" && value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (type === "text/markdown" || type === "text/x-markdown") mdQ = Math.max(mdQ, q);
    if (type === "text/html" || type === "*/*") htmlQ = Math.max(htmlQ, q);
  }
  return { prefersMarkdown: mdQ > htmlQ };
}

// True when the client wants markdown (Accept header or known AI bot UA).
export function shouldServeMarkdown(req: Request): boolean {
  const { prefersMarkdown } = parseAcceptHeader(req.headers.get("accept"));
  if (prefersMarkdown) return true;
  const { isKnownAgent } = classifyUserAgent(req.headers.get("user-agent"));
  return isKnownAgent;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Minimal markdown to HTML for human-readable markdown site pages (headings, links, lists, quotes).
export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const out: Array<string> = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      closeList();
      out.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeList();
      out.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      closeList();
      out.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("> ")) {
      closeList();
      out.push(`<blockquote><p>${escapeHtml(trimmed.slice(2))}</p></blockquote>`);
      continue;
    }
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMarkdownToHtml(trimmed.slice(2))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inlineMarkdownToHtml(trimmed)}</p>`);
  }

  closeList();
  return out.join("\n");
}

function inlineMarkdownToHtml(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safeHref = escapeHtml(String(href));
    return `<a href="${safeHref}">${escapeHtml(String(label))}</a>`;
  });
}

// Full HTML document for a markdown site page (SEO/AEO/GEO friendly).
export function buildMarkdownPageHtml(args: {
  appName: string;
  title: string;
  description: string;
  bodyHtml: string;
  canonicalUrl: string;
  markdownUrl: string;
  siteIndexUrl: string;
}): string {
  const title = escapeHtml(args.title);
  const description = escapeHtml(args.description);
  const appName = escapeHtml(args.appName);
  const structuredData = escapeJsonForHtml({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.title,
    description: args.description,
    mainEntityOfPage: args.canonicalUrl,
    isAccessibleForFree: true,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | ${appName}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${escapeHtml(args.canonicalUrl)}" />
  <link rel="alternate" type="text/markdown" href="${escapeHtml(args.markdownUrl)}" />
  <meta name="robots" content="index, follow" />
  <script type="application/ld+json">${structuredData}</script>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #111; }
    a { color: #0b57d0; }
    blockquote { border-left: 3px solid #ccc; margin: 1rem 0; padding-left: 1rem; color: #444; }
    nav { margin-bottom: 1.5rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <nav><a href="${escapeHtml(args.siteIndexUrl)}">${appName} markdown</a></nav>
  <main>${args.bodyHtml}</main>
</body>
</html>`;
}

// Index page listing all markdown pages grouped by section.
export function buildMarkdownIndexHtml(args: {
  appName: string;
  description: string;
  siteUrl: string;
  pages: ReadonlyArray<PageTwinInput & { slug: string }>;
}): string {
  const base = normalizeBaseUrl(args.siteUrl);
  const sections = new Map<string, Array<PageTwinInput & { slug: string }>>();
  for (const page of args.pages) {
    const key = page.section?.trim() || "Pages";
    const bucket = sections.get(key) ?? [];
    bucket.push(page);
    sections.set(key, bucket);
  }

  const sectionHtml: Array<string> = [];
  for (const [section, group] of sections) {
    sectionHtml.push(`<h2>${escapeHtml(section)}</h2>`);
    sectionHtml.push("<ul>");
    for (const page of group) {
      const href = `${base}/markdown/${encodeURIComponent(page.slug)}`;
      sectionHtml.push(
        `<li><a href="${escapeHtml(href)}">${escapeHtml(page.title)}</a>: ${escapeHtml(page.description)}</li>`,
      );
    }
    sectionHtml.push("</ul>");
  }

  const bodyHtml = [
    `<h1>${escapeHtml(args.appName)}</h1>`,
    `<p>${escapeHtml(args.description)}</p>`,
    `<p>Human-readable markdown site. Agents can request <code>Accept: text/markdown</code> on any page URL for raw content.</p>`,
    ...sectionHtml,
  ].join("\n");

  return buildMarkdownPageHtml({
    appName: args.appName,
    title: "Markdown site",
    description: args.description,
    bodyHtml,
    canonicalUrl: `${base}/markdown`,
    markdownUrl: `${base}/markdown`,
    siteIndexUrl: `${base}/markdown`,
  });
}
