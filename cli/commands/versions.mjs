import { convexRun, formatError } from "../lib/convex.mjs";

export async function versions(args) {
  if (!args.path) {
    console.error("Missing --path <path>");
    process.exitCode = 1;
    return;
  }
  try {
    const rows = await convexRun(
      "agentReady:content:getPageVersions",
      { path: args.path },
      { prod: args.prod },
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`No version history for ${args.path}. Enable with versioningEnabled: true.`);
      return;
    }
    for (const row of rows) {
      console.log(
        `- ${new Date(row.snapshotAt).toISOString()}  status=${row.status}  title="${row.title}"`,
      );
    }
  } catch (err) {
    console.error("versions failed:", formatError(err));
    process.exitCode = 1;
  }
}
