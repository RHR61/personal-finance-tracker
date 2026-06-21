import os
from datetime import date, datetime

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import get_db
from .models import BankAccount, BankConnection, Transaction, TransactionType, User
from .plaid_client import plaid_request
from .schemas import (
    BankConnectionRead,
    BankSyncResult,
    DashboardSummary,
    PlaidExchangeRequest,
    PlaidLinkToken,
    Token,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    UserCreate,
    UserLogin,
    UserRead,
)


app = FastAPI(title="Personal Finance Tracker API")

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *frontend_origins,
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


@app.post("/bank/link-token", response_model=PlaidLinkToken)
def create_bank_link_token(current_user: User = Depends(get_current_user)) -> PlaidLinkToken:
    response = plaid_request(
        "/link/token/create",
        {
            "client_name": "Personal Finance Tracker",
            "user": {"client_user_id": str(current_user.id)},
            "products": ["transactions"],
            "country_codes": ["US"],
            "language": "en",
            "transactions": {"days_requested": 730},
        },
    )
    return PlaidLinkToken(link_token=response["link_token"])


@app.get("/bank/connections", response_model=list[BankConnectionRead])
def list_bank_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BankConnection]:
    return list(
        db.scalars(
            select(BankConnection)
            .where(BankConnection.user_id == current_user.id)
            .order_by(BankConnection.created_at.desc())
        )
    )


