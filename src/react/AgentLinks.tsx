// Tiny dependency-free footer nav advertising the agent discovery files.
// Renders two visible anchors (llms.txt and the per-site markdown file) so both
// humans and crawlers find them. Muted styling by default, override via
// className. Also injects the HTML alternate <link> into document.head (shared
// code path with the widget fallback, deduped by href).

import { useEffect } from "react";
import { injectMarkdownAlternateLink } from "../client/headInjection.js";

export type AgentLinksProps = {
  /** Path to the llms.txt file. Default: "/llms.txt". */
  llmsTxtPath?: string;
  /** Path to the per-site markdown file. Default: "/site.md". */
  siteMdPath?: string;
  /** Optional class name. When set, the muted inline styles are skipped. */
  className?: string;
  /**
   * Inject <link rel="alternate" type="text/markdown"> into document.head on
   * mount so dropping the footer in also satisfies the discovery tag. Deduped
   * by href. Default: true.
   */
  injectHeadLink?: boolean;
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: 11,
  letterSpacing: "0.08em",
};

const anchorStyle: React.CSSProperties = {
  color: "#888888",
  textDecoration: "none",
};

export function AgentLinks(props: AgentLinksProps) {
  const llmsTxtPath = props.llmsTxtPath ?? "/llms.txt";
  const siteMdPath = props.siteMdPath ?? "/site.md";
  const injectHeadLink = props.injectHeadLink ?? true;
  const siteMdLabel = siteMdPath.replace(/^\//, "");

  useEffect(() => {
    if (!injectHeadLink) return;
    injectMarkdownAlternateLink(siteMdPath);
  }, [injectHeadLink, siteMdPath]);

  const styled = props.className === undefined;
  return (
    <nav
      aria-label="AI agent resources"
      className={props.className ?? "agent-links"}
      style={styled ? navStyle : undefined}
    >
      <a href={llmsTxtPath} rel="describedby" style={styled ? anchorStyle : undefined}>
        llms.txt
      </a>
      <a
        href={siteMdPath}
        rel="alternate"
        type="text/markdown"
        style={styled ? anchorStyle : undefined}
      >
        {siteMdLabel}
      </a>
    </nav>
  );
}
