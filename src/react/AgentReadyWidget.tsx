import { useEffect, useMemo, useState } from "react";
import type { WidgetPosition, WidgetTheme } from "../client/types.js";
import { useAgentReadyStatus } from "./useAgentReadyStatus.js";

export type AgentReadyWidgetProps = {
  appUrl: string;
  position?: WidgetPosition;
  theme?: WidgetTheme;
  showTestModeBadge?: boolean;
  // Path overrides. Must match the `registerRoutes` options used on the server.
  llmsTxtPath?: string;
  agentsMdPath?: string;
  fullTxtPath?: string;
  statusPath?: string;
};

type Tab = "HUMAN" | "MACHINE";

// Terminal-style widget with HUMAN / MACHINE toggle.
// Styles are inline so the widget drops into any app without requiring a CSS bundle.
export function AgentReadyWidget(props: AgentReadyWidgetProps) {
  const position = props.position ?? "floating-bottom-right";
  const theme = props.theme ?? "system";
  const llmsTxtPath = props.llmsTxtPath ?? "/llms.txt";
  const agentsMdPath = props.agentsMdPath ?? "/agents.md";
  const fullTxtPath = props.fullTxtPath ?? "/llms-full.txt";
  const statusPath = props.statusPath ?? "/llms-status";

  const status = useAgentReadyStatus({ appUrl: props.appUrl, statusPath });
  const [tab, setTab] = useState<Tab>("HUMAN");
  const [initialVersion, setInitialVersion] = useState<string | null>(null);

  useEffect(() => {
    if (status?.generatedFromVersion && initialVersion === null) {
      setInitialVersion(status.generatedFromVersion);
    }
  }, [status, initialVersion]);

  const isStale =
    !!status?.generatedFromVersion &&
    !!initialVersion &&
    status.generatedFromVersion !== initialVersion;

  const baseUrl = props.appUrl.replace(/\/$/, "");
  const urls = useMemo(
    () => ({
      llmsTxt: `${baseUrl}${llmsTxtPath}`,
      agentsMd: `${baseUrl}${agentsMdPath}`,
      fullTxt: `${baseUrl}${fullTxtPath}`,
      status: `${baseUrl}${statusPath}`,
    }),
    [baseUrl, llmsTxtPath, agentsMdPath, fullTxtPath, statusPath],
  );

  const containerStyle = positionStyle(position);

  return (
    <div
      data-theme={theme}
      style={{
        ...containerStyle,
        width: 280,
        background: "var(--agent-ready-bg, #1a1a1a)",
        border: "1px solid var(--agent-ready-panel-border, #333333)",
        borderRadius: "var(--agent-ready-radius, 4px)",
        color: "var(--agent-ready-text-active, #e5e5e5)",
        fontFamily: "var(--agent-ready-font, 'Courier New', Courier, monospace)",
        fontSize: 12,
        letterSpacing: "0.1em",
        overflow: "hidden",
      }}
    >
      <div style={toggleRowStyle}>
        <TabButton label="HUMAN" active={tab === "HUMAN"} onClick={() => setTab("HUMAN")} />
        <TabButton label="MACHINE" active={tab === "MACHINE"} onClick={() => setTab("MACHINE")} />
      </div>

      {tab === "HUMAN" ? (
        <div style={panelStyle}>
          <p style={paragraphStyle}>
            {status?.appName ?? "LLMs discovery"}
          </p>
          <p style={subParagraphStyle}>
            These files help AI agents understand this app.
          </p>
          <Row label="llms.txt" url={urls.llmsTxt} />
          <Row label="agents.md" url={urls.agentsMd} />
          {status?.fullTxtEnabled ? <Row label="llms-full.txt" url={urls.fullTxt} /> : null}
        </div>
      ) : (
        <div style={panelStyle}>
          {props.showTestModeBadge !== false && status?.testMode ? (
            <TestModeBadge />
          ) : null}
          {isStale ? (
            <div style={staleBannerStyle} role="status" aria-live="polite">
              Content updated — refresh
            </div>
          ) : null}
          <Row label="llms.txt" url={urls.llmsTxt} />
          <Row label="agents.md" url={urls.agentsMd} />
          {status?.fullTxtEnabled ? <Row label="llms-full.txt" url={urls.fullTxt} /> : null}
          <Row label="status" url={urls.status} />
          <p style={metaStyle}>
            {status?.lastGeneratedAt
              ? `generated ${new Date(status.lastGeneratedAt).toLocaleString()}`
              : "not generated yet"}
          </p>
          {status?.generationInProgress ? <p style={metaStyle}>Generating...</p> : null}
          {status?.hasDrafts ? <p style={metaStyle}>Drafts pending</p> : null}
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

function TabButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        flex: 1,
        height: 40,
        minWidth: 100,
        background: props.active ? "var(--agent-ready-tab-active-bg, #2a2a2a)" : "#111111",
        color: props.active
          ? "var(--agent-ready-text-active, #e5e5e5)"
          : "var(--agent-ready-text-inactive, #666666)",
        fontFamily: "inherit",
        fontSize: "inherit",
        letterSpacing: "inherit",
        border: "none",
        borderBottom: "1px solid var(--agent-ready-panel-border, #333333)",
        fontWeight: props.active ? 600 : 400,
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
    >
      {props.label}
    </button>
  );
}

function Row(props: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard permission denied. Silent failure is acceptable.
    }
  };
  return (
    <div style={rowStyle}>
      <a href={props.url} target="_blank" rel="noreferrer" style={linkStyle}>
        {props.label}
      </a>
      <button type="button" onClick={copy} style={copyButtonStyle}>
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

function TestModeBadge() {
  return (
    <a
      href="https://github.com/waynesutton/agent-ready-component/blob/main/INTEGRATION.md#section-testmode--going-to-production"
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 3,
        border: "1px solid #8b5a00",
        background: "#2a1a00",
        color: "#ffb347",
        fontSize: 10,
        letterSpacing: "0.15em",
        textDecoration: "none",
        marginBottom: 8,
      }}
    >
      TEST MODE
    </a>
  );
}

