import React from "react";
import { Landmark, Link2, PlugZap, RefreshCw } from "lucide-react";

function formatSyncDate(value) {
  if (!value) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BankConnections({
  connections,
  isSyncing,
  onConnectBank,
  onDisconnectBank,
  onResetStandalone,
  onSyncBank,
  onSourceChange,
  selectedSource,
  status,
}) {
  const latestSync = connections
    .map((connection) => connection.last_synced_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <section className="panel bank-panel">
      <div className="account-source-control">
        <label>
          Dashboard source
          <select onChange={(event) => onSourceChange(event.target.value)} value={selectedSource}>
            <option value="all">All accounts</option>
            <option value="standalone">Standalone only</option>
            {connections.flatMap((connection) =>
              connection.accounts.map((account) => (
                <option key={account.id} value={`account:${account.id}`}>
                  {account.display_name}
                </option>
              )),
            )}
          </select>
        </label>
      </div>

      <div className="bank-copy">
        <div className="bank-icon">
          <Landmark aria-hidden="true" size={22} />
        </div>
        <div>
          <p>Bank connections</p>
          <h2>{connections.length ? `${connections.length} connected` : "Connect an account"}</h2>
          <span>{connections.length ? `Last sync: ${formatSyncDate(latestSync)}` : "Use Plaid Sandbox for test bank data."}</span>
        </div>
      </div>

      <div className="bank-actions">
        <button className="secondary-button" disabled={isSyncing} onClick={onSyncBank} type="button">
          <RefreshCw aria-hidden="true" size={18} />
          Sync now
        </button>
        <button className="primary-button" disabled={isSyncing} onClick={onConnectBank} type="button">
          <Link2 aria-hidden="true" size={18} />
          Connect bank
        </button>
        <button className="secondary-button danger-soft" disabled={isSyncing} onClick={onResetStandalone} type="button">
          Reset standalone
        </button>
      </div>

      {connections.length ? (
        <div className="connected-account-list">
          {connections.map((connection) => (
            <div className="connected-account" key={connection.id}>
              <div>
                <strong>{connection.institution_name || "Connected institution"}</strong>
                <span>
                  {connection.accounts.length
                    ? connection.accounts.map((account) => account.display_name).join(", ")
                    : "Accounts loading"}
                </span>
              </div>
              <button
                className="secondary-button danger-soft"
                disabled={isSyncing}
                onClick={() => onDisconnectBank(connection.id)}
                type="button"
              >
                <PlugZap aria-hidden="true" size={16} />
                Disconnect
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {status ? <p className="bank-status">{status}</p> : null}
    </section>
  );
}
