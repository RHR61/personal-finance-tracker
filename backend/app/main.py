from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import get_db
from .models import Transaction, TransactionType, User
from .schemas import (
    DashboardSummary,
    Token,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    UserCreate,
    UserLogin,
    UserRead,
)


app = FastAPI(title="Personal Finance Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Personal Finance Tracker API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)) -> Token:
    username = user.username.strip()
    email = user.email.strip().lower()

    existing_user = db.scalar(
        select(User).where((User.email == email) | (User.username == username))
    )
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    db_user = User(
        username=username,
        email=email,
        password_hash=hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return Token(access_token=create_access_token(db_user.id), user=db_user)


@app.post("/auth/login", response_model=Token)
def login_user(user: UserLogin, db: Session = Depends(get_db)) -> Token:
    identifier = user.identifier.strip()
    db_user = db.scalar(
        select(User).where((User.email == identifier.lower()) | (User.username == identifier))
    )
    if db_user is None or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")

    return Token(access_token=create_access_token(db_user.id), user=db_user)


@app.get("/auth/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@app.post(
    "/transactions",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    db_transaction = Transaction(**transaction.model_dump(), user_id=current_user.id)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    statement = select(Transaction).where(Transaction.user_id == current_user.id)

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None or transaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@app.patch("/transactions/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None or transaction.user_id != current_user.id:
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None or transaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()


@app.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    total_income = sum(item.amount for item in transactions if item.type == TransactionType.income)
    total_expenses = sum(item.amount for item in transactions if item.type == TransactionType.expense)

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        remaining_balance=total_income - total_expenses,
    )
