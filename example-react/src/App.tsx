import { useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { AgentReadyWidget, UpdateBanner } from "@waynesutton/agent-ready/react";
import { Window } from "./components/Window";
import { Sidebar } from "./components/Sidebar";
import { Tabs } from "./components/Tabs";
import { Button } from "./components/Button";
import Settings from "./Settings.tsx";
import Analytics from "./Analytics.tsx";
import { AuthGate, useAuth } from "./auth.tsx";

const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
const publicAppUrl = import.meta.env.VITE_SITE_URL as string | undefined;
const installGuideUrl =
  "https://github.com/waynesutton/agent-ready-component#install";

const filenameByPath: Record<string, string> = {
  "/": "home.mdx",
  "/docs": "docs.mdx",
  "/settings": "settings.mdx",
  "/analytics": "analytics.mdx",
  "/resources": "resources.mdx",
};

export default function App() {
  useAuth();
  const location = useLocation();
  const filename = filenameByPath[location.pathname] ?? "home.mdx";

  return (
    <div className="page">
      <UpdateBanner
        appUrl={appUrl}
        message="Content updated — refresh to see the latest"
        buttonText="Refresh"
      />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span>@waynesutton/agent-ready</span>
        </div>
        <nav className="topbar-links">
          <a href={installGuideUrl} target="_blank" rel="noreferrer">Install guide</a>
          <Link to="/docs">Docs</Link>
          <a href="https://www.npmjs.com/package/@waynesutton/agent-ready" target="_blank" rel="noreferrer">npm</a>
          <a href="https://github.com/waynesutton/agent-ready-component" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>

      <Window filename={filename} toolbar={<span>auto-sync</span>}>
        <Sidebar appUrl={appUrl} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/settings" element={<AuthGate><Settings /></AuthGate>} />
            <Route path="/analytics" element={<AuthGate><Analytics /></AuthGate>} />
            <Route path="/resources" element={<Resources />} />
          </Routes>
        </main>
      </Window>

      <div className="page-footer">
        <span>Hosted on Convex. Served from the same deployment as your app.</span>
        <a href="https://docs.convex.dev/llms.txt" target="_blank" rel="noreferrer">docs.convex.dev/llms.txt</a>
      </div>

      <AgentReadyWidget
        appUrl={appUrl}
        publicAppUrl={publicAppUrl}
        position="floating-bottom-right"
        theme="dark"
      />
    </div>
  );
}

function Overview() {
  const [tab, setTab] = useState("usage");
  const tabs = [
    { id: "usage", label: "Usage" },
    { id: "pipeline", label: "Generation pipeline" },
    { id: "files", label: "Live files" },
    { id: "widget", label: "Widget" },
  ];

  return (
    <div>
      <div className="hero">
        <h1>AI agent discovery for Convex apps</h1>
        <p className="lede">
          A Convex component that generates, caches, and serves <code>llms.txt</code>,
          <code>agents.md</code>, and <code>llms-full.txt</code> from your Convex backend.
          Drop the widget into your React or Svelte frontend. ETag aware. Cron scheduled.
        </p>

        <div className="cta-row">
          <Button variant="primary" onClick={() => setTab("files")}>View live files</Button>
          <Button variant="ghost" onClick={() => setTab("pipeline")}>How it works</Button>
        </div>

        <div className="meta-row">
          <a href="https://llmstxt.org" target="_blank" rel="noreferrer">Why llms.txt</a>
          <span>Powered by @convex-dev/crons + @convex-dev/workpool</span>
        </div>
      </div>

      <Tabs tabs={tabs} activeId={tab} onChange={setTab} />

      {tab === "usage" && <UsagePanel />}
      {tab === "pipeline" && <PipelinePanel />}
      {tab === "files" && <FilesPanel />}
      {tab === "widget" && <WidgetPanel />}
    </div>
  );
}

function UsagePanel() {
  return (
    <div>
      <div className="feature-card">
        <h3>Convex component with React and Svelte widgets</h3>
        <p>
          Register the component with <code>app.use(agentReady)</code>, run <code>npx agent-ready</code>,
          and drop the widget into your frontend. Pages, endpoints, settings, and generation logic live
          inside the component boundary with isolated tables, so your app schema stays clean.
        </p>
      </div>
      <div className="callout">
        <strong>npm install</strong> @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
      </div>
      <div className="callout">
        <strong>npx</strong> agent-ready
      </div>
      <div className="meta-row" style={{ display: "flex", gap: 24 }}>
        <a href={installGuideUrl} target="_blank" rel="noreferrer">Read the install guide</a>
        <Link to="/docs">Open docs</Link>
      </div>
    </div>
  );
}

function PipelinePanel() {
  const steps = [
    { label: "Seed pages + endpoints", detail: "From config or the settings panel" },
    { label: "Render files", detail: "llms.txt, agents.md, llms-full.txt" },
    { label: "Hash + cache", detail: "SHA-256 ETag written to cachedFiles" },
    { label: "Serve + track", detail: "HTTP handlers + optional analytics" },
  ];
  return (
    <div>
      <ul className="kv-list">
        {steps.map((step, i) => (
          <li key={step.label}>
            <span>
              <strong>{String(i + 1).padStart(2, "0")}</strong>&nbsp;&nbsp;{step.label}
            </span>
            <span style={{ color: "var(--muted)", fontWeight: 400 }}>{step.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilesPanel() {
  const files = [
    { path: "/llms.txt", desc: "Short, LLM-friendly summary + curated links" },
    { path: "/agents.md", desc: "API contract and agent instructions" },
    { path: "/llms-full.txt", desc: "Long-form docs bundled for context windows" },
    { path: "/llms-status", desc: "JSON status endpoint for the widget" },
  ];

  return (
    <div className="file-grid">
      {files.map((file) => (
        <a
          key={file.path}
          className="file-tile"
          href={`${appUrl}${file.path}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="file-name">{file.path}</span>
          <span className="file-desc">{file.desc}</span>
        </a>
      ))}
    </div>
  );
}

function WidgetPanel() {
  return (
    <div>
      <div className="feature-card">
        <h3>React and Svelte widgets built in</h3>
        <p>
          The floating widget reads from the same Convex status endpoint that agents hit. Toggle to
          <code> MACHINE</code> to see the files agents see, in real time.
        </p>
      </div>
      <ul className="kv-list" style={{ marginTop: 12 }}>
        <li><span>Default theme</span><strong>dark</strong></li>
        <li><span>Position</span><strong>floating-bottom-right</strong></li>
        <li><span>Hook</span><strong>useAgentReadyStatus()</strong></li>
      </ul>
    </div>
  );
}

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

function DocsPage() {
  return (
    <div className="docs-page">
      <div className="hero">
        <h1>Docs</h1>
        <p className="lede">
          A README-style guide for adding the Agent Ready Convex component to a React or Svelte app.
          Install it, register the component, mount the routes, then ship live discovery files.
        </p>
        <div className="meta-row">
          <a href={installGuideUrl} target="_blank" rel="noreferrer">Full README</a>
        </div>
      </div>

      <div className="docs-stack">
        <section className="docs-section">
          <h2>What it does</h2>
          <p>
            Agent Ready generates, caches, and serves <code>llms.txt</code>, <code>agents.md</code>,
            and <code>llms-full.txt</code> from your Convex backend. The widget lets humans see the
            same files that coding agents read.
          </p>
        </section>

        <section className="docs-section">
          <h2>Install flow</h2>
          <div className="docs-steps">
            {installSteps.map((step, index) => (
              <article className="docs-step" key={step.label}>
                <span className="docs-step-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.label}</h3>
                  <pre className="docs-code"><code>{step.command}</code></pre>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="docs-section">
          <h2>Convex wiring</h2>
          <p>Register the component in <code>convex/convex.config.ts</code>:</p>
          <pre className="docs-code"><code>{`import { defineApp } from "convex/server";
import agentReady from "@waynesutton/agent-ready/convex.config.js";
import crons from "@convex-dev/crons/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(crons);
app.use(workpool);
app.use(agentReady);
export default app;`}</code></pre>
          <p>Mount the routes in <code>convex/http.ts</code>:</p>
          <pre className="docs-code"><code>{`import { httpRouter } from "convex/server";
import { registerRoutes } from "@waynesutton/agent-ready";
import { components } from "./_generated/api";

const http = httpRouter();
registerRoutes(http, components.agentReady);
export default http;`}</code></pre>
        </section>

        <section className="docs-section">
          <h2>Widget</h2>
          <p>Drop the widget into React or Svelte and pass your Convex site URL.</p>
          <pre className="docs-code"><code>{`import { AgentReadyWidget } from "@waynesutton/agent-ready/react";

<AgentReadyWidget
  appUrl={import.meta.env.VITE_CONVEX_SITE_URL}
  publicAppUrl={import.meta.env.VITE_SITE_URL}
  position="floating-bottom-right"
  theme="dark"
/>`}</code></pre>
        </section>
      </div>
    </div>
  );
}

const resourceLinks: Array<{ href: string; label: string; description: string }> = [
  { href: "/docs", label: "Agent Ready docs", description: "In-demo README-style install guide" },
  { href: "https://diffs.com/docs", label: "Diffs by Pierre", description: "Reference docs for rendering code and diffs on the web" },
  { href: "https://docs.convex.dev/home", label: "Convex docs", description: "Official Convex documentation and guides" },
  { href: "https://docs.convex.dev/components/authoring", label: "Authoring components", description: "Build reusable Convex components with isolated tables" },
  { href: "https://docs.convex.dev/components/using", label: "Using components", description: "Install and wire up Convex components in your app" },
  { href: "https://docs.convex.dev/components/understanding", label: "Understanding components", description: "How components, boundaries, and isolation work" },
  { href: "https://www.convex.dev/components/static-hosting", label: "Static hosting", description: "Serve your frontend from the same Convex deployment" },
  { href: "https://auth.estifanos.com/getting-started/installation/", label: "Convex Auth (Robelest)", description: "Password, OAuth, passkeys, groups, API keys, and SSO" },
  { href: "https://github.com/robelest/convex-auth", label: "Convex Auth GitHub", description: "Source code and examples for @robelest/convex-auth" },
  { href: "https://llmstxt.org", label: "llms.txt spec", description: "The llms.txt standard for AI agent discovery" },
  { href: "https://agents.md", label: "agents.md spec", description: "The agents.md standard for API contracts" },
  { href: "https://docs.convex.dev/llms.txt", label: "Convex llms.txt", description: "Convex's own llms.txt file" },
];

function Resources() {
  return (
    <div>
      <div className="hero">
        <h1>Resources</h1>
        <p className="lede">
          Documentation, specs, and tools behind this Convex component.
        </p>
      </div>
      <div className="file-grid">
        {resourceLinks.map((link) => {
          const isInternal = link.href.startsWith("/");
          return (
          <a
            key={link.href}
            className="file-tile"
            href={link.href}
            target={isInternal ? undefined : "_blank"}
            rel={isInternal ? undefined : "noreferrer"}
          >
            <span className="file-name">{link.label}</span>
            <span className="file-desc">{link.description}</span>
          </a>
          );
        })}
      </div>
    </div>
  );
}
