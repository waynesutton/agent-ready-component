import type { ReactNode } from "react";

interface WindowProps {
  filename: string;
  children: ReactNode;
  toolbar?: ReactNode;
}

export function Window({ filename, children, toolbar }: WindowProps) {
  return (
    <div className="window">
      <div className="window-titlebar">
        <div className="window-dots">
          <span className="window-dot red" />
          <span className="window-dot yellow" />
          <span className="window-dot green" />
        </div>
        <div className="window-title">{filename}</div>
        <div className="window-toolbar">{toolbar}</div>
      </div>
      <div className="window-body">{children}</div>
    </div>
  );
}
