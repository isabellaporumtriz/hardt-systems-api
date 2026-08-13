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
    available_stock: int


class PurchaseCreateRequest(BaseModel):
    product_id: UUID
    idempotency_key: str = Field(
        min_length=8,
        max_length=120,
    )


class PurchaseResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_slug: str
    inventory_item_id: UUID
    amount_brl: Decimal
    status: str
    completed_at: datetime | None
    created_at: datetime


class PurchaseDeliveryResponse(BaseModel):
    purchase_id: UUID
    product_id: UUID
    product_name: str
    payload: dict[str, Any]


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
