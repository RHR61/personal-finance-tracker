import React from "react";
import { Moon, PlusCircle, RotateCcw, Sun, X } from "lucide-react";

export default function AppMenu({
  activeFilterCount,
  isOpen,
  onAddTransaction,
  onClose,
  onResetFilters,
  onToggleTheme,
  theme,
}) {
  if (!isOpen) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={onClose} type="button" aria-label="Close menu" />
      <aside className="drawer-panel" aria-label="Application menu">
        <div className="drawer-header">
          <div>
            <p>Menu</p>
            <h2>Options</h2>
          </div>
          <button className="icon-button neutral" onClick={onClose} type="button" aria-label="Close menu">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <button
          className="drawer-action"
          onClick={() => {
            onAddTransaction();
            onClose();
          }}
          type="button"
        >
          <PlusCircle aria-hidden="true" size={18} />
          Add transaction
        </button>

        <button className="drawer-action" onClick={onToggleTheme} type="button">
          {isDark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </button>

        <button className="drawer-action" onClick={onResetFilters} type="button">
          <RotateCcw aria-hidden="true" size={18} />
          Reset filters
        </button>

        <div className="drawer-note">
          <span>{activeFilterCount}</span>
          <p>active filters</p>
        </div>
      </aside>
    </div>
  );
}

