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

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getExpenseTransactions(transactions) {
  return transactions.filter((transaction) => transaction.type === "expense");
}

function buildCategoryData(transactions) {
  const totals = getExpenseTransactions(transactions).reduce((accumulator, transaction) => {
    accumulator[transaction.category] = (accumulator[transaction.category] ?? 0) + transaction.amount;
    return accumulator;
  }, {});

  const labels = Object.keys(totals);

  return {
    labels,
    datasets: [
      {
        data: labels.map((label) => totals[label]),
        backgroundColor: labels.map((label) => categoryColors[label] ?? categoryColors.Other),
        borderColor: "#ffffff",
        borderWidth: 3,
      },
    ],
  };
}

function buildTrendData(transactions) {
  const monthlyTotals = getExpenseTransactions(transactions).reduce((accumulator, transaction) => {
    const monthKey = transaction.date.slice(0, 7);
    accumulator[monthKey] = (accumulator[monthKey] ?? 0) + transaction.amount;
    return accumulator;
  }, {});

  const labels = Object.keys(monthlyTotals).sort();

  return {
    labels,
    datasets: [
      {
        label: "Monthly expenses",
        data: labels.map((label) => monthlyTotals[label]),
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
  const expenses = getExpenseTransactions(transactions);
  const hasExpenseData = expenses.length > 0;

  return (
    <section className="charts-grid" aria-label="Spending charts">
      <article className="panel chart-panel">
        <div className="panel-heading">
          <h2>Spending By Category</h2>
          <span>{expenses.length} expenses</span>
        </div>

        {hasExpenseData ? (
          <div className="chart-frame">
            <Pie data={buildCategoryData(transactions)} options={pieOptions} />
          </div>
        ) : (
          <div className="chart-empty">Add expenses to see category spending.</div>
        )}
      </article>

      <article className="panel chart-panel trend-panel">
        <div className="panel-heading">
          <h2>Monthly Spending Trend</h2>
          <span>Expenses</span>
        </div>

        {hasExpenseData ? (
          <div className="chart-frame">
            <Line data={buildTrendData(transactions)} options={lineOptions} />
          </div>
        ) : (
          <div className="chart-empty">Add expenses to see monthly trends.</div>
        )}
      </article>
    </section>
  );
}

