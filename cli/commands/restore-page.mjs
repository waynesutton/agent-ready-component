import { convexRun, formatError } from "../lib/convex.mjs";

export async function restorePage(args) {
  if (!args.path) {
    console.error("Missing --path <path>");
    process.exitCode = 1;
    return;
  }
  try {
    await convexRun("agentReady:content:restorePage", { path: args.path }, { prod: args.prod });
    console.log(`Restored page ${args.path}`);
  } catch (err) {
    console.error("restore-page failed:", formatError(err));
    process.exitCode = 1;
  }
}
