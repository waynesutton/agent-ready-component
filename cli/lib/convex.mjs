// Thin wrapper around the Convex CLI. Shells out to `npx convex run` with JSON args.
// Kept dependency-free so the component stays small.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// Invoke a Convex function by reference.
// `fnRef` uses the internal format "agentReady:module:fn". The Convex CLI
// expects "--component agentReady module:fn", so we split the prefix here.
export async function convexRun(fnRef, argsObj = {}, options = {}) {
  const cliArgs = ["convex", "run"];
  if (options.prod) cliArgs.push("--prod");

  let resolvedRef = fnRef;
  const componentPrefix = "agentReady:";
  if (fnRef.startsWith(componentPrefix)) {
    const rest = fnRef.slice(componentPrefix.length);
    cliArgs.push("--component", "agentReady");
    resolvedRef = rest;
  }
  if (options.component) cliArgs.push("--component", options.component);

  cliArgs.push(resolvedRef);
  if (Object.keys(argsObj).length > 0) {
    cliArgs.push(JSON.stringify(argsObj));
  }
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
