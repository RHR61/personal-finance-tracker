import React, { useEffect, useMemo, useState } from "react";
import { Menu, Moon, PlusCircle, Sun } from "lucide-react";

import AppMenu from "./components/AppMenu.jsx";
import DashboardCharts from "./components/DashboardCharts.jsx";
import InsightStrip from "./components/InsightStrip.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import TransactionFilters from "./components/TransactionFilters.jsx";
import TransactionModal from "./components/TransactionModal.jsx";
import TransactionTable from "./components/TransactionTable.jsx";
import {
  createTransaction,
  deleteTransaction,
  getDashboardSummary,
  getTransactions,
} from "./lib/api.js";

const emptyFilters = {
  category: "",
  type: "",
  startDate: "",
  endDate: "",
};

const emptySummary = {
  total_income: 0,
  total_expenses: 0,
  remaining_balance: 0,
};

export default function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [summary, setSummary] = useState(emptySummary);
  const [transactions, setTransactions] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") ?? "light");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  async function loadDashboard(currentFilters = filters) {
    setIsLoading(true);
    setError("");

    try {
      const [transactionData, summaryData] = await Promise.all([
        getTransactions(currentFilters),
        getDashboardSummary(),
      ]);

      setTransactions(transactionData);
      setSummary(summaryData);
    } catch (requestError) {
      setError("Could not load finance data. Make sure the FastAPI server is running.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(filters);
  }, [filters]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  async function handleCreateTransaction(transaction) {
    setIsSubmitting(true);
    setError("");

    try {
      await createTransaction(transaction);
      await loadDashboard(filters);
    } catch (requestError) {
      setError("Could not create the transaction. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTransaction(id) {
    setError("");

    try {
      await deleteTransaction(id);
      await loadDashboard(filters);
    } catch (requestError) {
      setError("Could not delete that transaction.");
    }
  }

  function resetFilters() {
    setFilters(emptyFilters);
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p>Personal Finance Tracker</p>
          <h1>Dashboard</h1>
        </div>
        <div className="header-actions">
          <span>{activeFilterCount} active filters</span>
          <button
            className="primary-button compact-action"
            onClick={() => setIsTransactionModalOpen(true)}
            type="button"
          >
            <PlusCircle aria-hidden="true" size={18} />
            Add
          </button>
          <button
            className="icon-button neutral menu-button"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" size={20} />
            ) : (
              <Moon aria-hidden="true" size={20} />
            )}
          </button>
          <button
            className="icon-button neutral menu-button"
            onClick={() => setIsMenuOpen(true)}
            type="button"
            aria-label="Open menu"
          >
            <Menu aria-hidden="true" size={20} />
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <SummaryCards summary={summary} />

      <InsightStrip summary={summary} transactions={transactions} />

      <DashboardCharts transactions={transactions} />

      <section className="workspace controls-workspace">
        <TransactionFilters filters={filters} onChange={setFilters} onReset={resetFilters} />
      </section>

      {isLoading ? (
        <section className="panel loading-panel">Loading transactions...</section>
      ) : (
        <TransactionTable transactions={transactions} onDelete={handleDeleteTransaction} />
      )}

      <TransactionModal
        isOpen={isTransactionModalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={handleCreateTransaction}
      />
      <AppMenu
        activeFilterCount={activeFilterCount}
        isOpen={isMenuOpen}
        onAddTransaction={() => setIsTransactionModalOpen(true)}
        onClose={() => setIsMenuOpen(false)}
        onResetFilters={resetFilters}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
    </main>
  );
}
