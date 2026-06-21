import { Banknote, TrendingDown, Wallet } from "lucide-react";
import React from "react";

import AnimatedCurrency from "./AnimatedCurrency.jsx";

function getSummaryLabels(source, account) {
  if (!source.startsWith("account:") || !account) {
    return {
      income: "Total income",
      expenses: "Total expenses",
      balance: "Remaining balance",
    };
  }

  const subtype = (account.subtype ?? "").replace("_", " ");
  const type = account.type ?? "";

  if (["hsa", "money market", "savings", "investment", "brokerage"].includes(subtype) || type === "investment") {
    return {
      income: "Money in",
      expenses: "Money out",
      balance: "Net movement",
    };
  }

  if (type === "credit" || subtype === "credit card") {
    return {
      income: "Credits",
      expenses: "Charges",
      balance: "Net card activity",
    };
  }

  return {
    income: "Total income",
    expenses: "Total expenses",
    balance: "Remaining balance",
  };
}

export default function SummaryCards({ account, source, summary }) {
  const labels = getSummaryLabels(source, account);
  const cards = [
    {
      label: labels.income,
      value: summary.total_income,
      icon: Banknote,
      tone: "income",
    },
    {
      label: labels.expenses,
      value: summary.total_expenses,
      icon: TrendingDown,
      tone: "expense",
    },
    {
      label: labels.balance,
      value: summary.remaining_balance,
      icon: Wallet,
      tone: summary.remaining_balance >= 0 ? "income" : "expense",
    },
  ];

  return (
    <section className="summary-grid" aria-label="Dashboard summary">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article className={`summary-card ${card.tone}`} key={card.label}>
            <div>
              <p>{card.label}</p>
              <strong>
                <AnimatedCurrency value={card.value} />
              </strong>
            </div>
            <Icon aria-hidden="true" size={24} />
          </article>
        );
      })}
    </section>
  );
}
