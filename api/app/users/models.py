from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import BaseModel

if TYPE_CHECKING:
    from app.wallet.models import Wallet
    from app.licenses.models import License


class User(BaseModel):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )


    asaas_customer_id: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        unique=True,
        index=True,
    )

    # Relationships

    wallet: Mapped["Wallet | None"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        single_parent=True,
    )


    licenses: Mapped[list["License"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )