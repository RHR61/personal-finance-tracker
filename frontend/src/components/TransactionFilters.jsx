import { Filter, RotateCcw } from "lucide-react";
import React from "react";

export default function TransactionFilters({ categories, filters, onChange, onReset }) {
  function updateFilter(event) {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  }

  return (
    <section className="panel filters">
      <div className="panel-heading">
        <h2>Filters</h2>
        <Filter aria-hidden="true" size={18} />
      </div>

      <label>
        Category
        <select name="category" onChange={updateFilter} value={filters.category}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label>
        Type
        <select name="type" onChange={updateFilter} value={filters.type}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>

      <label>
        Start date
        <input name="startDate" onChange={updateFilter} type="date" value={filters.startDate} />
      </label>

      <label>
        End date
        <input name="endDate" onChange={updateFilter} type="date" value={filters.endDate} />
      </label>

      <button className="secondary-button" onClick={onReset} type="button">
        <RotateCcw aria-hidden="true" size={16} />
        Reset
      </button>
    </section>
  );
}
