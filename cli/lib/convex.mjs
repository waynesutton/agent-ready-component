// Thin wrapper around the Convex CLI. Shells out to `npx convex run` with JSON args.
// Kept dependency-free so the component stays small.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// Invoke a Convex function by reference. `fnRef` is the dotted reference string (e.g. "content:getSettings").
// Returns the parsed stdout as JSON when the call returns JSON, otherwise the raw string.
export async function convexRun(fnRef, argsObj = {}, options = {}) {
  const cliArgs = ["convex", "run", fnRef];
  if (Object.keys(argsObj).length > 0) {
    cliArgs.push("--args", JSON.stringify(argsObj));
  }
  if (options.prod) cliArgs.push("--prod");
  if (options.component) cliArgs.push("--component", options.component);
  const { stdout } = await run("npx", cliArgs, {
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
  });
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

// Helper that formats error output for a failed convex call.
export function formatError(err) {
  if (!err) return "unknown error";
  if (err.stderr) return err.stderr.trim();
  if (err.message) return err.message;
  return String(err);
}