// --- Styles ---

function positionStyle(position: WidgetPosition): React.CSSProperties {
  switch (position) {
    case "footer":
      return { position: "relative", margin: "24px auto" };
    case "floating-bottom-left":
      return { position: "fixed", bottom: 24, left: 24, zIndex: 9999 };
    case "floating-bottom-right":
    default:
      return { position: "fixed", bottom: 24, right: 24, zIndex: 9999 };
  }
}

const toggleRowStyle: React.CSSProperties = { display: "flex" };
const panelStyle: React.CSSProperties = { padding: 12, display: "flex", flexDirection: "column", gap: 6 };
const paragraphStyle: React.CSSProperties = { margin: 0, fontWeight: 600 };
const subParagraphStyle: React.CSSProperties = { margin: 0, color: "#888888", fontSize: 11 };
const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};
const linkStyle: React.CSSProperties = {
  color: "var(--agent-ready-accent, #ffffff)",
  textDecoration: "none",
  fontSize: 12,
};
const copyButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#888888",
  border: "1px solid #333333",
  borderRadius: 3,
  padding: "2px 8px",
  fontFamily: "inherit",
  fontSize: 10,
  letterSpacing: "0.1em",
  cursor: "pointer",
};
const metaStyle: React.CSSProperties = { margin: "6px 0 0", color: "#666666", fontSize: 10 };
const staleBannerStyle: React.CSSProperties = {
  background: "#2a1a00",
  color: "#ffb347",
  border: "1px solid #8b5a00",
  borderRadius: 3,
  padding: "4px 8px",
  fontSize: 10,
  letterSpacing: "0.1em",
  marginBottom: 8,
};
