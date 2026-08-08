from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import BaseModel

if TYPE_CHECKING:
    from app.devices.models import Device
    from app.products.models import Product
    from app.users.models import User


class License(BaseModel):
    __tablename__ = "licenses"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Sequencial interno da licença
    license_sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        unique=True,
        index=True,
    )

    # Número amigável exibido ao usuário
    license_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    # Hash SHA-256 da chave
    key_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )

    # Ex.: HARDT-****-****-A8LF
    key_preview: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    # Chave completa criptografada para exibição ao proprietário.
    encrypted_key: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # pending_activation | active | expired | suspended | revoked
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="active",
        index=True,
    )

    duration_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
    )

    max_devices: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    first_activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Relationships

    user: Mapped["User"] = relationship(
        back_populates="licenses",
    )

    product: Mapped["Product"] = relationship(
        back_populates="licenses",
    )

    devices: Mapped[list["Device"]] = relationship(
        back_populates="license",
        cascade="all, delete-orphan",
    )