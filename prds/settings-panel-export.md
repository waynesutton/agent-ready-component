# Settings panel export and install improvements

## Problem

When a consumer installs `@waynesutton/agent-ready` and wires up the component, there is no way to manage pages, cache, or actions without reverse-engineering the demo app. The `/settings` page only exists in `example-react/` and `example-svelte/` as local code. Consumers must:

1. Write their own Convex wrapper functions in `convex/agentReady/content.ts`
2. Build their own settings UI from scratch
3. Figure out the data flow from reading the demo source

## Proposed solution

### 1. Ship a ready-to-use `<AgentReadySettingsPanel />` React component

Export from `@waynesutton/agent-ready/react`. It is a self-contained panel that takes Convex function references as props (framework-agnostic pattern). The consumer passes their own wrapper functions so the panel works with any Convex app without coupling to a specific `api` import.

### 2. Ship copy-paste Convex wrapper functions

Add a new file consumers can reference or the CLI can scaffold: `convex/agentReady/content.ts` and `convex/agentReady/analytics.ts`. The CLI `setup` command will print instructions for adding these files. Since Convex components require app-level wrappers to expose component queries/mutations to browser clients, we ship the exact wrapper code.

### 3. Update CLI setup wizard

The existing `npx agent-ready setup` wizard already writes `agent-ready.config.json`. Extend it to also scaffold the Convex wrapper files and print integration instructions for the settings panel.

## Files to change

- `src/react/AgentReadySettingsPanel.tsx` (new): The exported settings panel component
- `src/react/index.ts`: Add the new export
- `cli/commands/setup.mjs`: Print settings integration steps, optionally scaffold wrapper files
- `README.md`: Add install command at top, settings panel docs
- `INTEGRATION.md`: Add settings panel section with wrapper code
- `SETUP.md`: Reference the new settings panel
- `package.json`: No changes needed (already exports `./react`)
- `files.md`, `task.md`, `changelog.md`: Update

## Edge cases

- Consumer may not use React (Svelte, Vue, vanilla). The wrapper functions are framework-agnostic. The React panel is opt-in. Non-React consumers use the wrapper functions + their own UI.
- Consumer may already have custom wrapper files. The CLI should not overwrite existing files.
- The panel uses Convex React hooks (`useQuery`, `useMutation`, `useAction`) from the consumer's `convex/react` peer dependency, which is already listed as optional peer.
