import { convexRun, formatError } from "../lib/convex.mjs";

export async function generateDescriptions(args) {
  try {
    const result = await convexRun(
      "agentReady:content:generateDescriptions",
      { force: Boolean(args.force) },
      { prod: args.prod },
    );
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("generate-descriptions failed:", formatError(err));
    process.exitCode = 1;
  }
}
