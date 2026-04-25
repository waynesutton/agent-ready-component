import { convexRun, formatError } from "../lib/convex.mjs";

export async function rollback(args) {
  const file = args.file;
  if (!file) {
    console.error("Missing --file <llms.txt|agents.md|llms-full.txt>");
    process.exitCode = 1;
    return;
  }
  const valid = ["llms.txt", "agents.md", "llms-full.txt"];
  if (!valid.includes(file)) {
    console.error(`--file must be one of: ${valid.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  try {
    await convexRun("agentReady:content:rollbackCache", { fileType: file }, { prod: args.prod });
    console.log(`Restored previous content for ${file}`);
  } catch (err) {
    console.error("Rollback failed:", formatError(err));
    process.exitCode = 1;
  }
}
