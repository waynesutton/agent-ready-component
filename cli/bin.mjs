#!/usr/bin/env node
// Entry point for `npx agent-ready <command>`.
// Kept tiny. Dispatch lives in ./index.mjs.
import { dispatch } from "./index.mjs";

dispatch(process.argv.slice(2)).catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
