import { Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function TransactionTable({ transactions, onDelete }) {
  const [sortBy, setSortBy] = useState("transactionDate");

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((first, second) => {
      if (sortBy === "dateAdded") {
        return second.id - first.id;
      }

      const dateComparison = second.date.localeCompare(first.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return second.id - first.id;
    });
  }, [sortBy, transactions]);

  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <h2>Transaction History</h2>
        <div className="history-toolbar">
          <label>
            Sort by
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="transactionDate">Transaction date</option>
              <option value="dateAdded">Date added</option>
            </select>
          </label>
          <span>{transactions.length} total</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Source</th>
              <th>Description</th>
              <th>Type</th>
              <th className="amount-cell">Amount</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan="7">
                  No transactions found.
                </td>
              </tr>
            ) : (
              sortedTransactions.map((transaction, index) => (
                <tr key={transaction.id} style={{ "--row-index": index }}>
                  <td>{transaction.date}</td>
                  <td>{transaction.category}</td>
                  <td>{transaction.source_name || "Standalone"}</td>
                  <td>{transaction.description || "-"}</td>
                  <td>
                    <span className={`type-pill ${transaction.type}`}>{transaction.type}</span>
                  </td>
                  <td className={`amount-cell ${transaction.type}`}>
                    {currency.format(transaction.amount)}
                  </td>
                  <td className="action-cell">
                    <button
                      aria-label={`Delete transaction ${transaction.id}`}
                      className="icon-button"
                      onClick={() => onDelete(transaction.id)}
                      title="Delete transaction"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
