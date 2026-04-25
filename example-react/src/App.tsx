import { useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AgentReadyWidget, UpdateBanner } from "@waynesutton/agent-ready/react";
import { Window } from "./components/Window";
import { Sidebar } from "./components/Sidebar";
import { Tabs } from "./components/Tabs";
import { Button } from "./components/Button";
import Settings from "./Settings.tsx";
import Analytics from "./Analytics.tsx";

const appUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;

const filenameByPath: Record<string, string> = {
  "/": "home.mdx",
  "/settings": "settings.mdx",
  "/analytics": "analytics.mdx",
};

export default function App() {
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
          <a href="https://llmstxt.org" target="_blank" rel="noreferrer">llms.txt spec</a>
          <a href="https://agents.md" target="_blank" rel="noreferrer">agents.md</a>
          <a href="https://www.convex.dev/components/static-hosting" target="_blank" rel="noreferrer">static hosting</a>
          <a href="https://github.com/waynesutton/agent-ready-component" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>

      <Window filename={filename} toolbar={<span>auto-sync</span>}>
        <Sidebar appUrl={appUrl} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </Window>

      <div className="page-footer">
        <span>Hosted on Convex. Served from the same deployment as your app.</span>
        <a href="https://docs.convex.dev/llms.txt" target="_blank" rel="noreferrer">docs.convex.dev/llms.txt</a>
      </div>

      <AgentReadyWidget appUrl={appUrl} position="floating-bottom-right" theme="dark" />
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
        <h1>The standard discovery layer for AI agents</h1>
        <p className="lede">
          Generate, cache, and serve <code>llms.txt</code>, <code>agents.md</code>,
          and <code>llms-full.txt</code> straight from your Convex deployment. ETag aware.
          Cron scheduled. Widget included.
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
        <h3>Drop-in Convex component</h3>
        <p>
          Install, run <code>npx agent-ready</code>, and the component takes over from there.
          Pages, endpoints, settings, and generation logic live inside the component so your app
          stays clean.
        </p>
      </div>
      <div className="callout">
        <strong>npm install</strong> @waynesutton/agent-ready @convex-dev/crons @convex-dev/workpool
      </div>
      <div className="callout">
        <strong>npx</strong> agent-ready
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
        <h3>HUMAN vs MACHINE, in one corner</h3>
        <p>
          The floating widget uses the exact same live status endpoint that agents hit. Toggle to
          <code> MACHINE</code> to watch the files update in real time.
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
