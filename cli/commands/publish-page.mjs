import { convexRun, formatError } from "../lib/convex.mjs";

export async function publishPage(args) {
  if (!args.path) {
    console.error("Missing --path <path>");
    process.exitCode = 1;
    return;
  }
  try {
    await convexRun("agentReady:content:publishPage", { path: args.path }, { prod: args.prod });
    console.log(`Published page ${args.path}`);
  } catch (err) {
    console.error("publish-page failed:", formatError(err));
    process.exitCode = 1;
  }
}
