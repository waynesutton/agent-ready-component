<script lang="ts">
  const installGuideUrl =
    "https://github.com/waynesutton/agent-ready-component#install";

  const installSteps = [
    {
      label: "Install the package",
      command: "npm install @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool",
    },
    {
      label: "Run the setup wizard",
      command: "npx agent-ready setup",
    },
    {
      label: "Verify locally",
      command: "npx convex dev\nnpm run dev\ncurl -i http://127.0.0.1:3210/llms.txt\nnpx agent-ready status",
    },
    {
      label: "Deploy and go live",
      command: "npx convex deploy\nnpx agent-ready sync --prod\nnpx agent-ready regenerate --prod\nnpx agent-ready go-live --prod",
    },
  ];
</script>

<div class="docs-page">
  <div class="hero">
    <h1>Docs</h1>
    <p class="lede">
      A README-style guide for adding the Agent Ready Convex component to a React or Svelte app.
      Install it, register the component, mount the routes, then ship live discovery files.
    </p>
    <div class="meta-row">
      <a href={installGuideUrl} target="_blank" rel="noreferrer">Full README</a>
    </div>
  </div>

  <div class="docs-stack">
    <section class="docs-section">
      <h2>What it does</h2>
      <p>
        Agent Ready generates, caches, and serves <code>llms.txt</code>, <code>agents.md</code>,
        and <code>llms-full.txt</code> from your Convex backend. The widget lets humans see the
        same files that coding agents read.
      </p>
    </section>

    <section class="docs-section">
      <h2>Install flow</h2>
      <div class="docs-steps">
        {#each installSteps as step, index}
          <article class="docs-step">
            <span class="docs-step-index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{step.label}</h3>
              <pre class="docs-code"><code>{step.command}</code></pre>
            </div>
          </article>
        {/each}
      </div>
    </section>

    <section class="docs-section">
      <h2>Convex wiring</h2>
      <p>Register the component in <code>convex/convex.config.ts</code>:</p>
      <pre class="docs-code"><code>{`import { defineApp } from "convex/server";
import agentReady from "@waynesutton/agent-ready/convex.config.js";
import crons from "@convex-dev/crons/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(crons);
app.use(workpool);
app.use(agentReady);
export default app;`}</code></pre>
      <p>Mount the routes in <code>convex/http.ts</code>:</p>
      <pre class="docs-code"><code>{`import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components } from "./_generated/api";

const http = httpRouter();
registerRoutes(http, components.agentReady);
export default http;`}</code></pre>
    </section>

    <section class="docs-section">
      <h2>Widget</h2>
      <p>Drop the widget into Svelte and pass your Convex site URL.</p>
      <pre class="docs-code"><code>{`import { AgentReadyWidget } from "@waynesutton/agent-ready/svelte";

<AgentReadyWidget appUrl={appUrl} position="floating-bottom-right" theme="dark" />`}</code></pre>
    </section>
  </div>
</div>
