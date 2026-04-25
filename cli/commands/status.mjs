import { convexRun, formatError } from "../lib/convex.mjs";

export async function status(args) {
  try {
    const result = await convexRun("agentReady:content:getCacheStatus", {}, { prod: args.prod });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Status failed:", formatError(err));
    process.exitCode = 1;
  }
}
