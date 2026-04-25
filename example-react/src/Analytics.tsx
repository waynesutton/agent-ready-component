import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface SummaryShape {
  totalRequests: number;
  byAgent?: Record<string, number>;
  byFile?: Record<string, number>;
}

interface SeriesPoint {
  timestamp: number;
  count: number;
}

function useRoundedNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / intervalMs) * intervalMs);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / intervalMs) * intervalMs);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function Analytics() {
  const now = useRoundedNow();
  const summary = useQuery(api.agentReady.analytics.getSummary, { now }) as SummaryShape | null | undefined;
  const series = useQuery(api.agentReady.analytics.getTimeSeries, { now, bucketHours: 24 }) as Array<SeriesPoint> | undefined;

  if (summary === undefined) {
    return (
      <div>
        <div className="hero">
          <h1>Analytics</h1>
          <p className="lede">Loading request history...</p>
        </div>
      </div>
    );
  }

  if (summary === null) {
    return (
      <div>
        <div className="hero">
          <h1>Analytics</h1>
          <p className="lede">
            Analytics are disabled. Set <code>analyticsEnabled: true</code> in
            <code> agent-ready.config.json</code> and run <code>npx agent-ready sync</code>.
          </p>
        </div>
      </div>
    );
  }

  const topAgent = Object.entries(summary.byAgent ?? {}).sort((a, b) => b[1] - a[1])[0];
  const topFile = Object.entries(summary.byFile ?? {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <div className="hero">
        <h1>Analytics</h1>
        <p className="lede">
          Who&apos;s reading your discovery files? Aggregated request counts by agent and file type
          over the last 30 days.
        </p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span className="label">Total requests</span>
          <span className="value">{summary.totalRequests.toLocaleString()}</span>
        </div>
        <div className="metric">
          <span className="label">Top agent</span>
          <span className="value" style={{ fontSize: 18 }}>
            {topAgent ? `${topAgent[0]} · ${topAgent[1]}` : "—"}
          </span>
        </div>
        <div className="metric">
          <span className="label">Top file</span>
          <span className="value" style={{ fontSize: 18 }}>
            {topFile ? `${topFile[0]} · ${topFile[1]}` : "—"}
          </span>
        </div>
      </div>

      <h3>By agent</h3>
      <ul className="kv-list">
        {Object.entries(summary.byAgent ?? {}).map(([agent, count]) => (
          <li key={agent}>
            <span>{agent}</span>
            <strong>{String(count)}</strong>
          </li>
        ))}
      </ul>

      <h3>By file type</h3>
      <ul className="kv-list">
        {Object.entries(summary.byFile ?? {}).map(([file, count]) => (
          <li key={file}>
            <span>{file}</span>
            <strong>{String(count)}</strong>
          </li>
        ))}
      </ul>

      <h3>Daily buckets</h3>
      <ul className="kv-list">
        {(series ?? []).map((point) => (
          <li key={point.timestamp}>
            <span>{new Date(point.timestamp).toISOString().slice(0, 10)}</span>
            <strong>{point.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
