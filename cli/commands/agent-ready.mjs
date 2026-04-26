// One command to enable everything
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

export async function agentReady(args) {
  const configPath = resolve(process.cwd(), args.config || "agent-ready.config.json");
  
  if (!existsSync(configPath)) {
    console.error("No agent-ready.config.json found. Run `npx agent-ready setup` first.");
    process.exitCode = 1;
    return;
  }

  console.log("Enabling all agent-readiness features...\n");

  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  
  // Patch settings with all readiness flags
  config.settings = {
    ...config.settings,
    contentSignals: { aiTrain: true, search: true, aiInput: true },
    markdownNegotiation: true,
    discoveryHeaders: true,
    robotsTxtEnabled: true,
    robotsTxtAllowAiBots: true,
    sitemapEnabled: true,
    agentSkillsEnabled: true,
    readinessEndpointEnabled: true,
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log("Updated agent-ready.config.json with all readiness flags.\n");

  // Sync to deployment
  try {
    const configJson = JSON.stringify(config);
    execSync(
      `npx convex run --component agentReady content:sync '${JSON.stringify({ config: JSON.parse(configJson) })}'`,
      { stdio: "inherit" }
    );
    console.log("\nConfig synced to deployment.");
  } catch {
    console.error("Sync failed. Make sure Convex is running.");
  }

  // Regenerate
  try {
    execSync(
      `npx convex run --component agentReady content:regenerateAll '{}'`,
      { stdio: "inherit" }
    );
    console.log("Regeneration queued.\n");
  } catch {
    console.error("Regeneration failed.");
  }

  console.log("All agent-readiness features enabled.");
  console.log("Run `npx agent-ready scan` to verify your score.\n");
}
