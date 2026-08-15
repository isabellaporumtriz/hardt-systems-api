from decimal import Decimal

from pydantic import BaseModel


class SMMServiceResponse(BaseModel):
    provider_service_id: int
    name: str
    category: str
    service_type: str

    min_quantity: int
    max_quantity: int

    refill: bool
    cancel: bool

    # Não exporemos provider_rate no frontend
    # quando a interface final estiver pronta.
    hardt_rate_usd_per_1000: Decimal


class SMMCatalogResponse(BaseModel):
    total: int
    services: list[SMMServiceResponse]


class SMMPricePreviewResponse(BaseModel):
    provider_service_id: int
    quantity: int

    hardt_rate_usd_per_1000: Decimal
    total_usd: Decimal


class SMMQuoteRequest(BaseModel):
    service_id: int
    quantity: int
    target_url: str


class SMMQuoteResponse(BaseModel):
    provider_service_id: int
    service_name: str
    category: str
    quantity: int

    hardt_rate_usd_per_1000: Decimal
    hardt_price_usd: Decimal

    usd_brl_rate: Decimal
    amount_brl: Decimal


class SMMPurchaseRequest(BaseModel):
    service_id: int
    quantity: int
    target_url: str
    idempotency_key: str


class SMMPurchaseResponse(BaseModel):
    purchase_id: str
    smm_order_id: str

    product_name: str
    service_name: str
    category: str

    quantity: int
    target_url: str

    amount_brl: Decimal
    status: str
    provider_status: str


class SMMProviderActionResponse(BaseModel):
    smm_order_id: str
    purchase_id: str
    provider_order_id: str | None
    provider_status: str
    start_count: int | None
    remains: int | None
    provider_error: str | None
