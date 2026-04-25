<script lang="ts">
  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
  const installGuideUrl =
    "https://github.com/waynesutton/agent-ready-component/blob/main/docs/install.md";
  const installHtmlUrl =
    "https://htmlpreview.github.io/?https://github.com/waynesutton/agent-ready-component/blob/main/docs/install.html";

  let tab = $state("usage");
  const tabs = [
    { id: "usage", label: "Usage" },
    { id: "pipeline", label: "Generation pipeline" },
    { id: "files", label: "Live files" },
    { id: "widget", label: "Widget" },
  ];

  const steps = [
    { label: "Seed pages + endpoints", detail: "From config or the settings panel" },
    { label: "Render files", detail: "llms.txt, agents.md, llms-full.txt" },
    { label: "Hash + cache", detail: "SHA-256 ETag written to cachedFiles" },
    { label: "Serve + track", detail: "HTTP handlers + optional analytics" },
  ];

  const files = [
    { path: "/llms.txt", desc: "Short, LLM-friendly summary + curated links" },
    { path: "/agents.md", desc: "API contract and agent instructions" },
    { path: "/llms-full.txt", desc: "Long-form docs bundled for context windows" },
    { path: "/llms-status", desc: "JSON status endpoint for the widget" },
  ];
</script>

<div class="hero">
  <h1>The standard discovery layer for AI agents</h1>
  <p class="lede">
    Generate, cache, and serve <code>llms.txt</code>, <code>agents.md</code>, and
    <code>llms-full.txt</code> straight from your Convex deployment. ETag aware.
    Cron scheduled. Widget included.
  </p>

  <div class="cta-row">
    <button class="btn btn-primary" onclick={() => (tab = "files")}>View live files</button>
    <button class="btn btn-ghost" onclick={() => (tab = "pipeline")}>How it works</button>
  </div>

  <div class="meta-row">
    <a href="https://llmstxt.org" target="_blank" rel="noreferrer">Why llms.txt</a>
    <span>Powered by @convex-dev/crons + @convex-dev/workpool</span>
  </div>
</div>

<div class="tabs" role="tablist">
  {#each tabs as t}
    <button
      class="tab {tab === t.id ? 'active' : ''}"
      role="tab"
      aria-selected={tab === t.id}
      onclick={() => (tab = t.id)}
    >
      {t.label}
    </button>
  {/each}
</div>

{#if tab === "usage"}
  <div class="feature-card">
    <h3>Drop-in Convex component</h3>
    <p>
      Install, run <code>npx agent-ready</code>, and the component takes over from there.
      Pages, endpoints, settings, and generation logic live inside the component so your app
      stays clean.
    </p>
  </div>
  <div class="callout"><strong>npm install</strong> @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool</div>
  <div class="callout"><strong>npx</strong> agent-ready</div>
  <div class="meta-row">
    <a href={installGuideUrl} target="_blank" rel="noreferrer">Read the Markdown install guide</a>
    <a href={installHtmlUrl} target="_blank" rel="noreferrer">Open the HTML install guide</a>
  </div>
{/if}

{#if tab === "pipeline"}
  <ul class="kv-list">
    {#each steps as step, i}
      <li>
        <span><strong>{String(i + 1).padStart(2, "0")}</strong>&nbsp;&nbsp;{step.label}</span>
        <span style="color: var(--muted); font-weight: 400;">{step.detail}</span>
      </li>
    {/each}
  </ul>
{/if}

{#if tab === "files"}
  <div class="file-grid">
    {#each files as file}
      <a class="file-tile" href={`${appUrl}${file.path}`} target="_blank" rel="noreferrer">
        <span class="file-name">{file.path}</span>
        <span class="file-desc">{file.desc}</span>
      </a>
    {/each}
  </div>
{/if}

{#if tab === "widget"}
  <div class="feature-card">
    <h3>HUMAN vs MACHINE, in one corner</h3>
    <p>
      The floating widget uses the exact same live status endpoint that agents hit. Toggle to
      <code>MACHINE</code> to watch the files update in real time.
    </p>
  </div>
  <ul class="kv-list" style="margin-top: 12px;">
    <li><span>Default theme</span><strong>dark</strong></li>
    <li><span>Position</span><strong>floating-bottom-right</strong></li>
    <li><span>Store</span><strong>createAgentReadyStatusStore()</strong></li>
  </ul>
{/if}
