from datetime import date as Date
from datetime import datetime as DateTime

from pydantic import BaseModel, ConfigDict, Field

from .models import TransactionType


class TransactionBase(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: Date
    type: TransactionType


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: Date | None = None
    type: TransactionType | None = None


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    bank_account_id: int | None = None
    plaid_transaction_id: str | None = None
    source_name: str = "Standalone"


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    remaining_balance: float


class PlaidLinkToken(BaseModel):
    link_token: str


class PlaidInstitution(BaseModel):
    institution_id: str | None = None
    name: str | None = None


class PlaidExchangeRequest(BaseModel):
    public_token: str
    institution: PlaidInstitution | None = None


class BankAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plaid_account_id: str
    name: str
    official_name: str | None = None
    type: str | None = None
    subtype: str | None = None
    mask: str | None = None
    display_name: str


class BankConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: str | None = None
    institution_name: str | None = None
    created_at: DateTime
    last_synced_at: DateTime | None = None
    accounts: list[BankAccountRead] = Field(default_factory=list)


class BankSyncResult(BaseModel):
    added: int
    modified: int
    removed: int


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    identifier: str
    password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
