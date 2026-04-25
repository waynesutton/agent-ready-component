import { confirm } from "../lib/prompts.mjs";
import { convexRun, formatError } from "../lib/convex.mjs";

export async function goLive(args) {
  console.log("");
  console.log("Flipping testMode to false will expose /llms.txt, /agents.md, and /llms-full.txt");
  console.log("to all HTTP clients, including AI crawlers.");
  console.log("");
  const ok = await confirm("Proceed?", false);
  if (!ok) {
    console.log("Cancelled.");
    return;
  }
  try {
    await convexRun("agentReady:content:upsertSettings", { patch: { testMode: false } }, { prod: args.prod });
    console.log("testMode is now false. Your files are live.");
  } catch (err) {
    console.error("go-live failed:", formatError(err));
    process.exitCode = 1;
  }
}
