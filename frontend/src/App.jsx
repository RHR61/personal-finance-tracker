import React, { useEffect, useMemo, useState } from "react";
import { Menu, Moon, PlusCircle, Sun } from "lucide-react";

import AppMenu from "./components/AppMenu.jsx";
import AuthPage from "./components/AuthPage.jsx";
import BankConnections from "./components/BankConnections.jsx";
import CollapsibleSection from "./components/CollapsibleSection.jsx";
import DashboardCharts from "./components/DashboardCharts.jsx";
import InsightStrip from "./components/InsightStrip.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import TransactionFilters from "./components/TransactionFilters.jsx";
import TransactionModal from "./components/TransactionModal.jsx";
import TransactionTable from "./components/TransactionTable.jsx";
import {
  createPlaidLinkToken,
  createTransaction,
  deleteTransaction,
  disconnectBankConnection,
  exchangePlaidPublicToken,
  getBankConnections,
  getCurrentUser,
  getDashboardSummaryForSource,
  getTransactions,
  loginUser,
  registerUser,
  resetStandaloneTransactions,
  syncBankTransactions,
} from "./lib/api.js";

const emptyFilters = {
  category: "",
  type: "",
  startDate: "",
  endDate: "",
  source: "all",
};

const emptySummary = {
  total_income: 0,
  total_expenses: 0,
  remaining_balance: 0,
};

const defaultCategories = ["Food", "Rent", "Entertainment", "Transportation", "Utilities", "Other"];

