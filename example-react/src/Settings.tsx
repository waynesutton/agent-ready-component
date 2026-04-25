import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { Button } from "./components/Button";
import { Tabs } from "./components/Tabs";

type PageStatus = "published" | "draft" | "archived";

export default function Settings() {
  const status = useQuery(api.agentReady.content.getCacheStatus, {});
  const pages = useQuery(api.agentReady.content.listPages, { includeAllStatuses: true });
  const regenerate = useAction(api.agentReady.content.regenerateAll);
  const rollback = useMutation(api.agentReady.content.rollbackCache);
  const publishPage = useMutation(api.agentReady.content.publishPage);
  const draftPage = useMutation(api.agentReady.content.draftPage);
  const archivePage = useMutation(api.agentReady.content.archivePage);

  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("pages");
  const tabs = [
    { id: "pages", label: "Pages" },
    { id: "cache", label: "Cache" },
    { id: "actions", label: "Actions" },
  ];

  const onRegenerate = async () => {
    setBusy(true);
    try {
      await regenerate({});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="hero">
        <h1>Settings</h1>
        <p className="lede">
          Control publish state, regenerate files, roll back to previous cache versions, and watch
          the live status stream.
        </p>
      </div>

      <Tabs tabs={tabs} activeId={tab} onChange={setTab} />

      {tab === "pages" && (
        <div>
          <h3>Pages</h3>
          <table className="pages-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Path</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(pages ?? []).map((page: { _id: string; title: string; path: string; status: PageStatus }) => (
                <tr key={page._id}>
                  <td style={{ fontWeight: 600 }}>{page.title}</td>
                  <td><code>{page.path}</code></td>
                  <td>
                    <span className={`pill ${page.status}`}>{page.status}</span>
                  </td>
                  <td className="actions">
                    <button type="button" onClick={() => publishPage({ path: page.path })}>Publish</button>
                    <button type="button" onClick={() => draftPage({ path: page.path })}>Draft</button>
                    <button type="button" onClick={() => archivePage({ path: page.path })}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "cache" && (
        <div>
          <h3>Live status</h3>
          {status ? (
            <pre className="status-block">{JSON.stringify(status, null, 2)}</pre>
          ) : (
            <p style={{ color: "var(--muted)" }}>Loading status...</p>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div>
          <div className="settings-row">
            <Button variant="primary" onClick={onRegenerate} disabled={busy}>
              {busy ? "Regenerating..." : "Regenerate all files"}
            </Button>
            <Button variant="ghost" onClick={() => rollback({ fileType: "llms.txt" })} disabled={busy}>
              Rollback llms.txt
            </Button>
            <Button variant="ghost" onClick={() => rollback({ fileType: "agents.md" })} disabled={busy}>
              Rollback agents.md
            </Button>
            <Button variant="ghost" onClick={() => rollback({ fileType: "llms-full.txt" })} disabled={busy}>
              Rollback llms-full.txt
            </Button>
          </div>
          <div className="callout">
            <strong>Tip:</strong> Rollback swaps the active cache entry. The next sync or cron run
            replaces it again.
          </div>
        </div>
      )}
    </div>
  );
}
