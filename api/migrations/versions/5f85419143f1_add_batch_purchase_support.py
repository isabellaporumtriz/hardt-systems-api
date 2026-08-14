"""add batch purchase support

Revision ID: 5f85419143f1
Revises: 2f5e41f24ef3
Create Date: 2026-08-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5f85419143f1"
down_revision: Union[str, None] = "2f5e41f24ef3"
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
        "purchases",
        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )

    op.add_column(
        "purchases",
        sa.Column(
            "unit_price_brl",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE purchases
        SET unit_price_brl = amount_brl
        WHERE unit_price_brl IS NULL
        """
    )

    op.alter_column(
        "purchases",
        "unit_price_brl",
        existing_type=sa.Numeric(
            precision=14,
            scale=2,
        ),
        nullable=False,
    )

    op.create_table(
        "purchase_items",

        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "purchase_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "inventory_item_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["purchase_id"],
            ["purchases.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["inventory_item_id"],
            ["inventory_items.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "inventory_item_id",
            name="uq_purchase_items_inventory_item_id",
        ),
    )

    op.create_index(
        "ix_purchase_items_purchase_id",
        "purchase_items",
        ["purchase_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO purchase_items (
            id,
            purchase_id,
            inventory_item_id,
            created_at
        )
        SELECT
            inventory_item_id,
            id,
            inventory_item_id,
            created_at
        FROM purchases
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_purchase_items_purchase_id",
        table_name="purchase_items",
    )

    op.drop_table(
        "purchase_items"
    )

    op.drop_column(
        "purchases",
        "unit_price_brl",
    )

    op.drop_column(
        "purchases",
        "quantity",
    )
