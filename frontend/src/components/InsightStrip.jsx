import { CalendarClock, Sparkles, Trophy } from "lucide-react";
import React from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getExpenseTransactions(transactions) {
  return transactions.filter((transaction) => transaction.type === "expense");
}

function getTopExpenseCategory(transactions) {
  const totals = getExpenseTransactions(transactions).reduce((accumulator, transaction) => {
    accumulator[transaction.category] = (accumulator[transaction.category] ?? 0) + transaction.amount;
    return accumulator;
  }, {});

  const [category, amount] =
    Object.entries(totals).sort((first, second) => second[1] - first[1])[0] ?? [];

  if (!category) {
    return "No expense categories yet";
  }

  return `${category} leads spending at ${currency.format(amount)}`;
}

function getLatestTransaction(transactions) {
  const latest = [...transactions].sort((first, second) => {
    return `${second.date}-${second.id}`.localeCompare(`${first.date}-${first.id}`);
  })[0];

  if (!latest) {
    return "No transactions recorded yet";
  }

  return `${latest.category} ${latest.type} on ${latest.date}`;
}

export default function InsightStrip({ summary, transactions }) {
  const savingsRate =
    summary.total_income > 0
      ? Math.round((summary.remaining_balance / summary.total_income) * 100)
      : null;

  const insights = [
    {
      icon: Sparkles,
      label: "Balance Signal",
      value:
        summary.remaining_balance >= 0
          ? `${currency.format(summary.remaining_balance)} left to allocate`
          : `${currency.format(Math.abs(summary.remaining_balance))} over income`,
    },
    {
      icon: Trophy,
      label: "Top Category",
      value: getTopExpenseCategory(transactions),
    },
    {
      icon: CalendarClock,
      label: "Latest Activity",
      value:
        savingsRate === null
          ? getLatestTransaction(transactions)
          : `${savingsRate}% of income remains`,
    },
  ];

  return (
    <section className="insight-strip" aria-label="Dashboard insights">
      {insights.map((insight) => {
        const Icon = insight.icon;

        return (
          <article className="insight-item" key={insight.label}>
            <Icon aria-hidden="true" size={18} />
            <div>
              <p>{insight.label}</p>
              <strong>{insight.value}</strong>
            </div>
          </article>
        );
      })}
    </section>
  );
}
