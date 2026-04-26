# Widget display modes

## Problem

The widget currently shows all tabs (HUMAN, MACHINE, optionally SCORE) and always renders the "Open in ChatGPT / Claude / Perplexity" links. Consumers need granular control over what the widget displays without writing custom code.

## Proposed solution

Add new boolean settings to `agent-ready.config.json` and the component schema:

| Setting | Default | Effect |
|---|---|---|
| `widgetCleanMode` | `false` | When true, only show tabs (HUMAN / MACHINE / SCORE) with their content, no chrome around them. All features still work. |
| `widgetShowHumanTab` | `true` | When false, hide the HUMAN tab entirely. |
| `widgetShowMachineTab` | `true` | When false, hide the MACHINE tab entirely. |
| `widgetShowChatLinks` | `true` | When false, hide all three AI chat links on the HUMAN tab. |
| `widgetShowChatGPT` | `true` | When false, hide only the ChatGPT link. |
| `widgetShowClaude` | `true` | When false, hide only the Claude link. |
| `widgetShowPerplexity` | `true` | When false, hide only the Perplexity link. |

When only one tab is visible, the tab strip still renders so the label is shown, but the user cannot toggle away from it.

## Files to change

1. `src/component/schema.ts` - add 7 fields to settings table
2. `src/component/validators.ts` - add to settingsPatchValidator + settingsDocValidator
3. `src/component/content.ts` - expose in getCacheStatus, handle in upsertSettings
4. `src/component/contentInternal.ts` - handle in applySyncConfig insert
5. `src/client/types.ts` - add to AgentReadySettings + AgentReadyStatus
6. `src/react/AgentReadyWidget.tsx` - add props, conditional rendering
7. `src/svelte/AgentReadyWidget.svelte` - add props, conditional rendering
8. `example-react/agent-ready.config.json` - add new settings
9. `example-svelte/agent-ready.config.json` - add new settings
10. `example-react/src/App.tsx` - pass new props (if needed)
11. `example-svelte/src/routes/+layout.svelte` - pass new props (if needed)
12. `README.md` - document new options
13. `changelog.md` - add entry
14. `task.md` - track completion

## Edge cases

- If both `widgetShowHumanTab` and `widgetShowMachineTab` are false and SCORE is also hidden, the widget renders nothing (hidden entirely).
- `widgetCleanMode` only strips description text and app name by default; tabs and links remain unless explicitly hidden.
- Individual chat link toggles are only relevant when `widgetShowChatLinks` is true.
