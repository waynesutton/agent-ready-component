import { useEffect, useRef, useState } from "react";
import type { AgentReadyStatus } from "../client/types.js";

// Default status polling interval. Kept generous to avoid hammering the status endpoint.
// When a ConvexReactClient is available callers should subscribe to the status query directly
// instead of polling.
const DEFAULT_POLL_MS = 30_000;

export type UseAgentReadyStatusOptions = {
  appUrl: string;
  statusPath?: string;
  pollIntervalMs?: number;
};

// Lightweight polling hook. Fetches `/llms-status` and returns the latest status payload.
// Consumers that already have a `ConvexReactClient` should use
// `useQuery(api.agentReady.content.getCacheStatus)` directly — this hook exists so the widget
// can stay framework-free.
export function useAgentReadyStatus(options: UseAgentReadyStatusOptions): AgentReadyStatus | null {
  const { appUrl, statusPath = "/llms-status", pollIntervalMs = DEFAULT_POLL_MS } = options;
  const [status, setStatus] = useState<AgentReadyStatus | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const url = `${appUrl.replace(/\/$/, "")}${statusPath}`;
    const fetchOnce = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as AgentReadyStatus;
        if (!cancelled.current) setStatus(body);
      } catch {
        // Swallow. Widget degrades gracefully when status endpoint is unreachable.
      }
    };
    void fetchOnce();
    const handle = setInterval(fetchOnce, pollIntervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(handle);
    };
  }, [appUrl, statusPath, pollIntervalMs]);

  return status;
}
