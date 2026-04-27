---
Created: 2026-04-27 05:11 UTC
Last Updated: 2026-04-27 05:11 UTC
Status: In Progress
---

# Widget mobile collapse

## Problem

The `AgentReadyWidget` is a fixed 280px floating card with a HUMAN, MACHINE, and optional SCORE tab strip. On phones the card overflows safe-area insets and the tab buttons each carry a `min-width: 100px`, so a three-tab row needs ~300px while the card is 280px. There is no expand or collapse affordance on small screens, so the widget always covers screen real estate. The user wants:

- A mobile view option.
- A toggle to expand and collapse, using a Phosphor icon.
- Collapsed by default on mobile, showing only HUMAN and MACHINE in a compact row.

## Root cause

The widget was designed for desktop floating placement. The CSS was inline with no responsive breakpoints, no collapsed presentation state, and no toggle control. Both the React and Svelte implementations duplicate the same layout, so any mobile fix needs parity in two places.

## Proposed solution

Add a presentation-only collapse layer around the existing tab and panel UI, keeping all data hooks and config-driven visibility untouched.

Public props (all optional, defaults preserve current behavior):

- `mobileCollapse?: boolean` default `true`. Enables the mobile collapsed treatment.
- `mobileBreakpoint?: number` default `480`. Pixel width below which the widget runs in mobile mode.
- `defaultMobileCollapsed?: boolean` default `true`. Controls the initial collapsed state on mobile.

Behavior:

- Desktop: unchanged. The widget renders the existing tab strip + active panel.
- Mobile (viewport < breakpoint and `mobileCollapse !== false`): widget renders a compact 1-row header containing visible tab labels (HUMAN, MACHINE, and optionally SCORE) plus a Phosphor caret toggle. Tapping a tab label switches the active tab without forcing the whole widget open. Tapping the caret expands or collapses the active panel below the header.
- When collapsed, only the tab strip + caret toggle are visible. When expanded, the tab strip stays visible and the active panel renders below it.
- The widget retains its `position` styles (footer, floating-bottom-right, floating-bottom-left, floating-center). On mobile, the card width becomes `min(280px, calc(100vw - 24px))` so it never overflows narrow screens.
- The toggle uses inline Phosphor `CaretDown` (collapsed) and `CaretUp` (expanded) SVG paths to avoid adding a new dependency. Same pattern as the existing inline `ArrowSquareOut` icon.

## Files to change

- `src/react/AgentReadyWidget.tsx` — viewport detection, collapsed state, compact mobile header, caret toggle, mobile-safe sizing, new prop types.
- `src/svelte/AgentReadyWidget.svelte` — Svelte parity using `matchMedia` and reactive state.
- `src/client/types.ts` — no changes unless we surface a shared mobile config type. Current plan keeps the props local to the widget component.
- `task.md`, `changelog.md` — sync after implementation. `files.md` only if descriptions change.
- `README.md`, `INTEGRATION.md` — only if the public API or usage guidance changes. The new props are optional so existing installs continue to work without code changes.
- `example-react/src/App.tsx`, `example-svelte/src/routes/+layout.svelte` — only if we want to demonstrate the new props. With sensible defaults, no demo code changes are required.

## Implementation notes

- React: `useEffect` + `window.matchMedia(`(max-width: ${breakpoint}px)`)` to track `isMobile`. Initialize `collapsed` from `defaultMobileCollapsed` only when first becoming mobile.
- Svelte: same approach with `onMount` and an `onDestroy` cleanup for the listener.
- Toggle button uses `aria-expanded`, `aria-controls`, and a clear `aria-label` like "Expand widget" / "Collapse widget".
- Compact header is just a wrapper around the existing `TabButton` row + a 40x40 toggle button, so existing styles mostly carry over.
- Width override: when mobile, swap `width: 280` for `width: "min(280px, calc(100vw - 24px))"` and reduce edge insets on `floating-bottom-right` / `floating-bottom-left` from 24px to 12px.
- Keep `useAgentReadyStatus` and `useAgentReadyReadiness` exactly as they are. No new fetches.

## Edge cases

- All tabs disabled: widget still returns `null` (existing behavior preserved).
- Only one visible tab: collapsed mobile bar shows the single label + caret.
- SCORE enabled: visible in the mobile tab bar; expanded view shows the readiness panel as today.
- `position: footer`: do not apply mobile fixed insets; only width clamp applies.
- SSR / Svelte prerender: guard all `window` and `matchMedia` access. Default to desktop behavior on the server.
- Accessibility: caret toggle and tab buttons stay at least 40px tall, retain visible focus ring via existing button styles.
- Backwards compatibility: all new props are optional. Apps that pass `mobileCollapse={false}` get the previous always-expanded behavior.

## Verification steps

- `npm run typecheck`
- `npm run build`
- Open the React example at desktop and at < 480px width, confirm collapsed default, tab switching, expand/collapse, copy buttons, external chat links, MACHINE file rows, SCORE polling when enabled.
- Repeat for the Svelte example.
- Confirm `aria-expanded` flips correctly with the toggle.
- Confirm widget still hides when all tabs are disabled.

## Task completion log

- 2026-04-27 05:11 UTC — PRD drafted.
