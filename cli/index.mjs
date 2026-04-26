// CLI dispatcher. Resolves the subcommand and calls the corresponding module.
import { setup } from "./commands/setup.mjs";
import { sync } from "./commands/sync.mjs";
import { status } from "./commands/status.mjs";
import { regenerate } from "./commands/regenerate.mjs";
import { rollback } from "./commands/rollback.mjs";
import { goLive } from "./commands/go-live.mjs";
import { generateDescriptions } from "./commands/generate-descriptions.mjs";
import { publishPage } from "./commands/publish-page.mjs";
import { draftPage } from "./commands/draft-page.mjs";
import { archivePage } from "./commands/archive-page.mjs";
import { restorePage } from "./commands/restore-page.mjs";
import { analytics } from "./commands/analytics.mjs";
import { cleanup } from "./commands/cleanup.mjs";
import { versions } from "./commands/versions.mjs";
import { agentReady } from "./commands/agent-ready.mjs";
import { scan } from "./commands/scan.mjs";

const COMMANDS = {
  setup,
  sync,
  status,
  regenerate,
  rollback,
  "go-live": goLive,
  "generate-descriptions": generateDescriptions,
  "publish-page": publishPage,
  "draft-page": draftPage,
  "archive-page": archivePage,
  "restore-page": restorePage,
  analytics,
  cleanup,
  versions,
  "agent-ready": agentReady,
  scan,
};

function printHelp() {
  console.log(`
@waynesutton/agent-ready CLI

Usage: npx agent-ready <command> [options]

Running with no command runs the setup flow.

Commands:
  setup                         Interactive first-run wizard (default)
  sync [--dry-run]              Reads agent-ready.config.json, applies to deployment
  status                        Cache, job, and testMode state
  regenerate                    Queue a regenerateAll workpool job
  rollback --file <name>        Restore previous cached content
  go-live                       Disable testMode with confirmation
  generate-descriptions [--force]  AI fills empty descriptions
  publish-page --path <path>    Set page to published
  draft-page --path <path>      Set page to draft
  archive-page --path <path>    Archive page
  restore-page --path <path>    Restore soft-deleted page
  analytics                     Print agent request summary
  cleanup [--older-than 7d]     Prune old analytics rows
  versions --path <path>        Show page version history
  agent-ready                     Enable all agent-readiness features
  scan [--url <url>]              Scan deployment for agent readiness score
`);
}

export async function dispatch(args) {
  const [cmd, ...rest] = args;
  // No subcommand: run the setup wizard so `npx agent-ready` is a one-shot install.
  if (!cmd) {
    await setup(parseArgs([]));
    return;
  }
  if (cmd === "-h" || cmd === "--help") {
    printHelp();
    return;
  }
  const handler = COMMANDS[cmd];
  if (!handler) {
    console.error(`Unknown command: ${cmd}\n`);
    printHelp();
    process.exitCode = 1;
    return;
  }
  await handler(parseArgs(rest));
}

// Minimal flag parser. No deps. Supports --flag, --flag=value, and --flag value.
export function parseArgs(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eqIdx = a.indexOf("=");
      if (eqIdx !== -1) {
        out[a.slice(2, eqIdx)] = a.slice(eqIdx + 1);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
          out[a.slice(2)] = next;
          i++;
        } else {
          out[a.slice(2)] = true;
        }
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}
