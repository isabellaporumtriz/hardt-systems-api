from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import BaseModel


class SMMOrder(BaseModel):
    __tablename__ = "smm_orders"

    purchase_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "purchases.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="jap",
        server_default="jap",
    )

    provider_service_id: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    provider_order_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        unique=True,
        index=True,
    )

    service_name: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    category: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    target_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    provider_rate_usd: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=18,
            scale=8,
        ),
        nullable=False,
    )

    provider_cost_usd: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=18,
            scale=8,
        ),
        nullable=False,
    )

    hardt_rate_usd: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=18,
            scale=8,
        ),
        nullable=False,
    )

    hardt_price_usd: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=18,
            scale=8,
        ),
        nullable=False,
    )

    usd_brl_rate: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=18,
            scale=8,
        ),
        nullable=False,
    )

    amount_brl: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=14,
            scale=2,
        ),
        nullable=False,
    )

    provider_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="not_submitted",
        server_default="not_submitted",
        index=True,
    )

    start_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    remains: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    provider_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
