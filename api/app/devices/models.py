from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import BaseModel

if TYPE_CHECKING:
    from app.licenses.models import License


class Device(BaseModel):
    __tablename__ = "devices"

    __table_args__ = (
        UniqueConstraint(
            "license_id",
            "device_identifier",
            name="uq_device_license_identifier",
        ),
    )

    license_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("licenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    device_identifier: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        index=True,
    )

    name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    operating_system: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    app_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    last_ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    fingerprint: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    activation_token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )

    activated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_validated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Relationships

    license: Mapped["License"] = relationship(
        back_populates="devices",
    )