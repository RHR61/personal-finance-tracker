from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    bank_connections: Mapped[list["BankConnection"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    bank_account_id: Mapped[int | None] = mapped_column(ForeignKey("bank_accounts.id"), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float)
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    type: Mapped[TransactionType] = mapped_column(String(20), index=True)
    plaid_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship(back_populates="transactions")
    bank_account: Mapped["BankAccount | None"] = relationship(back_populates="transactions")

    @property
    def source_name(self) -> str:
        if self.bank_account is None:
            return "Standalone"
        return self.bank_account.display_name


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    access_token: Mapped[str] = mapped_column(String(512))
    item_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    institution_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    institution_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cursor: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[User] = relationship(back_populates="bank_connections")
    accounts: Mapped[list["BankAccount"]] = relationship(
        back_populates="connection",
        cascade="all, delete-orphan",
    )


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    bank_connection_id: Mapped[int] = mapped_column(ForeignKey("bank_connections.id"), index=True)
    plaid_account_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    official_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subtype: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mask: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    connection: Mapped[BankConnection] = relationship(back_populates="accounts")
    transactions: Mapped[list[Transaction]] = relationship(back_populates="bank_account")

    @property
    def display_name(self) -> str:
        if self.mask:
            return f"{self.name} •••• {self.mask}"
        return self.name
