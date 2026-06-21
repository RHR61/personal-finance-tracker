from datetime import date as Date

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


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    remaining_balance: float


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
