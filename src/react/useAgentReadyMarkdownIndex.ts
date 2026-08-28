import { useEffect, useRef, useState } from "react";
import type { MarkdownIndexEntry } from "../client/types.js";

const DEFAULT_POLL_MS = 60_000;

export type UseAgentReadyMarkdownIndexOptions = {
  appUrl: string;
  markdownIndexPath?: string;
  pollIntervalMs?: number;
  enabled?: boolean;
};

type MarkdownIndexResponse = {
  pages: Array<MarkdownIndexEntry>;
  generatedAt: number;
};

export function useAgentReadyMarkdownIndex(
  options: UseAgentReadyMarkdownIndexOptions,
): Array<MarkdownIndexEntry> | null {
  const {
    appUrl,
    markdownIndexPath = "/llms-markdown-index",
    pollIntervalMs = DEFAULT_POLL_MS,
    enabled = true,
  } = options;
  const [pages, setPages] = useState<Array<MarkdownIndexEntry> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setPages(null);
      return;
    }
    cancelled.current = false;
    const url = `${appUrl.replace(/\/$/, "")}${markdownIndexPath}`;
    const fetchOnce = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as MarkdownIndexResponse;
        if (!cancelled.current) setPages(body.pages ?? []);
      } catch {
        // Widget degrades when index endpoint is unreachable.
      }
    };
    void fetchOnce();
    const handle = setInterval(fetchOnce, pollIntervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(handle);
    };
  }, [appUrl, markdownIndexPath, pollIntervalMs, enabled]);

  return pages;
}
