from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import (
    BaseModel,
    Field,
)


class StoreProductResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    price: Decimal
    delivery_type: str
    available_stock: int


class PurchaseCreateRequest(BaseModel):
    product_id: UUID

    quantity: int = Field(
        default=1,
        ge=1,
        le=500,
    )

    idempotency_key: str = Field(
        min_length=8,
        max_length=120,
    )


class PurchaseResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_slug: str
    delivery_type: str
    inventory_item_id: UUID | None

    quantity: int
    unit_price_brl: Decimal
    amount_brl: Decimal

    status: str
    completed_at: datetime | None
    created_at: datetime


class PurchaseDeliveryItemResponse(BaseModel):
    inventory_item_id: UUID
    payload: dict[str, Any]


class PurchaseDeliveryResponse(BaseModel):
    purchase_id: UUID
    product_id: UUID
    product_name: str
    quantity: int
    items: list[PurchaseDeliveryItemResponse]


class InventoryItemCreateRequest(BaseModel):
    payload: dict[str, Any]


class InventoryBulkCreateRequest(BaseModel):
    items: list[InventoryItemCreateRequest] = Field(
        min_length=1,
        max_length=1000,
    )


class InventoryBulkCreateResponse(BaseModel):
    product_id: UUID
    created: int
    available_stock: int


class InventoryStockResponse(BaseModel):
    product_id: UUID
    product_name: str
    available: int
    sold: int
    total: int


class SMMPurchaseDetailResponse(BaseModel):
    purchase_id: UUID
    product_id: UUID
    product_name: str

    status: str
    quantity: int
    amount_brl: Decimal
    created_at: datetime

    service_name: str
    category: str | None
    target_url: str

    provider_status: str
    start_count: int | None
    remains: int | None

    refill_available: bool = False
    cancel_available: bool = False

