import { Banknote, TrendingDown, Wallet } from "lucide-react";
import React from "react";

import AnimatedCurrency from "./AnimatedCurrency.jsx";

export default function SummaryCards({ summary }) {
  const cards = [
    {
      label: "Total income",
      value: summary.total_income,
      icon: Banknote,
      tone: "income",
    },
    {
      label: "Total expenses",
      value: summary.total_expenses,
      icon: TrendingDown,
      tone: "expense",
    },
    {
      label: "Remaining balance",
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
