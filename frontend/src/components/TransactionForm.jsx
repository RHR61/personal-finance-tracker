import { PlusCircle } from "lucide-react";
import React, { useState } from "react";

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  amount: "",
  category: "Food",
  description: "",
  date: today,
  type: "expense",
};

export default function TransactionForm({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState(initialForm);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await onSubmit({
      user_id: null,
      amount: Number(form.amount),
      category: form.category,
      description: form.description.trim() || null,
      date: form.date,
      type: form.type,
    });

    setForm(initialForm);
  }

  return (
    <form className="panel transaction-form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <h2>Add Transaction</h2>
      </div>

      <label>
        Amount
        <input
          min="0.01"
          name="amount"
          onChange={updateField}
          placeholder="15.00"
          required
          step="0.01"
          type="number"
          value={form.amount}
        />
      </label>

      <label>
        Type
        <select name="type" onChange={updateField} value={form.type}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>

      <label>
        Category
        <select name="category" onChange={updateField} value={form.category}>
          <option>Food</option>
          <option>Rent</option>
          <option>Entertainment</option>
          <option>Transportation</option>
          <option>Utilities</option>
          <option>Other</option>
        </select>
      </label>

      <label>
        Date
        <input name="date" onChange={updateField} required type="date" value={form.date} />
      </label>

      <label className="full-width">
        Description
        <input
          name="description"
          onChange={updateField}
          placeholder="Lunch, paycheck, rent..."
          type="text"
          value={form.description}
        />
      </label>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        <PlusCircle aria-hidden="true" size={18} />
        {isSubmitting ? "Adding..." : "Add transaction"}
      </button>
    </form>
  );
}
