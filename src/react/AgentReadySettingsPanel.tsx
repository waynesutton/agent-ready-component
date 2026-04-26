import { useState } from "react";

type PageStatus = "published" | "draft" | "archived";

type PageRow = {
  _id: string;
  title: string;
  path: string;
  status: PageStatus;
  description: string;
  fullContent?: string;
  isOptional?: boolean;
  order?: number;
  descriptionGeneratedByAi?: boolean;
  deletedAt?: number;
};

type CacheStatus = {
  testMode: boolean;
  appName: string | null;
  appUrl: string | null;
  lastGeneratedAt: number | null;
  generatedFromVersion: string | null;
  generationInProgress: boolean;
  hasDrafts: boolean;
  fullTxtEnabled: boolean;
};

type FileType = "llms.txt" | "agents.md" | "llms-full.txt";

export type AgentReadySettingsPanelProps = {
  /** Live cache status object from your Convex query. Pass `null` while loading. */
  cacheStatus: CacheStatus | null | undefined;
  /** Live pages array from your Convex query. Pass `null` or `undefined` while loading. */
  pages: Array<PageRow> | null | undefined;
  /** Callback to regenerate all cached files. Should call your `regenerateAll` action. */
  onRegenerate: () => Promise<void>;
  /** Callback to rollback a specific file type. Should call your `rollbackCache` mutation. */
  onRollback: (fileType: FileType) => Promise<void>;
  /** Callback to publish a page. Should call your `publishPage` mutation. */
  onPublishPage: (path: string) => Promise<void>;
  /** Callback to draft a page. Should call your `draftPage` mutation. */
  onDraftPage: (path: string) => Promise<void>;
  /** Callback to archive a page. Should call your `archivePage` mutation. */
  onArchivePage: (path: string) => Promise<void>;
  /** Optional class name for the outer container. */
  className?: string;
};

/**
 * Drop-in settings panel for managing agent-ready pages, cache, and actions.
 * Framework-agnostic: pass your own Convex query results and mutation callbacks.
 *
 * Usage with Convex React hooks:
 * ```tsx
 * import { useQuery, useMutation, useAction } from "convex/react";
 * import { api } from "../convex/_generated/api";
 * import { AgentReadySettingsPanel } from "@waynesutton/agent-ready/react";
 *
 * function SettingsPage() {
 *   const status = useQuery(api.agentReady.content.getCacheStatus);
 *   const pages = useQuery(api.agentReady.content.listPages, { includeAllStatuses: true });
 *   const regenerate = useAction(api.agentReady.content.regenerateAll);
 *   const rollback = useMutation(api.agentReady.content.rollbackCache);
 *   const publish = useMutation(api.agentReady.content.publishPage);
 *   const draft = useMutation(api.agentReady.content.draftPage);
 *   const archive = useMutation(api.agentReady.content.archivePage);
 *
 *   return (
 *     <AgentReadySettingsPanel
 *       cacheStatus={status}
 *       pages={pages}
 *       onRegenerate={() => regenerate({})}
 *       onRollback={(fileType) => rollback({ fileType })}
 *       onPublishPage={(path) => publish({ path })}
 *       onDraftPage={(path) => draft({ path })}
 *       onArchivePage={(path) => archive({ path })}
 *     />
 *   );
 * }
 * ```
 */
