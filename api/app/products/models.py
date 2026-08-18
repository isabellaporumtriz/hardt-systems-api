from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import BaseModel

if TYPE_CHECKING:
    from app.licenses.models import License


class Product(BaseModel):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        unique=True,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    version: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="1.0.0",
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Unidade de negócio responsável pelo produto.
    #
    # hardt_api:
    #   Produtos e serviços da hardt.api.
    #
    # hardt_studio:
    #   Produtos e serviços da hardt.studio.
    #
    # hardt_systems:
    #   Produtos SaaS e serviços da hardt.systems.
    #
    # corporate:
    #   Uso excepcional para itens corporativos compartilhados.
    business_unit: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="hardt_systems",
        server_default="hardt_systems",
        index=True,
    )

    billing_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="one_time",
        index=True,
    )

    # Define como o produto é entregue ao cliente.
    #
    # licensed:
    #   software/produto baseado em licença.
    #
    # inventory:
    #   produto unitário entregue a partir de estoque.
    #
    # service:
    #   serviço executado sob demanda, sem estoque
    #   e sem geração de licença.
    delivery_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="inventory",
        server_default="inventory",
        index=True,
    )

    license_duration_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    max_devices: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    # Relationships

    licenses: Mapped[list["License"]] = relationship(
        back_populates="product",
    )