import React, { useEffect, useMemo, useState } from "react";
import { Menu, Moon, PlusCircle, Sun } from "lucide-react";

import AppMenu from "./components/AppMenu.jsx";
import AuthPage from "./components/AuthPage.jsx";
import DashboardCharts from "./components/DashboardCharts.jsx";
import InsightStrip from "./components/InsightStrip.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import TransactionFilters from "./components/TransactionFilters.jsx";
import TransactionModal from "./components/TransactionModal.jsx";
import TransactionTable from "./components/TransactionTable.jsx";
import {
  createTransaction,
  deleteTransaction,
  getCurrentUser,
  getDashboardSummary,
  getTransactions,
  loginUser,
  registerUser,
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
  const [token, setToken] = useState(() => localStorage.getItem("authToken") ?? "");
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  });
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

    if (!token) {
      setTransactions([]);
      setSummary(emptySummary);
      setIsLoading(false);
      return;
    }

    try {
      const [transactionData, summaryData] = await Promise.all([
        getTransactions({ ...currentFilters, token }),
        getDashboardSummary(token),
      ]);

      setTransactions(transactionData);
      setSummary(summaryData);
    } catch (requestError) {
      setError("Could not load finance data. Login again or make sure the FastAPI server is running.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboard(filters);
    }
  }, [filters, token]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    async function syncCurrentUser() {
      if (!token || user) {
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        setUser(currentUser);
        localStorage.setItem("authUser", JSON.stringify(currentUser));
      } catch (requestError) {
        handleLogout();
      }
    }

    syncCurrentUser();
  }, [token, user]);

  async function handleCreateTransaction(transaction) {
    setIsSubmitting(true);
    setError("");

    try {
      await createTransaction(transaction, token);
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
      await deleteTransaction(id, token);
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

  function handleAuthSuccess(authResponse) {
    setToken(authResponse.access_token);
    setUser(authResponse.user);
    localStorage.setItem("authToken", authResponse.access_token);
    localStorage.setItem("authUser", JSON.stringify(authResponse.user));
    setError("");
  }

  async function handleLogin(credentials) {
    try {
      handleAuthSuccess(await loginUser(credentials));
    } catch (requestError) {
      setError(requestError.message || "Login failed. Check your username/email and password.");
    }
  }

  async function handleRegister(newUser) {
    try {
      handleAuthSuccess(await registerUser(newUser));
    } catch (requestError) {
      setError(requestError.message || "Registration failed. Try another username or email.");
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setTransactions([]);
    setSummary(emptySummary);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setIsMenuOpen(false);
  }

  if (!token) {
    return <AuthPage error={error} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p>Personal Finance Tracker</p>
          <h1>{user ? `${user.username}'s Dashboard` : "Dashboard"}</h1>
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
        onLogout={handleLogout}
        theme={theme}
        user={user}
      />
    </main>
  );
}