export function AgentReadySettingsPanel(props: AgentReadySettingsPanelProps) {
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"pages" | "cache" | "actions">("pages");

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      await props.onRegenerate();
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async (fileType: FileType) => {
    setBusy(true);
    try {
      await props.onRollback(fileType);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={props.className} style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Agent Ready Settings</h2>
        <p style={subtitleStyle}>
          Manage pages, regenerate files, roll back cache, and monitor status.
        </p>
      </div>

      <div style={tabBarStyle}>
        {(["pages", "cache", "actions"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              ...tabStyle,
              ...(tab === id ? activeTabStyle : {}),
            }}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {tab === "pages" && (
        <div style={panelStyle}>
          {!props.pages ? (
            <p style={mutedStyle}>Loading pages...</p>
          ) : props.pages.length === 0 ? (
            <p style={mutedStyle}>No pages configured. Run <code>npx agent-ready sync</code> to add pages from your config.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Path</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {props.pages.map((page) => (
                  <tr key={page._id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{page.title}</td>
                    <td style={tdStyle}><code>{page.path}</code></td>
                    <td style={tdStyle}>
                      <span style={pillStyle(page.status)}>{page.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button
                          type="button"
                          style={actionBtnStyle}
                          onClick={() => props.onPublishPage(page.path)}
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          style={actionBtnStyle}
                          onClick={() => props.onDraftPage(page.path)}
                        >
                          Draft
                        </button>
                        <button
                          type="button"
                          style={actionBtnStyle}
                          onClick={() => props.onArchivePage(page.path)}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "cache" && (
        <div style={panelStyle}>
          <h3 style={sectionTitleStyle}>Live status</h3>
          {props.cacheStatus ? (
            <pre style={preStyle}>{JSON.stringify(props.cacheStatus, null, 2)}</pre>
          ) : (
            <p style={mutedStyle}>Loading status...</p>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div style={panelStyle}>
          <div style={buttonGroupStyle}>
            <button
              type="button"
              style={primaryBtnStyle}
              onClick={handleRegenerate}
              disabled={busy}
            >
              {busy ? "Regenerating..." : "Regenerate all files"}
            </button>
            <button
              type="button"
              style={ghostBtnStyle}
              onClick={() => handleRollback("llms.txt")}
              disabled={busy}
            >
              Rollback llms.txt
            </button>
            <button
              type="button"
              style={ghostBtnStyle}
              onClick={() => handleRollback("agents.md")}
              disabled={busy}
            >
              Rollback agents.md
            </button>
            <button
              type="button"
              style={ghostBtnStyle}
              onClick={() => handleRollback("llms-full.txt")}
              disabled={busy}
            >
              Rollback llms-full.txt
            </button>
          </div>
          <div style={calloutStyle}>
            <strong>Tip:</strong> Rollback swaps the active cache entry. The next sync or cron run
            replaces it again.
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styles so the component works without any external CSS.
const containerStyle: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
  color: "#1a1a1a",
  maxWidth: 800,
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#666",
  fontSize: 14,
};

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  borderBottom: "1px solid #ddd",
  marginBottom: 16,
};

const tabStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  color: "#666",
};

const activeTabStyle: React.CSSProperties = {
  color: "#1a1a1a",
  borderBottomColor: "#1a1a1a",
};

const panelStyle: React.CSSProperties = {
  padding: "4px 0",
};

const mutedStyle: React.CSSProperties = {
  color: "#999",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "1px solid #ddd",
  fontWeight: 600,
  fontSize: 12,
  color: "#666",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
  verticalAlign: "middle",
};

const pillStyle = (status: PageStatus): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 3,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.05em",
  ...(status === "published"
    ? { background: "#e6f4ea", color: "#1e7e34" }
    : status === "draft"
      ? { background: "#fff3cd", color: "#856404" }
      : { background: "#f0f0f0", color: "#666" }),
});

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
};

const actionBtnStyle: React.CSSProperties = {
  padding: "3px 8px",
  fontSize: 11,
  border: "1px solid #ddd",
  borderRadius: 3,
  background: "#fff",
  cursor: "pointer",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 16,
  fontWeight: 600,
};

const preStyle: React.CSSProperties = {
  background: "#f5f5f5",
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: 12,
  fontSize: 12,
  overflow: "auto",
  maxHeight: 400,
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  borderRadius: 4,
  background: "#1a1a1a",
  color: "#fff",
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#fff",
  color: "#1a1a1a",
  cursor: "pointer",
};

const calloutStyle: React.CSSProperties = {
  background: "#f9f9f3",
  border: "1px solid #e0d8c0",
  borderRadius: 4,
  padding: "10px 14px",
  fontSize: 13,
  color: "#555",
};
