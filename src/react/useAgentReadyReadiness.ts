import { useEffect, useRef, useState } from "react";
import type { ReadinessReport } from "../client/types.js";

const DEFAULT_POLL_MS = 60_000;

export type UseAgentReadyReadinessOptions = {
  appUrl: string;
  readinessPath?: string;
  pollIntervalMs?: number;
};

export function useAgentReadyReadiness(
  options: UseAgentReadyReadinessOptions,
): ReadinessReport | null {
  const {
    appUrl,
    readinessPath = "/llms-readiness",
    pollIntervalMs = DEFAULT_POLL_MS,
  } = options;
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const url = `${appUrl.replace(/\/$/, "")}${readinessPath}`;
    const fetchOnce = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as ReadinessReport;
        if (!cancelled.current) setReport(body);
      } catch {
        // Widget degrades gracefully when readiness endpoint is unreachable.
      }
    };
    void fetchOnce();
    const handle = setInterval(fetchOnce, pollIntervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(handle);
    };
  }, [appUrl, readinessPath, pollIntervalMs]);

  return report;
}
