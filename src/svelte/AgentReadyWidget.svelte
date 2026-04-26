<script lang="ts">
  import { onDestroy } from "svelte";
  import { createAgentReadyStatusStore } from "./store.js";
  import type { AgentReadyStatus, WidgetColors, WidgetPosition, WidgetTheme } from "../client/types.js";

  export let appUrl: string;
  export let position: WidgetPosition = "floating-bottom-right";
  export let theme: WidgetTheme = "system";
  export let showTestModeBadge: boolean = true;
  export let showStatus: boolean = true;
  export let colors: Partial<WidgetColors> = {};
  export let llmsTxtPath: string = "/llms.txt";
  export let agentsMdPath: string = "/agents.md";
  export let fullTxtPath: string = "/llms-full.txt";
  export let statusPath: string = "/llms-status";

  type Tab = "HUMAN" | "MACHINE";
  let tab: Tab = "HUMAN";

  const status = createAgentReadyStatusStore({ appUrl, statusPath });
  let currentStatus: AgentReadyStatus | null = null;
  let initialVersion: string | null = null;
  let isStale = false;

  const unsubscribe = status.subscribe((value) => {
    currentStatus = value;
    if (value?.generatedFromVersion && initialVersion === null) {
      initialVersion = value.generatedFromVersion;
    }
    isStale =
      !!value?.generatedFromVersion &&
      !!initialVersion &&
      value.generatedFromVersion !== initialVersion;
  });

  onDestroy(() => unsubscribe());

  $: base = appUrl.replace(/\/$/, "");
  $: urls = {
    llmsTxt: `${base}${llmsTxtPath}`,
    agentsMd: `${base}${agentsMdPath}`,
    fullTxt: `${base}${fullTxtPath}`,
    status: `${base}${statusPath}`,
  };

  $: encodedLlms = encodeURIComponent(urls.llmsTxt);
  $: chatLinks = {
    chatgpt: `https://chatgpt.com/?hints=search&q=Read+this+URL+${encodedLlms}+and+summarize+the+app`,
    claude: `https://claude.ai/new?q=Read+this+URL+${encodedLlms}+and+summarize+the+app`,
    perplexity: `https://www.perplexity.ai/?q=Read+this+URL+${encodedLlms}+and+summarize+the+app`,
  };

  function positionStyles(pos: WidgetPosition): string {
    if (pos === "footer") return "position: relative; margin: 24px auto;";
    if (pos === "floating-bottom-left") return "position: fixed; bottom: 24px; left: 24px; z-index: 9999;";
    if (pos === "floating-center") return "position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 9999;";
    return "position: fixed; bottom: 24px; right: 24px; z-index: 9999;";
  }

  $: colorVarStyle = [
    colors.bg ? `--agent-ready-bg: ${colors.bg}` : "",
    colors.border ? `--agent-ready-panel-border: ${colors.border}` : "",
    colors.textActive ? `--agent-ready-text-active: ${colors.textActive}` : "",
    colors.textInactive ? `--agent-ready-text-inactive: ${colors.textInactive}` : "",
    colors.tabActiveBg ? `--agent-ready-tab-active-bg: ${colors.tabActiveBg}` : "",
    colors.accent ? `--agent-ready-accent: ${colors.accent}` : "",
  ].filter(Boolean).join("; ");

  $: widgetStyle = `${positionStyles(position)}; ${colorVarStyle}`;

  async function copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Silent fail on permission denial.
    }
  }
</script>

