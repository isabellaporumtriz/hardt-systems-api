from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Uuid,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import BaseModel


class SMSActivation(BaseModel):
    __tablename__ = "sms_activations"

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

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="sms24h",
        server_default="sms24h",
    )

    provider_activation_id: Mapped[str | None] = (
        mapped_column(
            String(120),
            nullable=True,
            unique=True,
            index=True,
        )
    )

    phone_number: Mapped[str | None] = mapped_column(
        String(40),
        nullable=True,
    )

    country_code: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    service_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    operator: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    provider_cost_brl: Mapped[Decimal] = (
        mapped_column(
            Numeric(
                precision=14,
                scale=4,
            ),
            nullable=False,
        )
    )

    customer_price: Mapped[Decimal] = (
        mapped_column(
            Numeric(
                precision=14,
                scale=4,
            ),
            nullable=False,
        )
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="waiting",
        server_default="waiting",
        index=True,
    )

    sms_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = (
        mapped_column(
            DateTime(timezone=True),
            nullable=True,
        )
    )

    finished_at: Mapped[datetime | None] = (
        mapped_column(
            DateTime(timezone=True),
            nullable=True,
        )
    )
