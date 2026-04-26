# Widget v2: center position, tab redesign, colors, icons

## Problem

The widget only supports three position modes (footer, floating bottom right, floating bottom left). The HUMAN tab shows the same file rows as MACHINE. Users want the HUMAN tab to show "Open in ChatGPT / Claude / Perplexity" links, while MACHINE keeps the raw file links with open-in-new-tab icons. There is no way to hide the status row or set custom hex colors to match a site's brand palette.

## Proposed solution

### Config additions to `agent-ready.config.json`

```json
{
  "settings": {
    "widgetPosition": "floating-center",
    "widgetStatusVisible": true,
    "widgetColors": {
      "bg": "#1a1a1a",
      "border": "#333333",
      "textActive": "#e5e5e5",
      "textInactive": "#666666",
      "tabActiveBg": "#2a2a2a",
      "accent": "#ffffff"
    }
  }
}
```

### Type changes in `src/client/types.ts`

- Add `"floating-center"` to `WidgetPosition`
- Add `WidgetColors` interface with optional hex fields
- Add `widgetStatusVisible` to `AgentReadySettings`

### Widget prop changes (React + Svelte)

- New `colors` prop accepting `Partial<WidgetColors>`
- New `showStatus` prop (defaults true, hides the status row in MACHINE tab when false)
- HUMAN tab: show app name, subtitle, file list with copy buttons, then "Open in ChatGPT / Claude / Perplexity" external links
- MACHINE tab: show file list with Phosphor-style arrow-square-out SVG icon linking to the raw file URL, plus status row (when visible)

### Position: `floating-center`

Fixed at bottom center of viewport with `left: 50%; transform: translateX(-50%)`.

### Phosphor icons

Inline SVG for the ArrowSquareOut icon from phosphoricons.com. No dependency added. Single 16x16 SVG path rendered inline.

## Files to change

- `src/client/types.ts`
- `src/react/AgentReadyWidget.tsx`
- `src/svelte/AgentReadyWidget.svelte`
- `example-react/agent-ready.config.json`
- `example-svelte/agent-ready.config.json`
- `CONTRIBUTING.md` (props table update)
- `INTEGRATION.md` (widget section update)
- `README.md` (features list)
- `docs/install.md` (widget section)
- `SETUP.md` (minor)
- `files.md`
- `changelog.md`
- `task.md`

## Edge cases

- `colors` prop is entirely optional; CSS custom properties remain the fallback
- Status row defaults visible; `showStatus: false` hides it in both MACHINE and config
- The Phosphor icon is inlined as an SVG path so zero new dependencies
