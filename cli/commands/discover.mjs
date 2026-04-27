// Discover candidate pages and endpoints from local files.
// V1 is intentionally local. We scan:
//   - convex/http.ts for registered HTTP routes (skipping agent-ready-managed paths)
//   - public/llms.txt, public/agents.md if present (delegated to import for content)
//   - the existing agent-ready.config.json for what is already tracked
// The output is a printed report. We do not auto-write because that is what `import` is for.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseLlmsTxt } from "./import.mjs";

const AGENT_READY_RESERVED_PATHS = new Set([
  "/llms.txt",
  "/agents.md",
  "/llms-full.txt",
  "/llms-status",
  "/llms-readiness",
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known/agent-skills",
]);

function extractRoutesFromHttpTs(source) {
  const found = [];
  const routeRe = /path\s*:\s*["'`](?<path>[^"'`]+)["'`]\s*,\s*method\s*:\s*["'`](?<method>[^"'`]+)["'`]/g;
  let match;
  while ((match = routeRe.exec(source))) {
    const routePath = match.groups?.path ?? "";
    const method = (match.groups?.method ?? "GET").toUpperCase();
    if (!routePath || AGENT_READY_RESERVED_PATHS.has(routePath)) continue;
    found.push({ path: routePath, method });
  }
  return found;
}

export async function discover(args) {
  const cwd = process.cwd();
  console.log("Scanning local files for agent-ready candidates...");
  console.log("");

  const httpTsPath = path.join(cwd, "convex", "http.ts");
  const detectedEndpoints = [];
  if (existsSync(httpTsPath)) {
    try {
      const src = await readFile(httpTsPath, "utf8");
      detectedEndpoints.push(...extractRoutesFromHttpTs(src));
    } catch {
      console.warn("  Could not read convex/http.ts. Skipping.");
    }
  } else {
    console.log("  convex/http.ts not found. Skipping route scan.");
  }

  // Static llms.txt files. We only report counts here. Use `import` to copy them in.
  const staticCandidates = [
    "public/llms.txt",
    "static/llms.txt",
    "llms.txt",
    "public/agents.md",
  ];
  const staticFound = [];
  for (const rel of staticCandidates) {
    const abs = path.join(cwd, rel);
    if (existsSync(abs)) {
      try {
        const raw = await readFile(abs, "utf8");
        if (rel.endsWith("llms.txt")) {
          const parsed = parseLlmsTxt(raw);
          staticFound.push({ file: rel, pages: parsed.pages.length });
        } else {
          staticFound.push({ file: rel, pages: 0 });
        }
      } catch {
        // ignore
      }
    }
  }

  const configPath = path.join(cwd, args.config || "agent-ready.config.json");
  const legacyConfigPath = path.join(cwd, "llms-txt.config.json");
  let existingPages = 0;
  let existingEndpoints = 0;
  let existingConfigFile = null;
  if (existsSync(configPath)) existingConfigFile = configPath;
  else if (existsSync(legacyConfigPath)) existingConfigFile = legacyConfigPath;
  if (existingConfigFile) {
    try {
      const config = JSON.parse(await readFile(existingConfigFile, "utf8"));
      existingPages = Array.isArray(config.pages) ? config.pages.length : 0;
      existingEndpoints = Array.isArray(config.endpoints) ? config.endpoints.length : 0;
    } catch {
      // ignore
    }
  }

  console.log("Discovery report");
  console.log("----------------");
  console.log(`  Existing config:    ${existingConfigFile ? path.relative(cwd, existingConfigFile) : "not found"}`);
  console.log(`  Pages tracked:      ${existingPages}`);
  console.log(`  Endpoints tracked:  ${existingEndpoints}`);
  console.log("");
  console.log(`  HTTP routes found in convex/http.ts: ${detectedEndpoints.length}`);
  for (const r of detectedEndpoints) {
    console.log(`    ${r.method.padEnd(6)} ${r.path}`);
  }
  console.log("");
  console.log(`  Static discovery files found: ${staticFound.length}`);
  for (const f of staticFound) {
    if (f.pages > 0) {
      console.log(`    ${f.file}  (${f.pages} pages parsed)`);
    } else {
      console.log(`    ${f.file}`);
    }
  }

  console.log("");
  console.log("Next steps:");
  if (staticFound.some((f) => f.file.endsWith("llms.txt"))) {
    const llmsFile =
      staticFound.find((f) => f.file === "public/llms.txt")?.file ??
      staticFound.find((f) => f.file.endsWith("llms.txt"))?.file ??
      "public/llms.txt";
    console.log(`  Import existing pages: npx agent-ready import --from ${llmsFile}`);
  }
  if (detectedEndpoints.length > 0) {
    console.log("  Add endpoints by editing agent-ready.config.json. The shape is:");
    console.log('    "endpoints": [{ "path": "/api/example", "method": "GET", "description": "..." }]');
  }
  console.log("  Then run: npx agent-ready sync");
}
