import { writable, type Readable } from "svelte/store";
import type { AgentReadyStatus } from "../client/types.js";

export type AgentReadyStatusStore = Readable<AgentReadyStatus | null>;

export type CreateStoreOptions = {
  appUrl: string;
  statusPath?: string;
  pollIntervalMs?: number;
};

// Polling-based Svelte store. Matches the shape of the React hook.
// Automatically starts polling when first subscribed, stops when the last subscriber unsubscribes.
export function createAgentReadyStatusStore(options: CreateStoreOptions): AgentReadyStatusStore {
  const url = `${options.appUrl.replace(/\/$/, "")}${options.statusPath ?? "/llms-status"}`;
  const interval = options.pollIntervalMs ?? 30_000;

  const store = writable<AgentReadyStatus | null>(null, (set) => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as AgentReadyStatus;
        if (!cancelled) set(body);
      } catch {
        // Silent failure. Store stays at last known value.
      }
    };
    void tick();
    const handle = setInterval(tick, interval);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  });

  return store;
}
