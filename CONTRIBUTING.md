# Contributing

`@waynesutton/agent-ready` is a Convex component that ships with React and Svelte widgets. This guide covers local development, the widget contract for community ports, and publishing.

## Local development

```bash
git clone https://github.com/waynesutton/agent-ready-component
cd llms-txt
npm install
npm run build
```

To iterate on the component against a demo app:

```bash
cd example-react
npm run dev
```

The demo links against the local `src/` via the workspace setup.

## Widget contract

The Convex component ships with React and Svelte widgets out of the box. Community widgets for other frameworks (Vue, Solid, Angular, anything else) should match the public API the core widgets expose. Contributors publish widgets as separate packages without coordination from the core team.

### Props interface

| Prop | Type | Default | Notes |
|---|---|---|---|
| `appUrl` | `string` | required | Base URL of the Convex deployment, no trailing slash |
| `position` | `"footer" \| "floating-bottom-right" \| "floating-bottom-left" \| "floating-center"` | `"floating-bottom-right"` | Layout mode |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | Color theme |
| `showTestModeBadge` | `boolean` | `true` | Display the `testMode` badge when active |
| `showStatus` | `boolean` | config value | Show the status row in MACHINE tab. When omitted, reads `widgetStatusVisible` from config via `/llms-status` |
| `showFiles` | `boolean` | config value | Show the file copy rows in HUMAN tab |
| `showAppName` | `boolean` | config value | Show the app name heading in HUMAN tab |
| `showDescription` | `boolean` | config value | Show the description line in HUMAN tab |
| `showMeta` | `boolean` | config value | Show generation timestamp and progress in MACHINE tab |
| `colors` | `Partial<WidgetColors>` | `{}` | Custom hex colors to match your site palette |

All `show*` props resolve as: explicit prop > config value from `/llms-status` > `true`.

### `useAgentReadyStatus()` shape

```ts
type AgentReadyStatus = {
  testMode: boolean;
  appName: string | null;
  appUrl: string | null;
  lastGeneratedAt: number | null;
  generatedFromVersion: string | null;
  generationInProgress: boolean;
  hasDrafts: boolean;
  fullTxtEnabled: boolean;
  widgetStatusVisible: boolean;
  widgetShowFiles: boolean;
  widgetShowAppName: boolean;
  widgetShowDescription: boolean;
  widgetShowMeta: boolean;
};
```

A widget must subscribe to this status in a framework-idiomatic way (hook, store, signal, composable) and re-render on change.

### WidgetColors type

```ts
type WidgetColors = {
  bg?: string;       // widget background (default #1a1a1a)
  border?: string;   // panel border (default #333333)
  textActive?: string;   // active text (default #e5e5e5)
  textInactive?: string; // inactive text (default #666666)
  tabActiveBg?: string;  // active tab background (default #2a2a2a)
  accent?: string;       // link and file name color (default #ffffff)
};
```

### CSS custom properties

Every widget must expose the same custom properties so consumers can theme without forking. When a `colors` prop is provided, the widget sets these properties inline so they override any external stylesheet:

```css
--agent-ready-bg
--agent-ready-panel-border
--agent-ready-text-active
--agent-ready-text-inactive
--agent-ready-tab-active-bg
--agent-ready-accent
--agent-ready-font
--agent-ready-radius
```

### `testMode` badge pattern

When `status.testMode === true`, render a badge that:
- Is visually distinct from the rest of the widget (accent color, border)
- Links to the "going to production" section of `INTEGRATION.md`
- Is announced to screen readers via an `aria-live` region

### Staleness detection

When `status.generatedFromVersion` changes while the panel is open, render a "Content updated — refresh" prompt. This mirrors the `@convex-dev/static-hosting` `UpdateBanner` behavior.

## `registerRoutes` extension points

Widget authors do not need to touch `registerRoutes`. Host app developers can override behavior at three layers:

1. Per-route handler via `options.routes["<route>"]`
2. Catch-all via `options.onEvent`
3. Event callbacks via `options.onGenerationComplete`, `options.onAnalyticsThreshold`

## Publishing

Submit widget packages to the Convex components directory with:
- `INTEGRATION.md` describing installation, wiring, and troubleshooting
- Matching API to this contract
- Link to a live demo hosted on `@convex-dev/static-hosting`
