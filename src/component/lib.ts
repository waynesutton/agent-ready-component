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
