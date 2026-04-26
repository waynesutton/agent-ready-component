import { useEffect, useMemo, useState } from "react";
import type { ReadinessReport, WidgetColors, WidgetPosition, WidgetTheme } from "../client/types.js";
import { useAgentReadyStatus } from "./useAgentReadyStatus.js";
import { useAgentReadyReadiness } from "./useAgentReadyReadiness.js";

export type AgentReadyWidgetProps = {
  appUrl: string;
  position?: WidgetPosition;
  theme?: WidgetTheme;
  showTestModeBadge?: boolean;
  showStatus?: boolean;
  showFiles?: boolean;
  showAppName?: boolean;
  showDescription?: boolean;
  showMeta?: boolean;
  colors?: Partial<WidgetColors>;
  llmsTxtPath?: string;
  agentsMdPath?: string;
  fullTxtPath?: string;
  statusPath?: string;
  readinessPath?: string;
  showScoreTab?: boolean;
};

type Tab = "HUMAN" | "MACHINE" | "SCORE";

// Inline Phosphor ArrowSquareOut icon (16x16, regular weight).
function ArrowSquareOutIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 256 256"
      fill={color}
      style={{ flexShrink: 0 }}
    >
      <path d="M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z" />
    </svg>
  );
}

export function AgentReadyWidget(props: AgentReadyWidgetProps) {
  const position = props.position ?? "floating-bottom-right";
  const theme = props.theme ?? "system";
  const colors = props.colors ?? {};
  const llmsTxtPath = props.llmsTxtPath ?? "/llms.txt";
  const agentsMdPath = props.agentsMdPath ?? "/agents.md";
  const fullTxtPath = props.fullTxtPath ?? "/llms-full.txt";
  const statusPath = props.statusPath ?? "/llms-status";
  const readinessPath = props.readinessPath ?? "/llms-readiness";

  const status = useAgentReadyStatus({ appUrl: props.appUrl, statusPath });
  const readiness = useAgentReadyReadiness({ appUrl: props.appUrl, readinessPath });

  // Props override config. When prop is undefined, fall back to status endpoint (config-driven).
  const showStatus = props.showStatus ?? status?.widgetStatusVisible ?? true;
  const showFiles = props.showFiles ?? status?.widgetShowFiles ?? true;
  const showAppName = props.showAppName ?? status?.widgetShowAppName ?? true;
  const showDescription = props.showDescription ?? status?.widgetShowDescription ?? true;
  const showMeta = props.showMeta ?? status?.widgetShowMeta ?? true;
  const scoreTabVisible = props.showScoreTab ?? status?.readinessEndpointEnabled ?? false;
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

  // Build AI chat URLs from the raw llms.txt URL.
  const chatLinks = useMemo(() => {
    const encoded = encodeURIComponent(urls.llmsTxt);
    return {
      chatgpt: `https://chatgpt.com/?hints=search&q=Read+this+URL+${encoded}+and+summarize+the+app`,
      claude: `https://claude.ai/new?q=Read+this+URL+${encoded}+and+summarize+the+app`,
      perplexity: `https://www.perplexity.ai/?q=Read+this+URL+${encoded}+and+summarize+the+app`,
    };
  }, [urls.llmsTxt]);

  const containerStyle = positionStyle(position);

  // Merge user hex colors into CSS custom properties.
  const colorVars: Record<string, string> = {};
  if (colors.bg) colorVars["--agent-ready-bg"] = colors.bg;
  if (colors.border) colorVars["--agent-ready-panel-border"] = colors.border;
  if (colors.textActive) colorVars["--agent-ready-text-active"] = colors.textActive;
  if (colors.textInactive) colorVars["--agent-ready-text-inactive"] = colors.textInactive;
  if (colors.tabActiveBg) colorVars["--agent-ready-tab-active-bg"] = colors.tabActiveBg;
  if (colors.accent) colorVars["--agent-ready-accent"] = colors.accent;

  return (
    <div
      data-theme={theme}
      style={{
        ...containerStyle,
        ...colorVars,
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
        {scoreTabVisible ? (
          <TabButton label="SCORE" active={tab === "SCORE"} onClick={() => setTab("SCORE")} />
        ) : null}
      </div>

      {tab === "SCORE" ? (
        <ScorePanel readiness={readiness} />
      ) : tab === "HUMAN" ? (
        <div style={panelStyle}>
          {showAppName ? (
            <p style={paragraphStyle}>
              {status?.appName ?? "LLMs discovery"}
            </p>
          ) : null}
          {showDescription ? (
            <p style={subParagraphStyle}>
              These files help AI agents understand this app.
            </p>
          ) : null}
          {showFiles ? (
            <>
              <CopyRow label="llms.txt" url={urls.llmsTxt} />
              <CopyRow label="agents.md" url={urls.agentsMd} />
              {status?.fullTxtEnabled ? <CopyRow label="llms-full.txt" url={urls.fullTxt} /> : null}
            </>
          ) : null}
          {(showAppName || showDescription || showFiles) ? <div style={dividerStyle} /> : null}
          <ExternalLink label="Open in ChatGPT" url={chatLinks.chatgpt} />
          <ExternalLink label="Open in Claude" url={chatLinks.claude} />
          <ExternalLink label="Open in Perplexity" url={chatLinks.perplexity} />
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
          <FileRow label="llms.txt" url={urls.llmsTxt} />
          <FileRow label="agents.md" url={urls.agentsMd} />
          {status?.fullTxtEnabled ? <FileRow label="llms-full.txt" url={urls.fullTxt} /> : null}
          {showStatus ? <FileRow label="status" url={urls.status} /> : null}
          {showMeta ? (
            <>
              <p style={metaStyle}>
                {status?.lastGeneratedAt
                  ? `generated ${new Date(status.lastGeneratedAt).toLocaleString()}`
                  : "not generated yet"}
              </p>
              {status?.generationInProgress ? <p style={metaStyle}>Generating...</p> : null}
              {status?.hasDrafts ? <p style={metaStyle}>Drafts pending</p> : null}
            </>
          ) : null}
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

/** HUMAN tab: copy-to-clipboard row for file URLs. */
function CopyRow(props: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard permission denied.
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

/** MACHINE tab: file link with an open-in-new-tab icon. */
function FileRow(props: { label: string; url: string }) {
  return (
    <div style={rowStyle}>
      <a href={props.url} target="_blank" rel="noreferrer" style={linkStyle}>
        {props.label}
      </a>
      <a
        href={props.url}
        target="_blank"
        rel="noreferrer"
        style={iconLinkStyle}
        title={`Open ${props.label}`}
      >
        <ArrowSquareOutIcon color="#888888" />
      </a>
    </div>
  );
}

/** HUMAN tab: external AI chat link with arrow icon. */
function ExternalLink(props: { label: string; url: string }) {
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      style={externalLinkStyle}
    >
      <span>{props.label}</span>
      <ArrowSquareOutIcon color="#888888" />
    </a>
  );
}

/** SCORE tab: readiness score, colored dot, check list. */
function ScorePanel(props: { readiness: ReadinessReport | null }) {
  const { readiness } = props;
  if (!readiness) {
    return (
      <div style={panelStyle}>
        <p style={{ ...metaStyle, margin: 0 }}>Loading readiness...</p>
      </div>
    );
  }

  const { score, checks } = readiness;
  const dotColor = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ color: "#888888", fontSize: 11 }}>/100</span>
      </div>

      <div style={dividerStyle} />

      {checks.map((check) => (
        <div key={check.id} style={scoreCheckRowStyle}>
          <span style={{ color: check.status === "pass" ? "#22c55e" : check.status === "warn" ? "#eab308" : "#ef4444", flexShrink: 0 }}>
            {check.status === "pass" ? "[OK]" : check.status === "warn" ? "[!!]" : "[XX]"}
          </span>
          <span style={{ flex: 1, fontSize: 11, color: "#cccccc" }}>{check.label}</span>
          <span style={{ color: "#666666", fontSize: 10 }}>
            {check.points}/{check.maxPoints}
          </span>
        </div>
      ))}

      {score < 80 ? (
        <>
          <div style={dividerStyle} />
          <p style={{ margin: 0, color: "#888888", fontSize: 10 }}>
            Run npx agent-ready agent-ready to improve
          </p>
        </>
      ) : null}
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
    case "floating-center":
      return {
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
      };
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
const iconLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 4px",
  borderRadius: 3,
  textDecoration: "none",
  cursor: "pointer",
  transition: "opacity 120ms ease",
};
const externalLinkStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  color: "#888888",
  textDecoration: "none",
  fontSize: 11,
  padding: "3px 0",
  transition: "color 120ms ease",
};
const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "var(--agent-ready-panel-border, #333333)",
  margin: "4px 0",
};
const scoreCheckRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontFamily: "'Courier New', Courier, monospace",
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
