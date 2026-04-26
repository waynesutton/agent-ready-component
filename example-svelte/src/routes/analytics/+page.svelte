<script lang="ts">
  import { onDestroy } from "svelte";
  import { useQuery } from "convex-svelte";
  import { api } from "../../../convex/_generated/api";
  import AuthGate from "$lib/AuthGate.svelte";

  const INTERVAL_MS = 60_000;
  let roundedNow = $state(Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS);
  const timer = setInterval(() => {
    roundedNow = Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS;
  }, INTERVAL_MS);
  onDestroy(() => clearInterval(timer));

  const summary = useQuery(api.agentReady.analytics.getSummary, () => ({ now: roundedNow }));
  const series = useQuery(api.agentReady.analytics.getTimeSeries, () => ({
    now: roundedNow,
    bucketHours: 24,
  }));

  function topPair(record: Record<string, number> | undefined) {
    const entries = Object.entries(record ?? {});
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }
</script>

<AuthGate>
  {#snippet children()}
{#if summary.data === undefined}
  <div class="hero">
    <h1>Analytics</h1>
    <p class="lede">Loading request history...</p>
  </div>
{:else if summary.data === null}
  <div class="hero">
    <h1>Analytics</h1>
    <p class="lede">
      Analytics are disabled. Set <code>analyticsEnabled: true</code> in
      <code>agent-ready.config.json</code> and run <code>npx agent-ready sync</code>.
    </p>
  </div>
{:else}
  {@const analyticsSummary = summary.data}
  {@const topAgent = topPair(analyticsSummary.byAgent)}
  {@const topFile = topPair(analyticsSummary.byFile)}
  <div class="hero">
    <h1>Analytics</h1>
    <p class="lede">
      Who&apos;s reading your discovery files? Aggregated request counts by agent and file type
      over the last 30 days.
    </p>
  </div>

  <div class="metric-grid">
    <div class="metric">
      <span class="label">Total requests</span>
      <span class="value">{analyticsSummary.totalRequests.toLocaleString()}</span>
    </div>
    <div class="metric">
      <span class="label">Top agent</span>
      <span class="value" style="font-size: 18px;">{topAgent ? `${topAgent[0]} · ${topAgent[1]}` : "—"}</span>
    </div>
    <div class="metric">
      <span class="label">Top file</span>
      <span class="value" style="font-size: 18px;">{topFile ? `${topFile[0]} · ${topFile[1]}` : "—"}</span>
    </div>
  </div>

  <h3>By agent</h3>
  <ul class="kv-list">
    {#each Object.entries(analyticsSummary.byAgent ?? {}) as [agent, count]}
      <li><span>{agent}</span><strong>{count}</strong></li>
    {/each}
  </ul>

  <h3>By file type</h3>
  <ul class="kv-list">
    {#each Object.entries(analyticsSummary.byFile ?? {}) as [file, count]}
      <li><span>{file}</span><strong>{count}</strong></li>
    {/each}
  </ul>

  {#if series.data}
    <h3>Daily buckets</h3>
    <ul class="kv-list">
      {#each series.data as point}
        <li>
          <span>{new Date(point.timestamp).toISOString().slice(0, 10)}</span>
          <strong>{point.count}</strong>
        </li>
      {/each}
    </ul>
  {/if}
{/if}
  {/snippet}
</AuthGate>