export default function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [summary, setSummary] = useState(emptySummary);
  const [transactions, setTransactions] = useState([]);
  const [sourceTransactions, setSourceTransactions] = useState([]);
  const [bankConnections, setBankConnections] = useState([]);
  const [bankStatus, setBankStatus] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") ?? "light");
  const [token, setToken] = useState(() => localStorage.getItem("authToken") ?? "");
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBankSyncing, setIsBankSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    insights: false,
    charts: false,
    filters: false,
  });
  const [error, setError] = useState("");

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        if (!value) return false;
        if (key === "source" && value === "all") return false;
        return true;
      }).length,
    [filters],
  );

  const selectedAccount = useMemo(() => {
    if (!filters.source.startsWith("account:")) {
      return null;
    }

    const accountId = Number(filters.source.split(":", 2)[1]);
    return bankConnections.flatMap((connection) => connection.accounts).find((account) => account.id === accountId) ?? null;
  }, [bankConnections, filters.source]);

  const categoryOptions = useMemo(() => {
    const dynamicCategories = [...new Set(sourceTransactions.map((transaction) => transaction.category).filter(Boolean))].sort(
      (first, second) => first.localeCompare(second),
    );
    return dynamicCategories.length ? dynamicCategories : defaultCategories;
  }, [sourceTransactions]);

  async function loadDashboard(currentFilters = filters) {
    setIsLoading(true);
    setError("");

    if (!token) {
      setTransactions([]);
      setSourceTransactions([]);
      setSummary(emptySummary);
      setBankConnections([]);
      setIsLoading(false);
      return;
    }

    try {
      const sourceOnlyFilters = { source: currentFilters.source };
      const [transactionData, sourceTransactionData, summaryData] = await Promise.all([
        getTransactions({ ...currentFilters, token }),
        getTransactions({ ...sourceOnlyFilters, token }),
        getDashboardSummaryForSource(token, currentFilters.source),
      ]);

      setTransactions(transactionData);
      setSourceTransactions(sourceTransactionData);
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
    if (token) {
      loadBankConnections();
    }
  }, [token]);

  useEffect(() => {
    if (filters.category && categoryOptions.length > 0 && !categoryOptions.includes(filters.category)) {
      setFilters((current) => ({ ...current, category: "" }));
    }
  }, [categoryOptions, filters.category]);

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

  async function loadBankConnections() {
    if (!token) {
      setBankConnections([]);
      return;
    }

    try {
      setBankConnections(await getBankConnections(token));
    } catch (requestError) {
      setBankStatus(requestError.message);
    }
  }

  async function loadPlaidScript() {
    if (window.Plaid) {
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load Plaid Link."));
      document.body.appendChild(script);
    });
  }

  async function handleConnectBank() {
    setIsBankSyncing(true);
    setBankStatus("");

    try {
      await loadPlaidScript();
      const { link_token: linkToken } = await createPlaidLinkToken(token);

      const plaidHandler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken, metadata) => {
          setBankStatus("Connecting account...");
          const institution = metadata.institution
            ? {
                institution_id: metadata.institution.institution_id,
                name: metadata.institution.name,
              }
            : null;

          const result = await exchangePlaidPublicToken(
            { public_token: publicToken, institution },
            token,
          );
          await Promise.all([loadBankConnections(), loadDashboard(filters)]);
          setBankStatus(`Synced ${result.added + result.modified} transactions.`);
          setIsBankSyncing(false);
        },
        onExit: (error) => {
          if (error) {
            setBankStatus(error.display_message || error.error_message || "Plaid Link closed with an error.");
          }
          setIsBankSyncing(false);
        },
      });

      plaidHandler.open();
    } catch (requestError) {
      setBankStatus(requestError.message || "Could not connect bank account.");
      setIsBankSyncing(false);
    }
  }

  async function handleSyncBank() {
    setIsBankSyncing(true);
    setBankStatus("");

    try {
      const result = await syncBankTransactions(token);
      await Promise.all([loadBankConnections(), loadDashboard(filters)]);
      setBankStatus(`Synced ${result.added + result.modified} updates.`);
    } catch (requestError) {
      setBankStatus(requestError.message || "Could not sync bank transactions.");
    } finally {
      setIsBankSyncing(false);
    }
  }

  async function handleDisconnectBank(connectionId) {
    const connection = bankConnections.find((bankConnection) => bankConnection.id === connectionId);
    const connectionName = connection?.institution_name || "this bank connection";
    const shouldDisconnect = window.confirm(
      `Disconnect ${connectionName}? This removes imported transactions from that bank but keeps standalone transactions.`,
    );
    if (!shouldDisconnect) {
      return;
    }

    setIsBankSyncing(true);
    setBankStatus("");

    try {
      await disconnectBankConnection(connectionId, token);
      setFilters((current) => ({ ...current, source: "standalone" }));
      await Promise.all([loadBankConnections(), loadDashboard({ ...filters, source: "standalone" })]);
      setBankStatus("Disconnected bank account and returned to standalone tracking.");
    } catch (requestError) {
      setBankStatus(requestError.message || "Could not disconnect bank account.");
    } finally {
      setIsBankSyncing(false);
    }
  }

  async function handleResetStandalone() {
    const shouldReset = window.confirm(
      "Reset standalone data? This removes manually added transactions and keeps connected bank data.",
    );
    if (!shouldReset) {
      return;
    }

    setIsBankSyncing(true);
    setBankStatus("");

    try {
      await resetStandaloneTransactions(token, true);
      setFilters((current) => ({ ...current, source: "standalone" }));
      await loadDashboard({ ...filters, source: "standalone" });
      setBankStatus("Standalone data reset.");
    } catch (requestError) {
      setBankStatus(requestError.message || "Could not reset standalone data.");
    } finally {
      setIsBankSyncing(false);
    }
  }

  function resetFilters() {
    setFilters(emptyFilters);
  }

  function toggleSection(section) {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
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
    setSourceTransactions([]);
    setSummary(emptySummary);
    setBankConnections([]);
    setBankStatus("");
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

      <BankConnections
        connections={bankConnections}
        isSyncing={isBankSyncing}
        onConnectBank={handleConnectBank}
        onDisconnectBank={handleDisconnectBank}
        onResetStandalone={handleResetStandalone}
        onSyncBank={handleSyncBank}
        onSourceChange={(source) => setFilters((current) => ({ ...current, category: "", source }))}
        selectedSource={filters.source}
        status={bankStatus}
      />

      <SummaryCards account={selectedAccount} source={filters.source} summary={summary} />

      <CollapsibleSection
        isCollapsed={collapsedSections.insights}
        onToggle={() => toggleSection("insights")}
        title="Insights"
      >
        <InsightStrip account={selectedAccount} source={filters.source} summary={summary} transactions={transactions} />
      </CollapsibleSection>

      <CollapsibleSection
        isCollapsed={collapsedSections.charts}
        onToggle={() => toggleSection("charts")}
        title="Charts"
      >
        <DashboardCharts transactions={transactions} />
      </CollapsibleSection>

      <CollapsibleSection
        isCollapsed={collapsedSections.filters}
        onToggle={() => toggleSection("filters")}
        title="Filters"
      >
        <section className="workspace controls-workspace">
          <TransactionFilters
            categories={categoryOptions}
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
          />
        </section>
      </CollapsibleSection>

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
        onConnectBank={handleConnectBank}
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
