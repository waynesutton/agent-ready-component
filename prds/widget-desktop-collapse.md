# Widget desktop collapse

## Problem

The mobile collapsed presentation shipped in `prds/widget-mobile-collapse.md` only activates when the viewport drops below `mobileBreakpoint` (default `480px`). Users who want the same compact, toggleable experience on desktop have no way to opt in. They want to:

- Pick the collapse behavior for desktop just like they already pick it for mobile.
- Configure the default in `agent-ready.config.json` so a single source of truth drives every install.
- Get prompted for the option during `npx agent-ready setup`, with a sensible default of `true`.
- Have both demo apps (`example-react`, `example-svelte`) ship with the new default so the live demos show the experience.

The widget should still keep the existing mobile behavior intact. Existing installs that pass props directly should not flip behavior unless they opt in.

## Goals

- One new public widget prop, `desktopCollapse`, on both the React and Svelte widgets.
- One new component-level config field, `widgetDesktopCollapse`, exposed through `getCacheStatus` so the widget can read it without code edits.
- CLI setup wizard asks a single yes or no question, defaulting to `true`, and writes `widgetDesktopCollapse` into `agent-ready.config.json`.
- Demo apps (`example-react`, `example-svelte`) set `widgetDesktopCollapse: true` in their config and extend their wrapper `cacheStatusValidator` to include the field.
- No regression to the existing mobile collapse behavior or any other widget feature.

## Non-goals

- A new "default desktop collapsed" setting. The widget reuses `defaultMobileCollapsed` so the initial collapsed state on desktop matches mobile when the user opted into desktop collapse. The user said "collapse like mobile view regardless".
- Keyboard shortcut, resize handle, or animation work. Out of scope.
- New visual theme, sizing, or chrome changes on desktop beyond showing the existing caret toggle button.

## Proposed solution

Add `desktopCollapse` as an opt-in flag that turns on the same caret toggle the mobile view already renders, even on desktop viewports.

### Public widget API additions

Both widgets gain one new optional prop:

- `desktopCollapse?: boolean`
  - React prop default: `false`
  - Svelte export default: `false`
  - Resolution order: explicit prop, then `status.widgetDesktopCollapse` from the config endpoint, then `false`.

`mobileCollapse`, `mobileBreakpoint`, and `defaultMobileCollapsed` keep their current names, defaults, and meaning. `defaultMobileCollapsed` controls the initial collapsed state for both the mobile mode and the new desktop-collapse mode so users get one consistent default.

### Behavior

Inside the widget, introduce a single `collapseActive` flag computed as:

- `mobileActive = isMobile && mobileCollapse`
- `desktopCollapseActive = !isMobile && desktopCollapseEnabled`
- `collapseActive = mobileActive || desktopCollapseActive`

Then:

- The caret toggle button renders when `collapseActive` is `true`.
- The panel renders when `!collapseActive || !collapsed`.
- Width clamp `min(280px, calc(100vw - 24px))` and edge inset shrink (24px to 12px) only run when `mobileActive` is `true`. Desktop collapse keeps the full 280px width and the existing 24px insets so collapsing desktop does not change layout dimensions.
- `collapsed` continues to use `defaultMobileCollapsed` as the initial value. With `desktopCollapse: true`, the widget begins collapsed on desktop, mirroring the mobile experience the user requested.

### Component-level config

Add one new optional field to the singleton settings row.

- Schema (`src/component/schema.ts`): `widgetDesktopCollapse: v.optional(v.boolean())`.
- Validators (`src/component/validators.ts`): add to both `settingsPatchValidator` and `settingsDocValidator` as optional.
- `getCacheStatus` query in `src/component/content.ts`: include `widgetDesktopCollapse: v.boolean()` in the validator and return `settings?.widgetDesktopCollapse ?? false` from the handler so existing deployments default to off.
- `upsertSettings` insert path: forward `widgetDesktopCollapse` from `args.patch`.
- `applySyncConfig` insert path in `src/component/contentInternal.ts`: forward the field on insert.
- Public types in `src/client/types.ts`: add `widgetDesktopCollapse?: boolean` to `AgentReadySettings` and `widgetDesktopCollapse: boolean` to `AgentReadyStatus`.
- Generated `src/component/_generated/component.ts`: mirror the new field across the same five places that already list `widgetCleanMode`. The change matches what `npx convex dev` would emit on the next codegen.

### Wrapper validators in demo apps

Both `example-react/convex/agentReady/content.ts` and `example-svelte/convex/agentReady/content.ts` define a local `cacheStatusValidator` that mirrors the component's status response. Add `widgetDesktopCollapse: v.boolean()` so the wrappers stay in lockstep with the component.

### CLI setup wizard

In `cli/commands/setup.mjs`, after the existing widget framework and mount location prompts and before writing the config:

- Ask `Allow widget collapse on desktop?` with a default of `true`.
- Apply the answer when writing `nextConfig.settings.widgetDesktopCollapse`. Existing configs that already define the field keep their previous answer unless the user explicitly changes it. The default for new and existing-but-unset installs is `true`.

### Demo apps

- `example-react/agent-ready.config.json` and `example-svelte/agent-ready.config.json` add `"widgetDesktopCollapse": true`.
- No code edits in the React or Svelte demo source. The widgets read the new flag through the status endpoint.

## Files to change

- `prds/widget-desktop-collapse.md` (new, this file)
- `task.md` (track new work)
- `src/component/schema.ts`
- `src/component/validators.ts`
- `src/component/content.ts`
- `src/component/contentInternal.ts`
- `src/component/_generated/component.ts`
- `src/client/types.ts`
- `src/react/AgentReadyWidget.tsx`
- `src/svelte/AgentReadyWidget.svelte`
- `example-react/agent-ready.config.json`
- `example-svelte/agent-ready.config.json`
- `example-react/convex/agentReady/content.ts`
- `example-svelte/convex/agentReady/content.ts`
- `cli/commands/setup.mjs`
- `README.md`
- `docs/install.md`
- `files.md`
- `changelog.md`

## Edge cases

- SSR. `useIsMobile` and the Svelte `matchMedia` setup keep their existing SSR guards. On the server, `isMobile === false` and `desktopCollapseActive` reduces to `desktopCollapseEnabled`. The toggle still renders correctly on hydration.
- Existing apps with no config field. `status.widgetDesktopCollapse` falls back to `false`, so behavior is unchanged.
- Apps that already pass `desktopCollapse={false}` in code. Explicit prop wins over the config fallback. Behavior is unchanged.
- Viewport resize from mobile to desktop or back. `mobileActive` and `desktopCollapseActive` are reactive. The shared `collapsed` state persists across the boundary so the user's last toggle decision survives.
- Hidden tabs. `anyTabVisible` already short-circuits the widget render. Adding the new flag does not affect that path.
- Width on desktop collapse. We deliberately keep the full 280px width and 24px insets when only `desktopCollapseActive` is true. Desktop users still see the same chrome dimensions as before, just with the optional caret button.

## Verification

- `npm run typecheck`
- `npm run build`
- `npm run check --workspace example-svelte`
- Manual responsive sanity check: at desktop widths the React and Svelte demos show the caret toggle when the new config is `true`; the panel collapses and re-expands; the mobile experience still triggers below 480px and stays unchanged for installs that leave the new flag off.
- `node --check cli/commands/setup.mjs` to keep the wizard parseable.
