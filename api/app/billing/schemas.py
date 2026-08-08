from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MonthlyCheckoutRequest(BaseModel):
    product_slug: str = Field(
        min_length=2,
        max_length=120,
    )

    cpf_cnpj: str = Field(
        min_length=11,
        max_length=18,
    )

    mobile_phone: str = Field(
        min_length=10,
        max_length=20,
    )


class MonthlyCheckoutResponse(BaseModel):
    subscription_id: UUID

    product_id: UUID
    product_name: str
    product_slug: str

    amount: Decimal
    cycle: str
    status: str

    invoice_url: str

    asaas_customer_id: str
    asaas_subscription_id: str
    asaas_payment_id: str


class AdminMonthlyCheckoutRequest(BaseModel):
    user_id: UUID

    product_id: UUID

    cpf_cnpj: str = Field(
        min_length=11,
        max_length=18,
    )

    mobile_phone: str = Field(
        min_length=10,
        max_length=20,
    )


class AdminMonthlyCheckoutResponse(
    MonthlyCheckoutResponse
):
    user_id: UUID
    user_name: str
    user_email: str
