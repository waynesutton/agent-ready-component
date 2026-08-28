import { convexRun, formatError } from "../lib/convex.mjs";

export async function status(args) {
  try {
    const result = await convexRun("agentReady:content:getCacheStatus", {}, { prod: args.prod });
    // Lead with the publish state so the live/draft answer is never buried in JSON.
    if (result && typeof result === "object" && "publish" in result) {
      console.log(`publish: ${result.publish}${result.publish === "draft" ? " (public routes return 404; run npx agent-ready go-live)" : ""}`);
      console.log("");
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Status failed:", formatError(err));
    process.exitCode = 1;
  }
}
