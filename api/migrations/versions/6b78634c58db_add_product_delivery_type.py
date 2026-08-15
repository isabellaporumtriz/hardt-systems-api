"""add product delivery type

Revision ID: 6b78634c58db
Revises: ef1b66777d23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6b78634c58db"
down_revision: Union[str, None] = "ef1b66777d23"
branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None
depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "delivery_type",
            sa.String(length=30),
            nullable=False,
            server_default="inventory",
        ),
    )

    op.create_index(
        "ix_products_delivery_type",
        "products",
        ["delivery_type"],
        unique=False,
    )

    # Backfill explícito dos produtos existentes.
    op.execute(
        sa.text(
            """
            UPDATE products
            SET delivery_type = 'licensed'
            WHERE slug = 'google-meet-robot'
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE products
            SET delivery_type = 'inventory'
            WHERE slug = 'perfil-facebook-teste'
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        "ix_products_delivery_type",
        table_name="products",
    )

    op.drop_column(
        "products",
        "delivery_type",
    )
