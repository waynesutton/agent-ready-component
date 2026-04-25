<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";
  import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";

  const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
  let { children } = $props();

  const primary = [
    { to: "/", label: "home.mdx", glyph: "#" },
    { to: "/settings", label: "settings.mdx", glyph: "=" },
    { to: "/analytics", label: "analytics.mdx", glyph: "~" },
  ];

  const external = [
    { href: "/llms.txt", label: "llms.txt" },
    { href: "/agents.md", label: "agents.md" },
    { href: "/llms-full.txt", label: "llms-full.txt" },
    { href: "/llms-status", label: "llms-status" },
  ];

  const filenameByPath: Record<string, string> = {
    "/": "home.mdx",
    "/settings": "settings.mdx",
    "/analytics": "analytics.mdx",
  };

  let filename = $derived(filenameByPath[$page.url.pathname] ?? "home.mdx");
</script>

<div class="page">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark"></span>
      <span>@waynesutton/agent-ready</span>
    </div>
    <nav class="topbar-links">
      <a href="https://llmstxt.org" target="_blank" rel="noreferrer">llms.txt spec</a>
      <a href="https://agents.md" target="_blank" rel="noreferrer">agents.md</a>
      <a href="https://www.convex.dev/components/static-hosting" target="_blank" rel="noreferrer">static hosting</a>
      <a href="https://github.com/waynesutton/agent-ready-component" target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  </header>

  <div class="window">
    <div class="window-titlebar">
      <div class="window-dots">
        <span class="window-dot red"></span>
        <span class="window-dot yellow"></span>
        <span class="window-dot green"></span>
      </div>
      <div class="window-title">{filename}</div>
      <div class="window-toolbar">auto-sync</div>
    </div>

    <div class="window-body">
      <aside class="sidebar">
        <div class="sidebar-section">Project</div>
        {#each primary as item}
          <a
            href={item.to}
            class="sidebar-item {$page.url.pathname === item.to ? 'active' : ''}"
          >
            <span class="sidebar-icon">{item.glyph}</span>
            <span>{item.label}</span>
          </a>
        {/each}

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">Live files</div>
        {#each external as item}
          <a class="sidebar-item" href={`${appUrl}${item.href}`} target="_blank" rel="noreferrer">
            <span class="sidebar-icon">&gt;</span>
            <span>{item.label}</span>
          </a>
        {/each}
      </aside>

      <main class="content">{@render children()}</main>
    </div>
  </div>

  <div class="page-footer">
    <span>Hosted on Convex. Served from the same deployment as your app.</span>
    <a href="https://docs.convex.dev/llms.txt" target="_blank" rel="noreferrer">docs.convex.dev/llms.txt</a>
  </div>

  <AgentReadyWidget {appUrl} position="floating-bottom-right" theme="dark" />
</div>