<div class="widget" data-theme={theme} style={widgetStyle}>
  <div class="tabs">
    <button class:active={tab === "HUMAN"} on:click={() => (tab = "HUMAN")}>HUMAN</button>
    <button class:active={tab === "MACHINE"} on:click={() => (tab = "MACHINE")}>MACHINE</button>
  </div>

  {#if tab === "HUMAN"}
    <div class="panel">
      <p class="title">{currentStatus?.appName ?? "LLMs discovery"}</p>
      <p class="sub">These files help AI agents understand this app.</p>
      <div class="row"><a href={urls.llmsTxt} target="_blank" rel="noreferrer">llms.txt</a><button on:click={() => copy(urls.llmsTxt)}>copy</button></div>
      <div class="row"><a href={urls.agentsMd} target="_blank" rel="noreferrer">agents.md</a><button on:click={() => copy(urls.agentsMd)}>copy</button></div>
      {#if currentStatus?.fullTxtEnabled}
        <div class="row"><a href={urls.fullTxt} target="_blank" rel="noreferrer">llms-full.txt</a><button on:click={() => copy(urls.fullTxt)}>copy</button></div>
      {/if}
      <div class="divider"></div>
      <a class="ext-link" href={chatLinks.chatgpt} target="_blank" rel="noreferrer">
        <span>Open in ChatGPT</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>
      </a>
      <a class="ext-link" href={chatLinks.claude} target="_blank" rel="noreferrer">
        <span>Open in Claude</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>
      </a>
      <a class="ext-link" href={chatLinks.perplexity} target="_blank" rel="noreferrer">
        <span>Open in Perplexity</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>
      </a>
    </div>
  {:else}
    <div class="panel">
      {#if showTestModeBadge && currentStatus?.testMode}
        <a class="testmode-badge" href="https://github.com/waynesutton/agent-ready-component/blob/main/INTEGRATION.md#section-testmode--going-to-production" target="_blank" rel="noreferrer">TEST MODE</a>
      {/if}
      {#if isStale}
        <div class="stale" role="status" aria-live="polite">Content updated — refresh</div>
      {/if}
      <div class="row"><a href={urls.llmsTxt} target="_blank" rel="noreferrer">llms.txt</a><a class="icon-link" href={urls.llmsTxt} target="_blank" rel="noreferrer" title="Open llms.txt"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg></a></div>
      <div class="row"><a href={urls.agentsMd} target="_blank" rel="noreferrer">agents.md</a><a class="icon-link" href={urls.agentsMd} target="_blank" rel="noreferrer" title="Open agents.md"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg></a></div>
      {#if currentStatus?.fullTxtEnabled}
        <div class="row"><a href={urls.fullTxt} target="_blank" rel="noreferrer">llms-full.txt</a><a class="icon-link" href={urls.fullTxt} target="_blank" rel="noreferrer" title="Open llms-full.txt"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg></a></div>
      {/if}
      {#if showStatus}
        <div class="row"><a href={urls.status} target="_blank" rel="noreferrer">status</a><a class="icon-link" href={urls.status} target="_blank" rel="noreferrer" title="Open status"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg></a></div>
      {/if}
      <p class="meta">
        {#if currentStatus?.lastGeneratedAt}
          generated {new Date(currentStatus.lastGeneratedAt).toLocaleString()}
        {:else}
          not generated yet
        {/if}
      </p>
      {#if currentStatus?.generationInProgress}<p class="meta">Generating...</p>{/if}
      {#if currentStatus?.hasDrafts}<p class="meta">Drafts pending</p>{/if}
    </div>
  {/if}
</div>

<style>
  .widget {
    width: 280px;
    background: var(--agent-ready-bg, #1a1a1a);
    border: 1px solid var(--agent-ready-panel-border, #333333);
    border-radius: var(--agent-ready-radius, 4px);
    color: var(--agent-ready-text-active, #e5e5e5);
    font-family: var(--agent-ready-font, "Courier New", Courier, monospace);
    font-size: 12px;
    letter-spacing: 0.1em;
    overflow: hidden;
  }
  .tabs {
    display: flex;
  }
  .tabs button {
    flex: 1;
    height: 40px;
    min-width: 100px;
    background: #111111;
    color: var(--agent-ready-text-inactive, #666666);
    font: inherit;
    letter-spacing: inherit;
    border: none;
    border-bottom: 1px solid var(--agent-ready-panel-border, #333333);
    cursor: pointer;
    transition: background 120ms ease;
  }
  .tabs button.active {
    background: var(--agent-ready-tab-active-bg, #2a2a2a);
    color: var(--agent-ready-text-active, #e5e5e5);
    font-weight: 600;
  }
  .panel {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .title {
    margin: 0;
    font-weight: 600;
  }
  .sub {
    margin: 0;
    color: #888888;
    font-size: 11px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .row a {
    color: var(--agent-ready-accent, #ffffff);
    text-decoration: none;
    font-size: 12px;
  }
  .row button {
    background: transparent;
    color: #888888;
    border: 1px solid #333333;
    border-radius: 3px;
    padding: 2px 8px;
    font: inherit;
    font-size: 10px;
    letter-spacing: 0.1em;
    cursor: pointer;
  }
  .icon-link {
    display: inline-flex;
    align-items: center;
    padding: 2px 4px;
    border-radius: 3px;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 120ms ease;
  }
  .icon-link:hover {
    opacity: 0.7;
  }
  .divider {
    height: 1px;
    background: var(--agent-ready-panel-border, #333333);
    margin: 4px 0;
  }
  .ext-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    color: #888888;
    text-decoration: none;
    font-size: 11px;
    padding: 3px 0;
    transition: color 120ms ease;
  }
  .ext-link:hover {
    color: var(--agent-ready-text-active, #e5e5e5);
  }
  .meta {
    margin: 6px 0 0;
    color: #666666;
    font-size: 10px;
  }
  .testmode-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid #8b5a00;
    background: #2a1a00;
    color: #ffb347;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-decoration: none;
    margin-bottom: 8px;
    width: fit-content;
  }
  .stale {
    background: #2a1a00;
    color: #ffb347;
    border: 1px solid #8b5a00;
    border-radius: 3px;
    padding: 4px 8px;
    font-size: 10px;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }
</style>
