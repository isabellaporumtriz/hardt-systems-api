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


class WalletTopupCreateRequest(BaseModel):
    amount: Decimal
    cpf_cnpj: str | None = None
    mobile_phone: str | None = None


class WalletTopupResponse(BaseModel):
    id: UUID
    amount_brl: Decimal
    status: str
    provider: str
    provider_payment_id: str | None
    external_reference: str
    pix_copy_paste: str | None
    pix_qr_code: str | None
    paid_at: datetime | None
    created_at: datetime
