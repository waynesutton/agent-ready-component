// Detects consumer wrapper files scaffolded by an older package version.
// Wrappers that inline their own cacheStatusValidator break with a
// ReturnsValidationError when the component's getCacheStatus gains fields.
// Wrappers that import cacheStatusValidator from the package never go stale.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Field names returned by the component's getCacheStatus. Update alongside
// cacheStatusValidator in src/component/validators.ts when the shape changes.
const CACHE_STATUS_FIELDS = [
  "publish",
  "testMode",
  "siteSlug",
  "appName",
  "appUrl",
  "lastGeneratedAt",
  "generatedFromVersion",
  "generationInProgress",
  "hasDrafts",
  "fullTxtEnabled",
  "widgetVisible",
  "widgetStatusVisible",
  "widgetShowFiles",
  "widgetShowAppName",
  "widgetShowDescription",
  "widgetShowMeta",
  "widgetShowScoreTab",
  "widgetDesktopCollapse",
  "widgetCleanMode",
  "widgetShowHumanTab",
  "widgetShowMachineTab",
  "widgetShowChatLinks",
  "widgetShowChatGPT",
  "widgetShowClaude",
  "widgetShowPerplexity",
  "readinessEndpointEnabled",
  "robotsTxtEnabled",
  "sitemapEnabled",
  "rssEnabled",
  "agentSkillsEnabled",
  "discoveryHeaders",
  "markdownNegotiation",
  "markdownSiteEnabled",
  "widgetShowMarkdownTab",
];

// Returns null when the wrapper is missing or up to date, otherwise a report
// with the wrapper path and the field names its inline validator lacks.
export async function checkWrapperFreshness(cwd = process.cwd()) {
  const wrapperPath = path.join(cwd, "convex", "agentReady", "content.ts");
  if (!existsSync(wrapperPath)) return null;

  let source;
  try {
    source = await readFile(wrapperPath, "utf8");
  } catch {
    return null;
  }

  // Wrappers that import the shared validator stay in sync automatically.
  if (
    source.includes("cacheStatusValidator") &&
    source.includes('from "@waynesutton/agent-ready"')
  ) {
    return null;
  }

  // Best-effort text scan of the inlined validator for known field names.
  const missing = CACHE_STATUS_FIELDS.filter(
    (field) => !new RegExp(`\\b${field}\\s*:`).test(source),
  );
  if (missing.length === 0) return null;

  return { wrapperPath, missing };
}

// Prints the stale-wrapper warning with copyable fix instructions.
export function printWrapperWarning(report) {
  const rel = path.relative(process.cwd(), report.wrapperPath);
  console.log("");
  console.log(`[agent-ready] ${rel} was scaffolded by an older version.`);
  console.log(
    `  Its getCacheStatus return validator is missing: ${report.missing.join(", ")}`,
  );
  console.log(
    "  Convex will throw ReturnsValidationError when your app calls getCacheStatus.",
  );
  console.log("");
  console.log("  Fix: replace the inlined cacheStatusValidator with the package export.");
  console.log('    import { cacheStatusValidator } from "@waynesutton/agent-ready";');
  console.log("  Then delete the local `const cacheStatusValidator = v.object({...})` block.");
  console.log("  The imported validator stays in sync with the component on every upgrade.");
  console.log("");
  console.log(
    "  Details: https://github.com/waynesutton/agent-ready-component/blob/main/docs/upgrading.md",
  );
  console.log("");
}
