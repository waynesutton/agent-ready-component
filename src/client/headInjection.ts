// Browser-only helper shared by the React and Svelte widgets and AgentLinks.
// Injects <link rel="alternate" type="text/markdown"> into document.head so
// crawlers that read the DOM discover the per-site markdown file even when the
// host app cannot edit its HTML template. Deduped by href. No-op on the server.

export function injectMarkdownAlternateLink(
  href: string,
  title = "Markdown version",
): void {
  if (!href) return;
  if (typeof document === "undefined" || !document.head) return;
  const existing = document.head.querySelectorAll(
    'link[rel="alternate"][type="text/markdown"]',
  );
  for (const el of Array.from(existing)) {
    if (el.getAttribute("href") === href) return;
  }
  const link = document.createElement("link");
  link.rel = "alternate";
  link.type = "text/markdown";
  link.href = href;
  link.title = title;
  document.head.appendChild(link);
}
