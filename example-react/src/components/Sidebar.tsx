import { Link, useLocation } from "react-router-dom";

interface SidebarLink {
  to: string;
  label: string;
  glyph: string;
}

const primary: Array<SidebarLink> = [
  { to: "/", label: "home.mdx", glyph: "#" },
  { to: "/docs", label: "docs.mdx", glyph: "?" },
  { to: "/settings", label: "settings.mdx", glyph: "=" },
  { to: "/analytics", label: "analytics.mdx", glyph: "~" },
];

const external: Array<{ href: string; label: string; glyph: string }> = [
  { href: "/llms.txt", label: "llms.txt", glyph: ">" },
  { href: "/agents.md", label: "agents.md", glyph: ">" },
  { href: "/llms-full.txt", label: "llms-full.txt", glyph: ">" },
  { href: "/llms-status", label: "llms-status", glyph: ">" },
];


interface SidebarProps {
  appUrl: string;
}

export function Sidebar({ appUrl }: SidebarProps) {
  const location = useLocation();
  return (
    <aside className="sidebar">
      <div className="sidebar-section">Project</div>
      {primary.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar-item${active ? " active" : ""}`}
          >
            <span className="sidebar-icon">{item.glyph}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="sidebar-divider" />

      <div className="sidebar-section">Live files</div>
      {external.map((item) => (
        <a
          key={item.href}
          href={`${appUrl}${item.href}`}
          target="_blank"
          rel="noreferrer"
          className="sidebar-item"
        >
          <span className="sidebar-icon">{item.glyph}</span>
          <span>{item.label}</span>
        </a>
      ))}

      <div className="sidebar-divider" />

      <Link
        to="/resources"
        className={`sidebar-item${location.pathname === "/resources" ? " active" : ""}`}
      >
        <span className="sidebar-icon">&rarr;</span>
        <span>Resources</span>
      </Link>
    </aside>
  );
}
