from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import (
    BaseModel,
    Field,
)


class SMSServiceResponse(BaseModel):
    code: str
    name: str
    available_count: int
    price_brl: Decimal



class SMSCatalogResponse(BaseModel):
    country: int
    total: int
    services: list[SMSServiceResponse]


class SMSQuoteResponse(BaseModel):
    country: int
    service_code: str
    service_name: str

    available: bool
    available_count: int

    price_brl: Decimal



class SMSActivationPurchaseRequest(BaseModel):
    country: int = 73

    service_code: str = Field(
        min_length=1,
        max_length=50,
    )

    idempotency_key: str = Field(
        min_length=8,
        max_length=120,
    )


class SMSActivationResponse(BaseModel):
    id: UUID
    purchase_id: UUID

    phone_number: str | None
    country_code: int
    service_code: str
    operator: str | None

    customer_price: Decimal

    status: str
    sms_code: str | None

    expires_at: datetime | None
    created_at: datetime
    finished_at: datetime | None


class SMSProviderHealthResponse(BaseModel):
    status: str
    currency: str
