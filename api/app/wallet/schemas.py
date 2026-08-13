from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class WalletResponse(BaseModel):
    id: UUID
    balance: Decimal


class WalletTransactionResponse(BaseModel):
    id: UUID
    type: str
    amount: Decimal
    reference: str | None
    description: str | None
    product_code: str | None
    created_at: datetime
