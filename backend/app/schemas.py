from datetime import date as Date

from pydantic import BaseModel, ConfigDict, Field

from .models import TransactionType


class TransactionBase(BaseModel):
    user_id: int | None = None
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: Date
    type: TransactionType


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    user_id: int | None = None
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: Date | None = None
    type: TransactionType | None = None


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    remaining_balance: float
