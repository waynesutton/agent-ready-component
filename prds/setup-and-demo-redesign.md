# Setup guide + demo app redesign

## Problem

Two gaps before this repo is shareable:

1. No step-by-step guide that walks a new developer from zero to "component installed, published to npm, pushed to GitHub, both demo apps live on Convex static hosting, refresh-reload verified." The scaffold has `README.md`, `INTEGRATION.md`, and `CONTRIBUTING.md`, but none of them is a linear setup checklist.
2. Both demo apps ship with a generic dark-mode layout. They should use a warm cream aesthetic: cream background, window-chrome framing, editorial typography, orange CTAs, tab navigation with active underline, sidebar of file-style links. That pairs well with the terminal-styled LlmsTxt widget sitting in the corner.

## Proposed solution

### 1. Add `SETUP.md` at repo root

A single linear guide. Each section is copy-pasteable, each command is explicit, each verification step states what the developer should see.

Sections:

- Prerequisites (Node 20, Bun optional, Convex account)
- Install component dependencies locally
- Wire component into your host app
- Run the setup wizard
- Verify locally (testMode, widget, file URLs)
- Publish to GitHub (first commit, create repo via gh, push)
- Publish to npm (version, tag, dry-run, publish)
- Deploy the React demo (Convex + static hosting)
- Deploy the Svelte demo (Convex + static hosting)
- Test the refresh flow (UpdateBanner)
- Flip `testMode` off with `npx llms-txt go-live`
- Rollback + regenerate troubleshooting

Reference: https://llmstxt.org, https://docs.convex.dev/llms.txt, https://agents.md, https://www.convex.dev/components/static-hosting, https://docs.convex.dev/components/authoring, https://docs.convex.dev/components/using, https://docs.convex.dev/components/understanding

### 2. Redesign of both demo apps

#### Color system

| Token | Value | Role |
|---|---|---|
| `--bg` | `#eeefe9` | Page background, warm neutral cream |
| `--surface` | `#ffffff` | Window body background |
| `--surface-alt` | `#f7f3ec` | Sidebar + code block background |
| `--border` | `#151515` | Hard black borders for window chrome |
| `--border-soft` | `#d8d3c4` | Subtle panel borders |
| `--text` | `#151515` | Primary text |
| `--muted` | `#5f5f5f` | Secondary copy |
| `--accent` | `#f54e00` | Orange accent, used for CTAs and active tab underline |
| `--accent-hover` | `#db4500` | Hover state |
| `--accent-soft` | `#fff3e9` | Light orange background for highlighted panels |

#### Layout pattern

- Full-width cream background
- Centered "app window": white body with 1px black border, small colored circles in the top-left corner (window controls), file-name label centered in title bar (`home.mdx` on overview, `settings.mdx`, `analytics.mdx`)
- Left sidebar inside the window with file-style nav items (icon + name)
- Main content area with hero block, CTA pair, then a horizontal tab strip
- Tabs use an active orange underline and bolder weight for the active tab
- Sticky mini-footer with build info + link pair
- The `LlmsTxtWidget` continues to live floating bottom right; its dark terminal look pops against the cream

#### Typography

- Display + body: system sans (`"Inter", "SF Pro Text", system-ui`)
- Mono: `"Courier New", Courier, monospace` (matches the widget)
- H1 tight tracking `-0.025em`, large size
- Subheader lighter gray
- Small caps for file-tab labels

#### Components

- `<Window>` wrapper handles title bar + body grid
- `<Sidebar>` renders the file-style nav
- `<TabGroup>` renders the active-underline tabs
- `<Button variant="primary" | "ghost">` handles orange CTA + secondary

The React demo reuses these as shared components. The Svelte demo mirrors the layout inline in each route.

## Files to change

### Create

- `prds/setup-and-demo-redesign.md` (this file)
- `SETUP.md` (repo root step-by-step guide)
- `example-react/src/components/Window.tsx`
- `example-react/src/components/Sidebar.tsx`
- `example-react/src/components/Tabs.tsx`
- `example-react/src/components/Button.tsx`

### Edit

- `example-react/src/App.tsx` — wrap routes in window chrome, add tabs and CTAs
- `example-react/src/Settings.tsx` — render inside window, cream look
- `example-react/src/Analytics.tsx` — same
- `example-react/src/index.css` — new token palette + layout utilities
- `example-react/index.html` — page background color baked in
- `example-svelte/src/routes/+layout.svelte` — window chrome + sidebar
- `example-svelte/src/routes/+page.svelte` — match React overview
- `example-svelte/src/routes/settings/+page.svelte` — match React settings
- `example-svelte/src/routes/analytics/+page.svelte` — match React analytics
- `example-svelte/src/app.css` — cream token palette
- `example-svelte/src/app.html` — bg color
- `README.md` — add "See SETUP.md" line
- `task.md` — new tasks + move completed
- `changelog.md` — new Added entries
- `files.md` — new file entries

## Edge cases

- Widget stays dark — don't accidentally theme it to match (it's designed to be a visual pop against the page)
- Tabs are client-rendered; route transitions must preserve the active-tab underline
- SvelteKit doesn't have shared "client components" — the window chrome lives in `+layout.svelte` and each route fills the body slot
- Orange accent should not be used on text links inside body copy, only on CTAs and active-tab underlines
- Don't use emoji or em dashes per the write rule
- Don't touch anything under `src/component/`, `src/client/`, or `src/react/` except CSS if needed — the component itself stays as-is
