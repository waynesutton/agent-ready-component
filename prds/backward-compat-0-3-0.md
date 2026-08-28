# Backward compatibility audit and fixes for 0.3.0

Created: 2026-08-17 07:45 UTC
Last Updated: 2026-08-17 08:00 UTC
Status: Done

## Problem

The 0.3.0 simple-mode-first migration (testMode to publish, live by default, per-site markdown route, new getCacheStatus fields) had not been audited for upgrade safety. Two questions needed answers before shipping:

1. Does a 0.2.x install upgrading to 0.3.0 keep working, and does a draft install stay draft?
2. Where do we tell developers what changed and how to upgrade?

## Audit findings

Verified safe with no changes needed:

- Schema: `publish` is optional, `testMode` stays required, so existing settings docs validate on deploy
- `resolvePublishState` in `src/component/lib.ts`: explicit `publish` wins, `testMode: true` resolves to draft, `testMode: false` resolves to live, missing settings resolve to live (zero-config only)
- `upsertSettings` and `applySyncConfig` keep `publish` and `testMode` in sync on every write, so old config files sync correctly
- `getCacheStatus` and `/llms-status` return both `publish` and a deprecated `testMode` mirror, so older widgets and CLIs keep working
- CLI `status` guards with `"publish" in result`, so the new CLI works against an old deployed component
- `fullTxtEnabled` default flip only affects new installs; stored values win
- The new per-site markdown route is collision-guarded and has a `siteMdPath: false` opt-out
- Legacy env var names (`LLMS_ANALYTICS_SECRET`, `LLMS_READINESS_SECRET`) still resolve

Root cause of the one real break:

- The setup wizard scaffolds `convex/agentReady/content.ts` into consumer apps with an inlined `cacheStatusValidator`. The scaffold never overwrites existing files, so wrappers created on 0.2.x are frozen at the old field list. When 0.3.0's `getCacheStatus` returns `publish`, `siteSlug`, and the markdown fields, the stale wrapper throws `ReturnsValidationError`. Both demo apps hit this during the migration and were hand-patched, proving real consumers will hit it too.
- Secondary footgun: `npx agent-ready go-live` flipped the deployment live but left the local config on draft, so the next `sync` silently unpublished the site. Present in 0.2.x too, fixed while in the area.

## Fix

1. Export `cacheStatusValidator` from the package root as the single source of truth. Defined in `src/component/validators.ts`, used by the component's `getCacheStatus` returns, re-exported from `src/client/index.ts`. Consumer wrappers and the component always deploy together (the component bundles from node_modules), so an imported validator can never go stale.
2. Scaffold template, both demo wrappers, and the INTEGRATION.md copy-paste wrapper now import the validator instead of inlining it. The INTEGRATION.md snippet was itself stale (missing all widget fields) and also gained the missing `section` page field.
3. New CLI helper `cli/lib/wrappers.mjs` detects stale wrappers by scanning the consumer's `content.ts` for known field names. `npx agent-ready sync` and `npx agent-ready setup` print the missing fields and the import-based fix. Wrappers that import the validator are recognized as always fresh.
4. `npx agent-ready go-live` now also flips `agent-ready.config.json` (or the legacy filename) to `publish: "live"` so a later sync cannot unpublish the site.
5. New `docs/upgrading.md`: what's new in 0.3.0, a 0.2.x vs 0.3.0 comparison table, the backward compatibility guarantees, upgrade steps, the wrapper fix, route opt-outs, and verification commands. Linked from the README intro and Documentation section. Ships in the npm package (`docs/` is in `files`).

## Files changed

- `src/component/validators.ts`: added `cacheStatusValidator`
- `src/component/content.ts`: `getCacheStatus` returns the shared validator
- `src/client/index.ts`: re-exports `cacheStatusValidator`
- `cli/lib/wrappers.mjs`: new stale-wrapper detection helper
- `cli/commands/setup.mjs`: scaffold imports the validator; skip path warns on stale wrappers
- `cli/commands/sync.mjs`: warns on stale wrappers after sync
- `cli/commands/go-live.mjs`: updates the local config to live
- `example-react/convex/agentReady/content.ts`, `example-svelte/convex/agentReady/content.ts`: import the validator
- `INTEGRATION.md`: wrapper snippet imports the validator, adds `section` to the page validator
- `docs/upgrading.md`: new
- `README.md`: links to the upgrade guide
- `SETUP.md`: release guide checks added after the fact (2026-08-17 08:00 UTC): build-step grep for the `cacheStatusValidator` export in `dist/client`, npm pack spot-check for `docs/upgrading.md` and `cli/lib/wrappers.mjs`, and final checklist items for the README upgrading link, the stale wrapper warning on `sync`, and `go-live` updating the local config

## Edge cases

- Consumer wrapper customized with auth (like the demos): detection is text-based and never overwrites, it only warns
- Wrapper missing entirely: no warning, nothing to break
- Wrapper that already patched the inline copy by hand: all field names present, no warning
- `go-live` with no config file on disk: skips the local update silently
- Config file with `publish` already live: `go-live` leaves the file untouched

## Verification

- `npm run build` and `npm run typecheck` pass
- `cacheStatusValidator` present in `dist/client/index.js`, `dist/client/index.d.ts`, `dist/component/validators.js`
- React demo `convex/agentReady/content.ts` typechecks against the package import (remaining demo errors are pre-existing auth typings unrelated to this change)
- Simulated stale wrapper detection: helper flags a 0.2.x-shaped validator and lists `publish`, `siteSlug`, `markdownSiteEnabled`, and the other missing fields
