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
  <h1>AI agent discovery for Convex apps</h1>
  <p class="lede">
    A Convex component that generates, caches, and serves <code>llms.txt</code>,
    <code>agents.md</code>, and <code>llms-full.txt</code> from your Convex backend.
    Drop the widget into your React or Svelte frontend. ETag aware. Cron scheduled.
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
    <h3>Convex component with React and Svelte widgets</h3>
    <p>
      Register the component with <code>app.use(agentReady)</code>, run <code>npx agent-ready</code>,
      and drop the widget into your frontend. Pages, endpoints, settings, and generation logic live
      inside the component boundary with isolated tables, so your app schema stays clean.
    </p>
  </div>
  <div class="callout"><strong>npm install</strong> @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool</div>
  <div class="callout"><strong>npx</strong> agent-ready</div>
  <div class="meta-row" style="display: flex; gap: 24px;">
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
    <h3>React and Svelte widgets built in</h3>
    <p>
      The floating widget reads from the same Convex status endpoint that agents hit. Toggle to
      <code>MACHINE</code> to see the files agents see, in real time.
    </p>
  </div>
  <ul class="kv-list" style="margin-top: 12px;">
    <li><span>Default theme</span><strong>dark</strong></li>
    <li><span>Position</span><strong>floating-bottom-right</strong></li>
    <li><span>Store</span><strong>createAgentReadyStatusStore()</strong></li>
  </ul>
{/if}
