import { convexRun, formatError } from "../lib/convex.mjs";

export async function regenerate(args) {
  try {
    const jobId = await convexRun("agentReady:content:regenerateAll", {}, { prod: args.prod });
    console.log(`Queued regeneration. jobId=${jobId}`);
  } catch (err) {
    console.error("Regenerate failed:", formatError(err));
    process.exitCode = 1;
  }
}
