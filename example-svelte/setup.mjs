// Idempotent seed script for the Svelte demo. Mirrors example-react/setup.mjs.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

async function main() {
  const newPath = path.join(process.cwd(), "agent-ready.config.json");
  const legacyPath = path.join(process.cwd(), "llms-txt.config.json");
  const cfgPath = existsSync(newPath) ? newPath : existsSync(legacyPath) ? legacyPath : null;
  if (!cfgPath) {
    console.log("[setup] No agent-ready.config.json found. Skipping seed.");
    return;
  }
  const config = JSON.parse(await readFile(cfgPath, "utf8"));
  try {
    await run("npx", ["convex", "run", "agentReady:content:sync", "--args", JSON.stringify({ config })]);
    console.log(`[setup] Synced ${path.basename(cfgPath)}`);
  } catch (err) {
    console.warn("[setup] Could not sync config. Is `npx convex dev` running?");
    console.warn(err?.stderr ?? err?.message ?? String(err));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
