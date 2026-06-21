"""add bank accounts

Revision ID: 20260621_0003
Revises: 20260621_0002
Create Date: 2026-06-21
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260621_0003"
down_revision: str | None = "20260621_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("bank_connection_id", sa.Integer(), nullable=False),
        sa.Column("plaid_account_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("official_name", sa.String(length=255), nullable=True),
        sa.Column("type", sa.String(length=100), nullable=True),
        sa.Column("subtype", sa.String(length=100), nullable=True),
        sa.Column("mask", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["bank_connection_id"], ["bank_connections.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bank_accounts_bank_connection_id"), "bank_accounts", ["bank_connection_id"], unique=False)
    op.create_index(op.f("ix_bank_accounts_id"), "bank_accounts", ["id"], unique=False)
    op.create_index(op.f("ix_bank_accounts_plaid_account_id"), "bank_accounts", ["plaid_account_id"], unique=True)
    op.create_index(op.f("ix_bank_accounts_user_id"), "bank_accounts", ["user_id"], unique=False)

    op.add_column("transactions", sa.Column("bank_account_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_transactions_bank_account_id_bank_accounts",
        "transactions",
        "bank_accounts",
        ["bank_account_id"],
        ["id"],
    )
    op.create_index(op.f("ix_transactions_bank_account_id"), "transactions", ["bank_account_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transactions_bank_account_id"), table_name="transactions")
    op.drop_constraint("fk_transactions_bank_account_id_bank_accounts", "transactions", type_="foreignkey")
    op.drop_column("transactions", "bank_account_id")

    op.drop_index(op.f("ix_bank_accounts_user_id"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_plaid_account_id"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_id"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_bank_connection_id"), table_name="bank_accounts")
    op.drop_table("bank_accounts")
