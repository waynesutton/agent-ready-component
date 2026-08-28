<script lang="ts">
  // Tiny dependency-free footer nav advertising the agent discovery files.
  // Renders two visible anchors (llms.txt and the per-site markdown file).
  // Muted styling by default, override via the class prop. Also injects the
  // HTML alternate <link> into document.head (deduped, shared with the widget).
  import { onMount } from "svelte";
  import { injectMarkdownAlternateLink } from "../client/headInjection.js";

  export let llmsTxtPath: string = "/llms.txt";
  export let siteMdPath: string = "/site.md";
  export let injectHeadLink: boolean = true;
  let className: string | undefined = undefined;
  export { className as class };

  $: siteMdLabel = siteMdPath.replace(/^\//, "");

  onMount(() => {
    if (!injectHeadLink) return;
    injectMarkdownAlternateLink(siteMdPath);
  });
</script>

<nav aria-label="AI agent resources" class={className ?? "agent-links"} class:styled={className === undefined}>
  <a href={llmsTxtPath} rel="describedby">llms.txt</a>
  <a href={siteMdPath} rel="alternate" type="text/markdown">{siteMdLabel}</a>
</nav>

<style>
  nav.styled {
    display: flex;
    gap: 12px;
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
  }
  nav.styled a {
    color: #888888;
    text-decoration: none;
  }
</style>
