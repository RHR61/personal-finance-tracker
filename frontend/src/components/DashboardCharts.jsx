import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import React, { useState } from "react";
import { Line, Pie } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const categoryColors = {
  Food: "#2563eb",
  Rent: "#10b981",
  Entertainment: "#f59e0b",
  Transportation: "#ef4444",
  Utilities: "#8b5cf6",
  Other: "#64748b",
};

const typeColors = {
  income: "#059669",
  expense: "#dc2626",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getExpenseTransactions(transactions) {
  return transactions.filter((transaction) => transaction.type === "expense");
}

function formatTrendLabel(key, trendPeriod) {
  if (trendPeriod === "daily") {
    return key;
  }

  if (trendPeriod === "yearly") {
    return key;
  }

  const [year, month] = key.split("-");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1));
}

function getTrendKey(date, trendPeriod) {
  if (trendPeriod === "daily") {
    return date;
  }

  if (trendPeriod === "yearly") {
    return date.slice(0, 4);
  }

  return date.slice(0, 7);
}

function buildPieData(transactions, pieMode) {
  const sourceTransactions = pieMode === "type" ? transactions : getExpenseTransactions(transactions);

  const totals = sourceTransactions.reduce((accumulator, transaction) => {
    const key = pieMode === "type" ? transaction.type : transaction.category;
    accumulator[key] = (accumulator[key] ?? 0) + transaction.amount;
    return accumulator;
  }, {});

  const labels = Object.keys(totals);
  const palette = pieMode === "type" ? typeColors : categoryColors;

  return {
    labels,
    datasets: [
      {
        data: labels.map((label) => totals[label]),
        backgroundColor: labels.map((label) => palette[label] ?? categoryColors.Other),
        borderColor: "#ffffff",
        borderWidth: 3,
      },
    ],
  };
}

function buildTrendData(transactions, trendPeriod) {
  const trendTotals = getExpenseTransactions(transactions).reduce((accumulator, transaction) => {
    const trendKey = getTrendKey(transaction.date, trendPeriod);
    accumulator[trendKey] = (accumulator[trendKey] ?? 0) + transaction.amount;
    return accumulator;
  }, {});

  const keys = Object.keys(trendTotals).sort();

  return {
    labels: keys.map((key) => formatTrendLabel(key, trendPeriod)),
    datasets: [
      {
        label: `${trendPeriod[0].toUpperCase()}${trendPeriod.slice(1)} expenses`,
        data: keys.map((key) => trendTotals[key]),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        borderWidth: 3,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.35,
        fill: true,
      },
    ],
  };
}

const sharedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 12,
        color: "#465568",
        font: {
          weight: 700,
        },
      },
    },
    tooltip: {
      callbacks: {
        label(context) {
          const label = context.label || context.dataset.label || "";
          return `${label}: ${currency.format(context.parsed.y ?? context.parsed)}`;
        },
      },
    },
  },
};

const lineOptions = {
  ...sharedOptions,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: "#64748b",
        font: {
          weight: 700,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "#edf2f7",
      },
      ticks: {
        color: "#64748b",
        callback(value) {
          return currency.format(value);
        },
      },
    },
  },
};

const pieOptions = {
  ...sharedOptions,
  plugins: {
    ...sharedOptions.plugins,
    legend: {
      ...sharedOptions.plugins.legend,
      position: "bottom",
    },
  },
};

export default function DashboardCharts({ transactions }) {
  const [pieMode, setPieMode] = useState("category");
  const [trendPeriod, setTrendPeriod] = useState("monthly");
  const expenses = getExpenseTransactions(transactions);
  const hasExpenseData = expenses.length > 0;
  const hasPieData = pieMode === "type" ? transactions.length > 0 : hasExpenseData;
  const pieTitle = pieMode === "type" ? "Cash Flow By Type" : "Spending By Category";

  return (
    <section className="charts-grid" aria-label="Spending charts">
      <article className="panel chart-panel">
        <div className="panel-heading">
          <h2>{pieTitle}</h2>
          <span>{pieMode === "type" ? `${transactions.length} entries` : `${expenses.length} expenses`}</span>
        </div>

        <div className="chart-controls" aria-label="Pie chart mode">
          <button
            className={pieMode === "category" ? "active" : ""}
            onClick={() => setPieMode("category")}
            type="button"
          >
            Category
          </button>
          <button
            className={pieMode === "type" ? "active" : ""}
            onClick={() => setPieMode("type")}
            type="button"
          >
            Type
          </button>
        </div>

        {hasPieData ? (
          <div className="chart-frame">
            <Pie data={buildPieData(transactions, pieMode)} options={pieOptions} />
          </div>
        ) : (
          <div className="chart-empty">
            {pieMode === "type"
              ? "Add transactions to see income and expenses."
              : "Add expenses to see category spending."}
          </div>
        )}
      </article>

      <article className="panel chart-panel trend-panel">
        <div className="panel-heading">
          <h2>Spending Trend</h2>
          <span>Expenses</span>
        </div>

        <div className="chart-controls" aria-label="Trend period">
          {["daily", "monthly", "yearly"].map((period) => (
            <button
              className={trendPeriod === period ? "active" : ""}
              key={period}
              onClick={() => setTrendPeriod(period)}
              type="button"
            >
              {period}
            </button>
          ))}
        </div>

        {hasExpenseData ? (
          <div className="chart-frame">
            <Line data={buildTrendData(transactions, trendPeriod)} options={lineOptions} />
          </div>
        ) : (
          <div className="chart-empty">Add expenses to see spending trends.</div>
        )}
      </article>
    </section>
  );
}
