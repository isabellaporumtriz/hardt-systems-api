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
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import BaseModel


if TYPE_CHECKING:
    from app.licenses.models import License
    from app.products.models import Product
    from app.users.models import User


class Charge(BaseModel):
    __tablename__ = "charges"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    product_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "products.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    license_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "licenses.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    charge_number: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True,
        index=True,
    )

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=12,
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

    payment_method: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    external_reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )


    asaas_payment_id: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        unique=True,
        index=True,
    )

    asaas_subscription_id: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        index=True,
    )

    invoice_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    user: Mapped["User"] = relationship()

    product: Mapped["Product | None"] = relationship()

    license: Mapped["License | None"] = relationship()


class ManualFinancialEntry(BaseModel):
    """
    Lançamento financeiro criado manualmente pelo administrativo.

    Não replica Charge, Purchase ou WalletTransaction.

    Deve representar apenas eventos financeiros que não nasceram
    automaticamente nos fluxos transacionais do portal.
    """

    __tablename__ = "manual_financial_entries"

    entry_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    # hardt_api | hardt_studio | hardt_systems | corporate
    business_unit: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    # revenue | direct_cost | operating_expense | other
    nature: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    product_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "products.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    counterparty: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
    )

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=14,
            scale=2,
        ),
        nullable=False,
    )

    payment_method: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # pending | settled | cancelled
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="settled",
        index=True,
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    settled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    external_reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

