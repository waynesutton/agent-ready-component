// Interactive first-run wizard. Writes agent-ready.config.json and syncs it to the deployment.
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prompt, confirm, choose } from "../lib/prompts.mjs";
import { convexRun, formatError } from "../lib/convex.mjs";

export async function setup(_args) {
  console.log("");
  console.log("@waynesutton/agent-ready setup wizard");
  console.log("");

  const appName = await prompt("App name", "My App");
  const appUrl = await prompt("App URL (no trailing slash)", "https://example.com");
  const description = await prompt("One-line description for LLMs", "A useful app.");
  const analyticsEnabled = await confirm("Enable analytics?", false);
  const aiDescriptionsEnabled = await confirm("Enable AI description generation?", false);
  const aiProvider = aiDescriptionsEnabled
    ? await choose("AI provider", ["claude", "openai"], "claude")
    : "claude";

  // Default config filename. Legacy llms-txt.config.json is auto-migrated below.
  const configPath = path.join(process.cwd(), "agent-ready.config.json");
  const legacyConfigPath = path.join(process.cwd(), "llms-txt.config.json");
  let existing = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(await readFile(configPath, "utf8"));
    } catch {
      existing = {};
    }
  } else if (existsSync(legacyConfigPath)) {
    // Soft migration: read legacy file once, write under the new name.
    try {
      existing = JSON.parse(await readFile(legacyConfigPath, "utf8"));
      console.log("[setup] Migrating llms-txt.config.json -> agent-ready.config.json");
    } catch {
      existing = {};
    }
  }

  const nextConfig = {
    ...existing,
    settings: {
      ...(existing.settings ?? {}),
      appName,
      appUrl,
      description,
      analyticsEnabled,
      aiDescriptionsEnabled,
      aiProvider,
      testMode: existing.settings?.testMode ?? true,
      cronEnabled: existing.settings?.cronEnabled ?? true,
      cronIntervalHours: existing.settings?.cronIntervalHours ?? 24,
      widgetPosition: existing.settings?.widgetPosition ?? "floating-bottom-right",
      widgetStatusVisible: existing.settings?.widgetStatusVisible ?? true,
      widgetColors: existing.settings?.widgetColors ?? {},
      theme: existing.settings?.theme ?? "system",
      fullTxtEnabled: existing.settings?.fullTxtEnabled ?? false,
      permissiveMode: existing.settings?.permissiveMode ?? false,
      versioningEnabled: existing.settings?.versioningEnabled ?? false,
    },
    pages: existing.pages ?? [],
    endpoints: existing.endpoints ?? [],
  };

  await writeFile(configPath, JSON.stringify(nextConfig, null, 2) + "\n");
  console.log("");
  console.log(`Wrote ${path.relative(process.cwd(), configPath)}`);

  try {
    await convexRun("agentReady:content:sync", { config: nextConfig });
    console.log("Synced config to Convex deployment");
  } catch (err) {
    console.warn("Could not sync config yet. Run `npx convex dev` first, then rerun sync.");
    console.warn(formatError(err));
  }

  console.log("");
  console.log("Next steps:");
  console.log("  1. Add registerRoutes() to convex/http.ts (see INTEGRATION.md)");
  console.log("  2. Add <AgentReadyWidget /> to your app");
  console.log("  3. Run: npx agent-ready go-live   (when ready for production)");
  console.log("");
  console.log("Your files will be available at:");
  console.log("  https://<your-deployment>.convex.site/llms.txt");
  console.log("  https://<your-deployment>.convex.site/agents.md");
}
