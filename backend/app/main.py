from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Transaction, TransactionType
from .schemas import DashboardSummary, TransactionCreate, TransactionRead, TransactionUpdate


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Finance Tracker API")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Personal Finance Tracker API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/transactions",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
) -> Transaction:
    db_transaction = Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@app.get("/transactions", response_model=list[TransactionRead])
def list_transactions(
    category: str | None = Query(default=None),
    transaction_type: TransactionType | None = Query(default=None, alias="type"),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
) -> list[Transaction]:
    statement = select(Transaction)

    if category:
        statement = statement.where(Transaction.category == category)
    if transaction_type:
        statement = statement.where(Transaction.type == transaction_type)
    if start_date:
        statement = statement.where(Transaction.date >= start_date)
    if end_date:
        statement = statement.where(Transaction.date <= end_date)

    statement = statement.order_by(Transaction.date.desc(), Transaction.id.desc())
    return list(db.scalars(statement))


@app.get("/transactions/{transaction_id}", response_model=TransactionRead)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@app.patch("/transactions/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    updates = transaction_update.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return transaction


@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
) -> None:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()


@app.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    transactions = db.scalars(select(Transaction)).all()
    total_income = sum(item.amount for item in transactions if item.type == TransactionType.income)
    total_expenses = sum(item.amount for item in transactions if item.type == TransactionType.expense)

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        remaining_balance=total_income - total_expenses,
    )

