import React from "react";
import { Landmark, LogOut, Moon, PlusCircle, RotateCcw, Sun, X } from "lucide-react";

export default function AppMenu({
  activeFilterCount,
  isOpen,
  onAddTransaction,
  onConnectBank,
  onClose,
  onResetFilters,
  onToggleTheme,
  onLogout,
  theme,
  user,
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
            <h2>{user?.username ?? "Options"}</h2>
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

        <button
          className="drawer-action"
          onClick={() => {
            onConnectBank();
            onClose();
          }}
          type="button"
        >
          <Landmark aria-hidden="true" size={18} />
          Connect bank
        </button>

        <button className="drawer-action" onClick={onResetFilters} type="button">
          <RotateCcw aria-hidden="true" size={18} />
          Reset filters
        </button>

        <button className="drawer-action danger" onClick={onLogout} type="button">
          <LogOut aria-hidden="true" size={18} />
          Logout
        </button>

        <div className="drawer-note">
          <span>{activeFilterCount}</span>
          <p>active filters</p>
        </div>
      </aside>
    </div>
  );
}
