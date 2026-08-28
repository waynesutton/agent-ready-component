import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { confirm } from "../lib/prompts.mjs";
import { convexRun, formatError } from "../lib/convex.mjs";

// Keep the local config in step with the deployment so the next
// `npx agent-ready sync` does not silently flip the site back to draft.
async function updateLocalConfig() {
  const primary = path.resolve("agent-ready.config.json");
  const legacy = path.resolve("llms-txt.config.json");
  const configPath = existsSync(primary) ? primary : existsSync(legacy) ? legacy : null;
  if (!configPath) return;
  try {
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw);
    const settings = config.settings ?? {};
    const wasDraft = settings.publish === "draft" || settings.testMode === true;
    if (!wasDraft) return;
    settings.publish = "live";
    if ("testMode" in settings) settings.testMode = false;
    config.settings = settings;
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`Updated ${path.basename(configPath)} to publish: "live" so sync stays live.`);
  } catch {
    console.log(
      'Could not update the local config. Set publish: "live" in agent-ready.config.json before the next sync.',
    );
  }
}

export async function goLive(args) {
  console.log("");
  console.log("Setting publish to \"live\" will expose /llms.txt, /agents.md, and the");
  console.log("per-site markdown file to all HTTP clients, including AI crawlers.");
  console.log("(New installs are live by default; this flips a draft install back to live.)");
  console.log("");
  const ok = await confirm("Proceed?", true);
  if (!ok) {
    console.log("Cancelled.");
    return;
  }
  try {
    // Set publish and clear the deprecated testMode alias in one patch.
    await convexRun(
      "agentReady:content:upsertSettings",
      { patch: { publish: "live", testMode: false } },
      { prod: args.prod },
    );
    console.log("publish is now \"live\". Your files are live.");
    await updateLocalConfig();
    console.log("Review before publishing next time? Set publish: \"draft\" in agent-ready.config.json.");
  } catch (err) {
    console.error("go-live failed:", formatError(err));
    process.exitCode = 1;
  }
}
