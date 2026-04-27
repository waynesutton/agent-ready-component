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

export function buildContentSignalHeader(
  signals?: ContentSignals | null,
): string {
  const s = signals ?? { aiTrain: true, search: true, aiInput: true };
  return `ai-train=${s.aiTrain ? "yes" : "no"}, search=${s.search ? "yes" : "no"}, ai-input=${s.aiInput ? "yes" : "no"}`;
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
