<script lang="ts">
  import { onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { useQuery } from "convex-svelte";
  import { api } from "../../../convex/_generated/api";

  const INTERVAL_MS = 60_000;
  const roundedNow = writable(Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS);
  const timer = setInterval(() => {
    roundedNow.set(Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS);
  }, INTERVAL_MS);
  onDestroy(() => clearInterval(timer));

  $: summary = useQuery(api.agentReady.analytics.getSummary, { now: $roundedNow });
  $: series = useQuery(api.agentReady.analytics.getTimeSeries, { now: $roundedNow, bucketHours: 24 });

  function topPair(record: Record<string, number> | undefined) {
    const entries = Object.entries(record ?? {});
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }
</script>

{#if $summary === undefined}
  <div class="hero">
    <h1>Analytics</h1>
    <p class="lede">Loading request history...</p>
  </div>
{:else if $summary === null}
  <div class="hero">
    <h1>Analytics</h1>
    <p class="lede">
      Analytics are disabled. Set <code>analyticsEnabled: true</code> in
      <code>agent-ready.config.json</code> and run <code>npx agent-ready sync</code>.
    </p>
  </div>
{:else}
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
      <span class="value">{$summary.totalRequests.toLocaleString()}</span>
    </div>
    <div class="metric">
      <span class="label">Top agent</span>
      {@const ta = topPair($summary.byAgent)}
      <span class="value" style="font-size: 18px;">{ta ? `${ta[0]} · ${ta[1]}` : "—"}</span>
    </div>
    <div class="metric">
      <span class="label">Top file</span>
      {@const tf = topPair($summary.byFile)}
      <span class="value" style="font-size: 18px;">{tf ? `${tf[0]} · ${tf[1]}` : "—"}</span>
    </div>
  </div>

  <h3>By agent</h3>
  <ul class="kv-list">
    {#each Object.entries($summary.byAgent ?? {}) as [agent, count]}
      <li><span>{agent}</span><strong>{count}</strong></li>
    {/each}
  </ul>

  <h3>By file type</h3>
  <ul class="kv-list">
    {#each Object.entries($summary.byFile ?? {}) as [file, count]}
      <li><span>{file}</span><strong>{count}</strong></li>
    {/each}
  </ul>

  {#if $series}
    <h3>Daily buckets</h3>
    <ul class="kv-list">
      {#each $series as point}
        <li>
          <span>{new Date(point.timestamp).toISOString().slice(0, 10)}</span>
          <strong>{point.count}</strong>
        </li>
      {/each}
    </ul>
  {/if}
{/if}
