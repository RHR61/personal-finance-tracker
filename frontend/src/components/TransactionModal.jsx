import React from "react";
import { X } from "lucide-react";

import TransactionForm from "./TransactionForm.jsx";

export default function TransactionModal({ isOpen, isSubmitting, onClose, onSubmit }) {
  if (!isOpen) {
    return null;
  }

  async function handleSubmit(transaction) {
    await onSubmit(transaction);
    onClose();
  }

  return (
    <div className="modal-layer" role="presentation">
      <button className="modal-backdrop" onClick={onClose} type="button" aria-label="Close modal" />
      <section className="modal-panel" aria-modal="true" role="dialog">
        <div className="modal-header">
          <div>
            <p>New Entry</p>
            <h2>Add Transaction</h2>
          </div>
          <button className="icon-button neutral" onClick={onClose} type="button" aria-label="Close">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <TransactionForm isPanel={false} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </section>
    </div>
  );
}

