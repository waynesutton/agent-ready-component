// Reads agent-ready.config.json and applies it to the deployment.
// Falls back to the legacy llms-txt.config.json if the new file is not present.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { convexRun, formatError } from "../lib/convex.mjs";

export async function sync(args) {
  const explicit = args.config ? path.resolve(args.config) : null;
  const primary = path.resolve("agent-ready.config.json");
  const legacy = path.resolve("llms-txt.config.json");
  const configPath = explicit ?? (existsSync(primary) ? primary : legacy);
  const raw = await readFile(configPath, "utf8");
  const config = JSON.parse(raw);

  if (args["dry-run"]) {
    console.log("Dry run. Config that would be applied:");
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  try {
    const result = await convexRun("agentReady:content:sync", { config }, { prod: args.prod });
    console.log("Sync complete.");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Sync failed:", formatError(err));
    process.exitCode = 1;
  }
}
