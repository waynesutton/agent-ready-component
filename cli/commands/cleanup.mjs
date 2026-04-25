import { convexRun, formatError } from "../lib/convex.mjs";

// Parses --older-than formats like "7d", "24h", "3600000" (ms).
function parseDuration(value) {
  if (!value) return undefined;
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(String(value));
  if (!match) return undefined;
  const n = Number(match[1]);
  const unit = match[2] ?? "ms";
  const mult = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return n * mult;
}

export async function cleanup(args) {
  const olderThanMs = parseDuration(args["older-than"]);
  try {
    const deleted = await convexRun(
      "agentReady:analytics:cleanupOldRequests",
      olderThanMs ? { olderThanMs } : {},
      { prod: args.prod },
    );
    console.log(`Deleted ${deleted} analytics rows.`);
    const orphaned = await convexRun(
      "agentReady:analytics:cleanupOrphanedCacheEntries",
      {},
      { prod: args.prod },
    );
    console.log(`Deleted ${orphaned} orphaned cache entries.`);
  } catch (err) {
    console.error("cleanup failed:", formatError(err));
    process.exitCode = 1;
  }
}
