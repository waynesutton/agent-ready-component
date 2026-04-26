Created: 2026-04-26 20:18 UTC
Last Updated: 2026-04-26 20:40 UTC
Status: Done

# Docs submission readiness

## Problem

The install flow was split between `README.md`, `docs/install.md`, and `docs/install.html`. That made the next step unclear for new developers and for people reviewing the package before a Convex component submission.

The demo apps also linked to the old Markdown install guide instead of the repo README, and the resource areas did not expose the new public docs URL.

## Proposed solution

Make `README.md` the canonical install guide. Keep `docs/install.md` and `docs/install.html` as lightweight entry points that send readers back to the README install section.

Update both demo apps so:

- `Install guide` opens the repo README install section
- `Docs` opens an in-demo `/docs` route based on the README
- The docs route appears before `Resources`
- The resources page includes the in-demo docs route first, with Diffs by Pierre as a supporting docs rendering reference

## Files changed

- `README.md`
- `SETUP.md`
- `docs/install.md`
- `docs/install.html`
- `example-react/src/App.tsx`
- `example-react/src/components/Sidebar.tsx`
- `example-svelte/src/routes/+layout.svelte`
- `example-svelte/src/routes/+page.svelte`
- `example-svelte/src/routes/docs/+page.svelte`
- `example-svelte/src/routes/resources/+page.svelte`
- `example-react/src/index.css`
- `task.md`
- `changelog.md`
- `files.md`

## Edge cases

- Existing package docs still work for readers opening `docs/install.md` or `docs/install.html`.
- Demo users keep an `Install guide` link, but it points to the canonical README flow.
- The demo `Docs` link stays inside the app so it reads like product documentation instead of sending users to a third-party docs page.
- Diffs by Pierre stays available as a reference link for docs rendering.

## Verification steps

- Read the README install section for a full start-to-finish flow.
- Confirm `docs/install.md` and `docs/install.html` point to the README install section.
- Confirm React and Svelte demo links use `https://github.com/waynesutton/agent-ready-component#install` for install and `/docs` for docs.
- Run TypeScript and lint checks for touched files when dependencies are available.

## Task completion log

- 2026-04-26 20:18 UTC: Moved the install flow into `README.md`, simplified standalone install docs, updated demo links, and synced project docs.
- 2026-04-26 20:40 UTC: Corrected the demo docs link to an internal README-style docs page in both React and Svelte. Kept Diffs by Pierre as a supporting reference link.
