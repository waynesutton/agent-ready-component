<script lang="ts">
  import { onDestroy } from "svelte";
  import { createAgentReadyStatusStore } from "./store.js";
  import type { AgentReadyStatus, ReadinessReport, WidgetColors, WidgetPosition, WidgetTheme } from "../client/types.js";

  export let appUrl: string;
  /**
   * Optional public app URL used for visible file links and AI chat prompts.
   * Set this when your production frontend lives on a different domain than the endpoint base.
   * Falls back to status.appUrl from the component, then window.location.origin, then appUrl.
   */
  export let publicAppUrl: string | undefined = undefined;
  export let position: WidgetPosition = "floating-bottom-right";
  export let theme: WidgetTheme = "system";
  export let showTestModeBadge: boolean = true;
  export let showStatus: boolean | undefined = undefined;
  export let showFiles: boolean | undefined = undefined;
  export let showAppName: boolean | undefined = undefined;
  export let showDescription: boolean | undefined = undefined;
  export let showMeta: boolean | undefined = undefined;
  export let showScoreTab: boolean | undefined = undefined;
  export let cleanMode: boolean | undefined = undefined;
  export let showHumanTab: boolean | undefined = undefined;
  export let showMachineTab: boolean | undefined = undefined;
  export let showChatLinks: boolean | undefined = undefined;
  export let showChatGPT: boolean | undefined = undefined;
  export let showClaude: boolean | undefined = undefined;
  export let showPerplexity: boolean | undefined = undefined;
  export let colors: Partial<WidgetColors> = {};
  export let llmsTxtPath: string = "/llms.txt";
  export let agentsMdPath: string = "/agents.md";
  export let fullTxtPath: string = "/llms-full.txt";
  export let statusPath: string = "/llms-status";
  export let readinessPath: string = "/llms-readiness";

  type Tab = "HUMAN" | "MACHINE" | "SCORE";
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

  // Readiness report polling (60s interval, matches React hook)
  let readiness: ReadinessReport | null = null;
  let readinessInterval: ReturnType<typeof setInterval> | null = null;

  // Readiness endpoint always lives on the deployment that runs the component.
  $: readinessUrl = `${(appUrl || "").replace(/\/+$/, "")}${readinessPath}`;

  async function fetchReadiness(): Promise<void> {
    try {
      const res = await fetch(readinessUrl, { cache: "no-store" });
      if (!res.ok) return;
      readiness = (await res.json()) as ReadinessReport;
    } catch {
      // Degrade gracefully when endpoint unreachable.
    }
  }

  $: scoreTabVisible = showScoreTab ?? currentStatus?.widgetShowScoreTab ?? false;

  $: if (scoreTabVisible) {
    void fetchReadiness();
    if (!readinessInterval) {
      readinessInterval = setInterval(() => void fetchReadiness(), 60_000);
    }
  } else if (readinessInterval) {
    clearInterval(readinessInterval);
    readinessInterval = null;
  }

  onDestroy(() => {
    if (readinessInterval) clearInterval(readinessInterval);
  });

  // Score display helpers
  $: scoreDotColor =
    readiness
      ? readiness.score >= 80 ? "#22c55e" : readiness.score >= 50 ? "#eab308" : "#ef4444"
      : "#666666";

  // Props override config. When prop is undefined, fall back to status endpoint (config-driven).
  $: resolvedShowStatus = showStatus ?? currentStatus?.widgetStatusVisible ?? true;
  $: resolvedShowFiles = showFiles ?? currentStatus?.widgetShowFiles ?? true;
  $: resolvedShowAppName = showAppName ?? currentStatus?.widgetShowAppName ?? true;
  $: resolvedShowDescription = showDescription ?? currentStatus?.widgetShowDescription ?? true;
  $: resolvedShowMeta = showMeta ?? currentStatus?.widgetShowMeta ?? true;
  $: resolvedCleanMode = cleanMode ?? currentStatus?.widgetCleanMode ?? false;
  $: resolvedHumanTab = showHumanTab ?? currentStatus?.widgetShowHumanTab ?? true;
  $: resolvedMachineTab = showMachineTab ?? currentStatus?.widgetShowMachineTab ?? true;
  $: resolvedChatLinks = showChatLinks ?? currentStatus?.widgetShowChatLinks ?? true;
  $: resolvedChatGPT = showChatGPT ?? currentStatus?.widgetShowChatGPT ?? true;
  $: resolvedClaude = showClaude ?? currentStatus?.widgetShowClaude ?? true;
  $: resolvedPerplexity = showPerplexity ?? currentStatus?.widgetShowPerplexity ?? true;

  $: effectiveShowAppName = resolvedCleanMode ? false : resolvedShowAppName;
  $: effectiveShowDescription = resolvedCleanMode ? false : resolvedShowDescription;

  $: anyTabVisible = resolvedHumanTab || resolvedMachineTab || scoreTabVisible;

  // Endpoint base: where the widget fetches /llms-status and /llms-readiness.
  $: endpointBase = (appUrl || (typeof window !== "undefined" ? window.location.origin : "")).replace(
    /\/+$/,
    "",
  );

  // Visible base: shown to humans and AI agents in the file links and chat prompts.
  // Precedence: publicAppUrl prop -> status.appUrl -> window.location.origin -> appUrl.
  $: visibleBase = (() => {
    if (publicAppUrl && publicAppUrl.length > 0) return publicAppUrl.replace(/\/+$/, "");
    if (currentStatus?.appUrl) return currentStatus.appUrl.replace(/\/+$/, "");
    if (typeof window !== "undefined") return window.location.origin.replace(/\/+$/, "");
    return endpointBase;
  })();

  // Dev-only warning for the common Vite trap where a Convex .site URL leaks into prod.
  $: {
    if (typeof window !== "undefined" && visibleBase) {
      const isProd =
        typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production";
      const origin = window.location.origin;
      const isLocal = /^(http:\/\/localhost|http:\/\/127\.0\.0\.1|http:\/\/\[::1\])/.test(origin);
      if (
        !isProd &&
        !isLocal &&
        visibleBase.includes(".convex.site") &&
        !origin.includes(".convex.site")
      ) {
        try {
          const sameHost = new URL(visibleBase).host === new URL(origin).host;
          if (!sameHost) {
            console.warn(
              "[agent-ready] Widget visible URL points to a Convex .site URL while the browser is on a custom domain. " +
                "Set publicAppUrl on <AgentReadyWidget> or VITE_SITE_URL in your build to avoid leaking the dev URL.",
            );
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  $: base = visibleBase;
  $: urls = {
    llmsTxt: `${visibleBase}${llmsTxtPath}`,
    agentsMd: `${visibleBase}${agentsMdPath}`,
    fullTxt: `${visibleBase}${fullTxtPath}`,
    // Status link still points at the endpoint base because that is where the JSON lives.
    status: `${endpointBase}${statusPath}`,
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

{#if anyTabVisible}
<div class="widget" data-theme={theme} style={widgetStyle}>
  <div class="tabs">
    {#if resolvedHumanTab}
      <button class:active={tab === "HUMAN"} on:click={() => (tab = "HUMAN")}>HUMAN</button>
    {/if}
    {#if resolvedMachineTab}
      <button class:active={tab === "MACHINE"} on:click={() => (tab = "MACHINE")}>MACHINE</button>
    {/if}
    {#if scoreTabVisible}
      <button class:active={tab === "SCORE"} on:click={() => (tab = "SCORE")}>SCORE</button>
    {/if}
  </div>

  {#if tab === "SCORE"}
    <div class="panel">
      {#if !readiness}
        <p class="meta" style="margin: 0;">Loading readiness...</p>
      {:else}
        <div class="score-header">
          <span class="score-dot" style="background: {scoreDotColor};"></span>
          <span class="score-value">{readiness.score}</span>
          <span class="score-label">/100</span>
        </div>

        <div class="divider"></div>

        <div class="checks-list">
          {#each readiness.checks as check (check.id)}
            <div class="check-row">
              <span class={check.status === "pass" ? "check-pass" : check.status === "warn" ? "check-warn" : "check-fail"}>
                {check.status === "pass" ? "[OK]" : check.status === "warn" ? "[!!]" : "[XX]"}
              </span>
              <span class="check-label">{check.label}</span>
              <span class="check-points">{check.points}/{check.maxPoints}</span>
            </div>
          {/each}
        </div>

        {#if readiness.score < 80}
          <div class="divider"></div>
          <p class="hint">Run npx agent-ready agent-ready to improve</p>
        {/if}
      {/if}
    </div>
  {:else if tab === "HUMAN"}
    <div class="panel">
      {#if effectiveShowAppName}
        <p class="title">{currentStatus?.appName ?? "LLMs discovery"}</p>
      {/if}
      {#if effectiveShowDescription}
        <p class="sub">These files help AI agents understand this app.</p>
      {/if}
      {#if resolvedShowFiles}
        <div class="row"><a href={urls.llmsTxt} target="_blank" rel="noreferrer">llms.txt</a><button on:click={() => copy(urls.llmsTxt)}>copy</button></div>
        <div class="row"><a href={urls.agentsMd} target="_blank" rel="noreferrer">agents.md</a><button on:click={() => copy(urls.agentsMd)}>copy</button></div>
        {#if currentStatus?.fullTxtEnabled}
          <div class="row"><a href={urls.fullTxt} target="_blank" rel="noreferrer">llms-full.txt</a><button on:click={() => copy(urls.fullTxt)}>copy</button></div>
        {/if}
      {/if}
      {#if resolvedChatLinks}
        {#if effectiveShowAppName || effectiveShowDescription || resolvedShowFiles}
          <div class="divider"></div>
        {/if}
        {#if resolvedChatGPT}
          <a class="ext-link" href={chatLinks.chatgpt} target="_blank" rel="noreferrer">
            <span>Open in ChatGPT</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>
          </a>
        {/if}
        {#if resolvedClaude}
          <a class="ext-link" href={chatLinks.claude} target="_blank" rel="noreferrer">
            <span>Open in Claude</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>
          </a>
        {/if}
        {#if resolvedPerplexity}
          <a class="ext-link" href={chatLinks.perplexity} target="_blank" rel="noreferrer">
            <span>Open in Perplexity</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>
          </a>
        {/if}
      {/if}
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
      {#if resolvedShowStatus}
        <div class="row"><a href={urls.status} target="_blank" rel="noreferrer">status</a><a class="icon-link" href={urls.status} target="_blank" rel="noreferrer" title="Open status"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#888888"><path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg></a></div>
      {/if}
      {#if resolvedShowMeta}
        <p class="meta">
          {#if currentStatus?.lastGeneratedAt}
            generated {new Date(currentStatus.lastGeneratedAt).toLocaleString()}
          {:else}
            not generated yet
          {/if}
        </p>
        {#if currentStatus?.generationInProgress}<p class="meta">Generating...</p>{/if}
        {#if currentStatus?.hasDrafts}<p class="meta">Drafts pending</p>{/if}
      {/if}
    </div>
  {/if}
</div>
{/if}

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
  .score-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .score-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .score-value {
    font-family: "Courier New", Courier, monospace;
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }
  .score-label {
    color: #888888;
    font-size: 11px;
    font-weight: 400;
  }
  .checks-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 10px;
    color: #888888;
  }
  .check-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-family: "Courier New", Courier, monospace;
  }
  .check-pass {
    color: #22c55e;
    flex-shrink: 0;
  }
  .check-fail {
    color: #ef4444;
    flex-shrink: 0;
  }
  .check-warn {
    color: #eab308;
    flex-shrink: 0;
  }
  .check-label {
    flex: 1;
    font-size: 11px;
    color: #cccccc;
  }
  .check-points {
    color: #666666;
    font-size: 10px;
  }
  .hint {
    margin: 0;
    color: #888888;
    font-size: 10px;
  }
</style>
