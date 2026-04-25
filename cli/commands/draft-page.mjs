import { convexRun, formatError } from "../lib/convex.mjs";

export async function draftPage(args) {
  if (!args.path) {
    console.error("Missing --path <path>");
    process.exitCode = 1;
    return;
  }
  try {
    await convexRun("agentReady:content:draftPage", { path: args.path }, { prod: args.prod });
    console.log(`Drafted page ${args.path}`);
  } catch (err) {
    console.error("draft-page failed:", formatError(err));
    process.exitCode = 1;
  }
}