@app.delete("/bank/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_bank_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    connection = db.get(BankConnection, connection_id)
    if connection is None or connection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Bank connection not found")

    account_ids = [account.id for account in connection.accounts]
    if account_ids:
        db.execute(
            delete(Transaction).where(
                (Transaction.user_id == current_user.id)
                & (Transaction.bank_account_id.in_(account_ids))
            )
        )
    db.execute(
        delete(Transaction).where(
            (Transaction.user_id == current_user.id)
            & (Transaction.plaid_transaction_id.is_not(None))
            & (Transaction.bank_account_id.is_(None))
        )
    )

    try:
        plaid_request("/item/remove", {"access_token": connection.access_token})
    except HTTPException:
        pass

    db.delete(connection)
    db.commit()


@app.post("/bank/exchange", response_model=BankSyncResult)
def exchange_bank_public_token(
    exchange_request: PlaidExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BankSyncResult:
    response = plaid_request(
        "/item/public_token/exchange",
        {"public_token": exchange_request.public_token},
    )

    item_id = response["item_id"]
    existing_connection = db.scalar(
        select(BankConnection).where(
            (BankConnection.item_id == item_id) & (BankConnection.user_id == current_user.id)
        )
    )
    if existing_connection is None:
        connection = BankConnection(
            user_id=current_user.id,
            access_token=response["access_token"],
            item_id=item_id,
            institution_id=exchange_request.institution.institution_id
            if exchange_request.institution
            else None,
            institution_name=exchange_request.institution.name if exchange_request.institution else None,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
    else:
        connection = existing_connection

    sync_bank_accounts(connection, current_user, db)
    return sync_bank_connection(connection, current_user, db)


@app.post("/bank/sync", response_model=BankSyncResult)
def sync_bank_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BankSyncResult:
    connections = db.scalars(select(BankConnection).where(BankConnection.user_id == current_user.id)).all()
    total = BankSyncResult(added=0, modified=0, removed=0)

    for connection in connections:
        result = sync_bank_connection(connection, current_user, db)
        total.added += result.added
        total.modified += result.modified
        total.removed += result.removed

    return total


@app.delete("/transactions/standalone", status_code=status.HTTP_204_NO_CONTENT)
def reset_standalone_transactions(
    include_legacy_imports: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    statement = delete(Transaction).where(
        (Transaction.user_id == current_user.id)
        & (Transaction.bank_account_id.is_(None))
    )

    if not include_legacy_imports:
        statement = statement.where(Transaction.plaid_transaction_id.is_(None))

    db.execute(statement)
    db.commit()


def sync_bank_connection(
    connection: BankConnection,
    current_user: User,
    db: Session,
) -> BankSyncResult:
    added_count = 0
    modified_count = 0
    removed_count = 0
    needs_account_backfill = len(connection.accounts) == 0
    cursor = None if needs_account_backfill else connection.cursor
    account_lookup = sync_bank_accounts(connection, current_user, db)

    while True:
        payload: dict[str, object] = {"access_token": connection.access_token}
        if cursor:
            payload["cursor"] = cursor

        response = plaid_request("/transactions/sync", payload)

        for plaid_transaction in response.get("added", []):
            upsert_plaid_transaction(plaid_transaction, current_user, db, account_lookup)
            added_count += 1

        for plaid_transaction in response.get("modified", []):
            upsert_plaid_transaction(plaid_transaction, current_user, db, account_lookup)
            modified_count += 1

        for removed_transaction in response.get("removed", []):
            transaction = db.scalar(
                select(Transaction).where(
                    (Transaction.user_id == current_user.id)
                    & (Transaction.plaid_transaction_id == removed_transaction["transaction_id"])
                )
            )
            if transaction is not None:
                db.delete(transaction)
                removed_count += 1

        cursor = response["next_cursor"]
        if not response.get("has_more", False):
            break

    connection.cursor = cursor
    connection.last_synced_at = datetime.utcnow()
    db.commit()
    return BankSyncResult(added=added_count, modified=modified_count, removed=removed_count)


def sync_bank_accounts(
    connection: BankConnection,
    current_user: User,
    db: Session,
) -> dict[str, BankAccount]:
    response = plaid_request("/accounts/get", {"access_token": connection.access_token})
    account_lookup = {
        account.plaid_account_id: account
        for account in db.scalars(
            select(BankAccount).where(BankAccount.bank_connection_id == connection.id)
        )
    }

    for plaid_account in response.get("accounts", []):
        plaid_account_id = str(plaid_account["account_id"])
        account = account_lookup.get(plaid_account_id)

        if account is None:
            account = BankAccount(
                user_id=current_user.id,
                bank_connection_id=connection.id,
                plaid_account_id=plaid_account_id,
                name=str(plaid_account.get("name") or "Plaid account"),
            )
            db.add(account)
            account_lookup[plaid_account_id] = account

        account.name = str(plaid_account.get("name") or "Plaid account")
        account.official_name = plaid_account.get("official_name")
        account.type = plaid_account.get("type")
        account.subtype = plaid_account.get("subtype")
        account.mask = plaid_account.get("mask")

    db.flush()
    return account_lookup


def upsert_plaid_transaction(
    plaid_transaction: dict[str, object],
    current_user: User,
    db: Session,
    account_lookup: dict[str, BankAccount],
) -> Transaction:
    plaid_transaction_id = str(plaid_transaction["transaction_id"])
    amount = float(plaid_transaction["amount"])
    transaction_type = TransactionType.expense if amount >= 0 else TransactionType.income
    normalized_amount = abs(amount)
    plaid_account_id = str(plaid_transaction["account_id"])
    bank_account = account_lookup.get(plaid_account_id)

    transaction = db.scalar(
        select(Transaction).where(
            (Transaction.user_id == current_user.id)
            & (Transaction.plaid_transaction_id == plaid_transaction_id)
        )
    )
    if transaction is None:
        transaction = Transaction(
            user_id=current_user.id,
            bank_account_id=bank_account.id if bank_account else None,
            plaid_transaction_id=plaid_transaction_id,
            amount=normalized_amount,
            category=get_plaid_category(plaid_transaction),
            description=get_plaid_description(plaid_transaction),
            date=date.fromisoformat(str(plaid_transaction["date"])),
            type=transaction_type,
        )
        db.add(transaction)
        return transaction

    transaction.amount = normalized_amount
    transaction.bank_account_id = bank_account.id if bank_account else None
    transaction.category = get_plaid_category(plaid_transaction)
    transaction.description = get_plaid_description(plaid_transaction)
    transaction.date = date.fromisoformat(str(plaid_transaction["date"]))
    transaction.type = transaction_type
    return transaction


def get_plaid_category(plaid_transaction: dict[str, object]) -> str:
    personal_category = plaid_transaction.get("personal_finance_category")
    if isinstance(personal_category, dict) and personal_category.get("primary"):
        return str(personal_category["primary"]).replace("_", " ").title()

    legacy_categories = plaid_transaction.get("category")
    if isinstance(legacy_categories, list) and legacy_categories:
        return str(legacy_categories[0])

    return "Other"


def get_plaid_description(plaid_transaction: dict[str, object]) -> str:
    return str(
        plaid_transaction.get("merchant_name")
        or plaid_transaction.get("name")
        or "Imported transaction"
    )


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
    source: str = Query(default="all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    statement = select(Transaction).where(Transaction.user_id == current_user.id)
    statement = apply_source_filter(statement, source, current_user, db)

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
    source: str = Query(default="all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    statement = select(Transaction).where(Transaction.user_id == current_user.id)
    statement = apply_source_filter(statement, source, current_user, db)
    transactions = db.scalars(statement).all()
    total_income = sum(item.amount for item in transactions if item.type == TransactionType.income)
    total_expenses = sum(item.amount for item in transactions if item.type == TransactionType.expense)

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        remaining_balance=total_income - total_expenses,
    )


def apply_source_filter(statement, source: str, current_user: User, db: Session):
    if source == "standalone":
        return statement.where(Transaction.bank_account_id.is_(None))

    if source.startswith("account:"):
        try:
            account_id = int(source.split(":", 1)[1])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid account filter")

        account = db.get(BankAccount, account_id)
        if account is None or account.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Bank account not found")

        return statement.where(Transaction.bank_account_id == account_id)

    return statement
