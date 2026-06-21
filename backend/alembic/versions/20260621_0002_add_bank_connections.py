"""add bank connections

Revision ID: 20260621_0002
Revises: 20260621_0001
Create Date: 2026-06-21
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260621_0002"
down_revision: str | None = "20260621_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("plaid_transaction_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_transactions_plaid_transaction_id"),
        "transactions",
        ["plaid_transaction_id"],
        unique=True,
    )

    op.create_table(
        "bank_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("access_token", sa.String(length=512), nullable=False),
        sa.Column("item_id", sa.String(length=255), nullable=False),
        sa.Column("institution_id", sa.String(length=255), nullable=True),
        sa.Column("institution_name", sa.String(length=255), nullable=True),
        sa.Column("cursor", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bank_connections_id"), "bank_connections", ["id"], unique=False)
    op.create_index(op.f("ix_bank_connections_item_id"), "bank_connections", ["item_id"], unique=True)
    op.create_index(op.f("ix_bank_connections_user_id"), "bank_connections", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bank_connections_user_id"), table_name="bank_connections")
    op.drop_index(op.f("ix_bank_connections_item_id"), table_name="bank_connections")
    op.drop_index(op.f("ix_bank_connections_id"), table_name="bank_connections")
    op.drop_table("bank_connections")

    op.drop_index(op.f("ix_transactions_plaid_transaction_id"), table_name="transactions")
    op.drop_column("transactions", "plaid_transaction_id")
