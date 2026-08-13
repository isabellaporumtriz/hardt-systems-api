from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import BaseModel


if TYPE_CHECKING:
    from app.users.models import User


class Wallet(BaseModel):
    __tablename__ = "wallets"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
        index=True,
    )

    balance: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=14,
            scale=4,
        ),
        default=Decimal("0.0000"),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="wallet",
    )

    transactions: Mapped[list["WalletTransaction"]] = relationship(
        back_populates="wallet",
        cascade="all, delete-orphan",
    )

    topups: Mapped[list["WalletTopup"]] = relationship(
        back_populates="wallet",
        cascade="all, delete-orphan",
    )


class WalletTransaction(BaseModel):
    __tablename__ = "wallet_transactions"

    wallet_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "wallets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=14,
            scale=4,
        ),
        nullable=False,
    )

    reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    product_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    wallet: Mapped["Wallet"] = relationship(
        back_populates="transactions",
    )


class WalletTopup(BaseModel):
    __tablename__ = "wallet_topups"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    wallet_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "wallets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    amount_brl: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=14,
            scale=2,
        ),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="asaas",
    )

    provider_payment_id: Mapped[str | None] = mapped_column(
        String(120),
        unique=True,
        nullable=True,
        index=True,
    )

    external_reference: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )

    pix_copy_paste: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    pix_qr_code: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    wallet: Mapped["Wallet"] = relationship(
        back_populates="topups",
    )
