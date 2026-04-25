import { useEffect, useState } from "react";
import type { AgentReadyStatus } from "../client/types.js";
import { useAgentReadyStatus } from "./useAgentReadyStatus.js";

export type UpdateBannerProps = {
  appUrl: string;
  message?: string;
  buttonText?: string;
  onRefresh?: () => void;
};

// Shows a "Content updated — refresh" prompt when the cached content version changes
// while the user is still on the page. Mirrors the static-hosting UpdateBanner pattern.
export function UpdateBanner(props: UpdateBannerProps) {
  const status: AgentReadyStatus | null = useAgentReadyStatus({ appUrl: props.appUrl });
  const [initialVersion, setInitialVersion] = useState<string | null>(null);

  useEffect(() => {
    if (status?.generatedFromVersion && initialVersion === null) {
      setInitialVersion(status.generatedFromVersion);
    }
  }, [status, initialVersion]);

  const isStale =
    status?.generatedFromVersion &&
    initialVersion &&
    status.generatedFromVersion !== initialVersion;

  if (!isStale) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        background: "#111111",
        color: "#e5e5e5",
        border: "1px solid #333333",
        borderRadius: 4,
        padding: "8px 16px",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 13,
        letterSpacing: "0.05em",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span>{props.message ?? "Content updated — refresh"}</span>
      <button
        type="button"
        onClick={() => (props.onRefresh ? props.onRefresh() : window.location.reload())}
        style={{
          background: "#2a2a2a",
          color: "#e5e5e5",
          border: "1px solid #444444",
          borderRadius: 3,
          padding: "4px 10px",
          fontFamily: "inherit",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {props.buttonText ?? "Refresh"}
      </button>
    </div>
  );
}
