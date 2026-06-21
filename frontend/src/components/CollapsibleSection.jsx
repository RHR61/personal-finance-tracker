import React from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({ children, isCollapsed, onToggle, title }) {
  return (
    <section className={`collapsible-section ${isCollapsed ? "is-collapsed" : ""}`}>
      <button className="section-toggle" onClick={onToggle} type="button">
        <span>{title}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {isCollapsed ? null : <div className="section-body">{children}</div>}
    </section>
  );
}
