import { convexRun, formatError } from "../lib/convex.mjs";

export async function archivePage(args) {
  if (!args.path) {
    console.error("Missing --path <path>");
    process.exitCode = 1;
    return;
  }
  try {
    await convexRun("agentReady:content:archivePage", { path: args.path }, { prod: args.prod });
    console.log(`Archived page ${args.path}`);
  } catch (err) {
    console.error("archive-page failed:", formatError(err));
    process.exitCode = 1;
  }
}
