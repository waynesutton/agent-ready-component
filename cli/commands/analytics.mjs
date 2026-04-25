import { convexRun, formatError } from "../lib/convex.mjs";

export async function analytics(args) {
  try {
    const summary = await convexRun("agentReady:analytics:getSummary", { now: Date.now() }, { prod: args.prod });
    if (!summary) {
      console.log("Analytics are disabled. Enable with: npx agent-ready sync after setting analyticsEnabled: true in agent-ready.config.json");
      return;
    }
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error("analytics failed:", formatError(err));
    process.exitCode = 1;
  }
}
