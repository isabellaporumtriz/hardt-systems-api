from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
        examples=["Robô Meet"],
    )

    slug: str = Field(
        min_length=2,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        examples=["robo-meet"],
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    version: str = Field(
        default="1.0.0",
        min_length=1,
        max_length=30,
    )

    price: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        decimal_places=2,
    )

    is_active: bool = True


class ProductUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    slug: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    version: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    price: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
    )

    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    version: str
    price: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
