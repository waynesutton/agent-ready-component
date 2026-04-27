// Prints copyable Agent Ready URLs from config or a provided base URL.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROUTES = [
  { label: "llms.txt", path: "/llms.txt", setting: null },
  { label: "agents.md", path: "/agents.md", setting: null },
  { label: "llms-full.txt", path: "/llms-full.txt", setting: "fullTxtEnabled" },
  { label: "robots.txt", path: "/robots.txt", setting: "robotsTxtEnabled" },
  { label: "sitemap.xml", path: "/sitemap.xml", setting: "sitemapEnabled" },
  { label: "agent skills", path: "/.well-known/agent-skills", setting: "agentSkillsEnabled" },
  { label: "readiness", path: "/llms-readiness", setting: "readinessEndpointEnabled" },
  { label: "status", path: "/llms-status", setting: null },
];

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

async function readConfig(configPath) {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

function formatEnabled(settings, setting) {
  if (!setting) return "";
  return settings?.[setting] === false ? " (disabled in config)" : "";
}

export async function links(args) {
  const explicitConfig = args.config ? path.resolve(args.config) : null;
  const primary = path.resolve("agent-ready.config.json");
  const legacy = path.resolve("llms-txt.config.json");
  const configPath = explicitConfig ?? (existsSync(primary) ? primary : legacy);

  let config = {};
  if (existsSync(configPath)) {
    try {
      config = await readConfig(configPath);
    } catch (err) {
      console.error(`Could not read ${path.relative(process.cwd(), configPath)}.`);
      process.exitCode = 1;
      return;
    }
  }

  const settings = config.settings ?? {};
  const base = normalizeBaseUrl(args.url ?? settings.appUrl);

  if (!base) {
    console.error(
      "No URL found. Use `npx agent-ready links --url https://your-deployment.convex.site` or run setup first.",
    );
    process.exitCode = 1;
    return;
  }

  const llmsUrl = `${base}/llms.txt`;
  const encodedLlmsUrl = encodeURIComponent(llmsUrl);

  console.log(`Agent Ready links for ${base}`);
  console.log("");
  for (const route of ROUTES) {
    console.log(`${route.label.padEnd(14)} ${base}${route.path}${formatEnabled(settings, route.setting)}`);
  }

  console.log("");
  console.log("AI chat links");
  console.log(`ChatGPT        https://chatgpt.com/?hints=search&q=Read+this+URL+${encodedLlmsUrl}+and+summarize+the+app`);
  console.log(`Claude         https://claude.ai/new?q=Read+this+URL+${encodedLlmsUrl}+and+summarize+the+app`);
  console.log(`Perplexity     https://www.perplexity.ai/?q=Read+this+URL+${encodedLlmsUrl}+and+summarize+the+app`);

  if (settings.widgetVisible === false) {
    console.log("");
    console.log("Widget visibility: hidden. Generated files and routes still work.");
  }
}
