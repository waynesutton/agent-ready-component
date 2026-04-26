<script lang="ts">
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "../../../convex/_generated/api";
  import AuthGate from "$lib/AuthGate.svelte";

  const client = useConvexClient();
  const status = useQuery(api.agentReady.content.getCacheStatus, {});
  const pages = useQuery(api.agentReady.content.listPages, { includeAllStatuses: true });

  let busy = $state(false);
  let tab = $state("pages");
  const tabs = [
    { id: "pages", label: "Pages" },
    { id: "cache", label: "Cache" },
    { id: "actions", label: "Actions" },
  ];

  async function regenerate() {
    busy = true;
    try {
      await client.action(api.agentReady.content.regenerateAll, {});
    } finally {
      busy = false;
    }
  }

  async function rollback(fileType: string) {
    await client.mutation(api.agentReady.content.rollbackCache, { fileType });
  }

  async function publish(path: string) { await client.mutation(api.agentReady.content.publishPage, { path }); }
  async function draft(path: string) { await client.mutation(api.agentReady.content.draftPage, { path }); }
  async function archive(path: string) { await client.mutation(api.agentReady.content.archivePage, { path }); }
</script>

<AuthGate>
  {#snippet children()}
<div class="hero">
  <h1>Settings</h1>
  <p class="lede">
    Control publish state, regenerate files, roll back to previous cache versions, and watch the
    live status stream.
  </p>
</div>

<div class="tabs" role="tablist">
  {#each tabs as t}
    <button
      class="tab {tab === t.id ? 'active' : ''}"
      role="tab"
      aria-selected={tab === t.id}
      onclick={() => (tab = t.id)}
    >{t.label}</button>
  {/each}
</div>

{#if tab === "pages"}
  <h3>Pages</h3>
  {#if $pages}
    <table class="pages-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Path</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each $pages as page}
          <tr>
            <td style="font-weight: 600;">{page.title}</td>
            <td><code>{page.path}</code></td>
            <td><span class="pill {page.status}">{page.status}</span></td>
            <td class="actions">
              <button onclick={() => publish(page.path)}>Publish</button>
              <button onclick={() => draft(page.path)}>Draft</button>
              <button onclick={() => archive(page.path)}>Archive</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{/if}

{#if tab === "cache"}
  <h3>Live status</h3>
  {#if $status}
    <pre class="status-block">{JSON.stringify($status, null, 2)}</pre>
  {:else}
    <p style="color: var(--muted);">Loading status...</p>
  {/if}
{/if}

{#if tab === "actions"}
  <div class="settings-row">
    <button class="btn btn-primary" onclick={regenerate} disabled={busy}>
      {busy ? "Regenerating..." : "Regenerate all files"}
    </button>
    <button class="btn btn-ghost" onclick={() => rollback("llms.txt")} disabled={busy}>Rollback llms.txt</button>
    <button class="btn btn-ghost" onclick={() => rollback("agents.md")} disabled={busy}>Rollback agents.md</button>
    <button class="btn btn-ghost" onclick={() => rollback("llms-full.txt")} disabled={busy}>Rollback llms-full.txt</button>
  </div>
  <div class="callout">
    <strong>Tip:</strong> Rollback swaps the active cache entry. The next sync or cron run
    replaces it again.
  </div>
{/if}
  {/snippet}
</AuthGate>
