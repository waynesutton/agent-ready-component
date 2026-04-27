---
name: Widget Mobile Toggle
overview: Add a mobile-friendly collapsed mode to the AgentReady widget while preserving current React and Svelte behavior, endpoint polling, tab visibility props, and config-driven settings.
todos:
  - id: prd
    content: Create `prds/widget-mobile-collapse.md` with requirements, root cause, solution, edge cases, and verification.
    status: completed
  - id: task-track
    content: Add widget mobile collapse tasks to `task.md` under `## To do`.
    status: completed
  - id: react-widget
    content: Implement responsive collapsed mobile state and inline Phosphor caret toggle in the React widget.
    status: completed
  - id: svelte-widget
    content: Mirror responsive collapsed mobile state and toggle behavior in the Svelte widget.
    status: completed
  - id: docs
    content: Update demo apps and docs only if the implementation adds public props, new usage guidance, or file descriptions that changed.
    status: completed
  - id: verify
    content: Run typecheck, build, and manual responsive checks for React and Svelte examples.
    status: completed
isProject: false
---

# Widget Mobile Toggle Plan

## Best Approach

Use a component-level responsive collapse layer around the existing tab and panel UI. Keep HUMAN, MACHINE, and optional SCORE as the same internal tabs, but render a compact mobile header when the viewport is small. This keeps all existing data fetching, URLs, copy buttons, stale state, readiness polling, and config-driven visibility working.

I would avoid adding `@phosphor-icons/react` or a Svelte icon dependency right now. The widget already uses inline Phosphor SVG paths, so the smallest and safest path is to add inline Phosphor caret icons from [Phosphor Icons](https://phosphoricons.com/) for expand and collapse. That avoids a new peer dependency and keeps the package bundle simple.

## Files To Change

- [`prds/widget-mobile-collapse.md`](prds/widget-mobile-collapse.md): Add the required PRD before implementation with problem, solution, edge cases, files, and verification.
- [`task.md`](task.md): Add implementation tasks under `## To do`, then move them to `## Completed` after verification.
- [`src/react/AgentReadyWidget.tsx`](src/react/AgentReadyWidget.tsx): Add mobile viewport detection, collapsed state, compact header, caret icon, and mobile-safe sizing.
- [`src/svelte/AgentReadyWidget.svelte`](src/svelte/AgentReadyWidget.svelte): Add the same behavior for Svelte parity.
- [`src/client/types.ts`](src/client/types.ts): Add exported widget behavior types only if we choose public props.
- [`example-react/src/App.tsx`](example-react/src/App.tsx) and [`example-svelte/src/routes/+layout.svelte`](example-svelte/src/routes/+layout.svelte): Update only if the new mobile props should be demonstrated in the demo apps. If defaults cover the feature with no setup, leave demo code alone and verify it visually instead.
- [`README.md`](README.md), [`INTEGRATION.md`](INTEGRATION.md), [`files.md`](files.md), and [`changelog.md`](changelog.md): Update only when needed. `changelog.md` should be updated for the shipped widget behavior. `files.md` should be updated only if new files are added or existing file descriptions change. `README.md` and `INTEGRATION.md` should be updated only if the final API includes public props or user-facing setup guidance.

## Behavior Design

- Desktop stays unchanged by default.
- Mobile activates at a small viewport breakpoint, likely `480px`.
- On mobile, the widget starts collapsed by default.
- Collapsed mobile state shows a compact bar with visible tab labels, usually `HUMAN` and `MACHINE`, plus a Phosphor caret toggle.
- Tapping `HUMAN` or `MACHINE` switches the active tab without forcing the whole widget open.
- Tapping the caret expands the full current panel.
- If `SCORE` is enabled, keep it available when expanded, but do not crowd the collapsed mobile bar unless the user explicitly wants all visible tabs shown.
- If only one tab is visible, the collapsed bar should show that tab label and the toggle. If no tabs are visible, the widget still returns `null` as it does today.

## Proposed Public API

Use optional props so existing installs do not change:

```ts
mobileCollapse?: boolean;
mobileBreakpoint?: number;
defaultMobileCollapsed?: boolean;
```

Recommended defaults:

- `mobileCollapse = true`
- `mobileBreakpoint = 480`
- `defaultMobileCollapsed = true`

This gives app developers a real mobile view option while keeping the default behavior aligned with your request.

## Implementation Notes

- React: derive `isMobile` with `window.matchMedia`, then initialize collapsed state from `defaultMobileCollapsed` only on mobile.
- Svelte: mirror the same `matchMedia` listener and cleanup with `onDestroy`.
- Use `aria-expanded`, `aria-controls`, and an accessible button label for the expand/collapse toggle.
- Replace fixed `width: 280` with `width: min(280px, calc(100vw - 24px))` behavior on mobile. For floating left/right positions, reduce the edge inset so the widget cannot overflow narrow screens.
- Keep current hooks and stores untouched. This is presentation state only.
- Treat demo and docs updates as conditional follow-up work: check whether the final implementation changes public usage, then update only the minimum required docs or examples.

## Verification

- Run `npm run typecheck`.
- Run `npm run build`.
- Manually verify React and Svelte examples at desktop width and mobile width.
- Confirm collapsed mobile state still allows switching HUMAN and MACHINE.
- Confirm expanded state preserves copy buttons, external links, MACHINE file links, stale banner, and SCORE polling when enabled.
- Run lints on edited files through Cursor diagnostics.
- If demo apps are not edited, still verify their existing widget usage picks up the new default mobile behavior.

## Edge Cases

- All tabs disabled: widget remains hidden.
- One tab visible: compact mobile bar still works without fake tabs.
- SCORE enabled: expanded view can access SCORE without crowding the collapsed mobile bar.
- `footer` position: should resize responsively but not use fixed mobile insets.
- SSR or prerendered Svelte: guard all `window` access.
- Touch targets: toggle and labels should stay at least 40px tall for mobile use.
