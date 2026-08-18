"""add financial management foundation

Revision ID: d4f38a7c210b
Revises: a71b0c8e2d44
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4f38a7c210b"
down_revision: Union[str, None] = "a71b0c8e2d44"
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


BUSINESS_UNITS = (
    "hardt_api",
    "hardt_studio",
    "hardt_systems",
    "corporate",
)


def upgrade() -> None:
    # ========================================================
    # PRODUCTS
    # ========================================================

    op.add_column(
        "products",
        sa.Column(
            "business_unit",
            sa.String(length=30),
            nullable=False,
            server_default="hardt_systems",
        ),
    )

    op.create_index(
        "ix_products_business_unit",
        "products",
        ["business_unit"],
        unique=False,
    )

    # Backfill das unidades conhecidas existentes antes
    # da introdução de business_unit.
    op.execute(
        """
        UPDATE products
        SET business_unit = 'hardt_api'
        WHERE slug = 'perfil-facebook-teste'
        """
    )

    op.create_check_constraint(
        "ck_products_business_unit",
        "products",
        (
            "business_unit IN "
            "('hardt_api', "
            "'hardt_studio', "
            "'hardt_systems', "
            "'corporate')"
        ),
    )

    # ========================================================
    # MANUAL FINANCIAL ENTRIES
    # ========================================================

    op.create_table(
        "manual_financial_entries",

        sa.Column(
            "entry_type",
            sa.String(length=20),
            nullable=False,
        ),

        sa.Column(
            "business_unit",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "nature",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "category",
            sa.String(length=80),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Uuid(),
            nullable=True,
        ),

        sa.Column(
            "user_id",
            sa.Uuid(),
            nullable=True,
        ),

        sa.Column(
            "counterparty",
            sa.String(length=160),
            nullable=True,
        ),

        sa.Column(
            "description",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "payment_method",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="settled",
        ),

        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "settled_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "external_reference",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_by_user_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "id",
            sa.UUID(),
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

        sa.CheckConstraint(
            "amount > 0",
            name=(
                "ck_manual_financial_entries_"
                "amount_positive"
            ),
        ),

        sa.CheckConstraint(
            "entry_type IN ('income', 'expense')",
            name=(
                "ck_manual_financial_entries_"
                "entry_type"
            ),
        ),

        sa.CheckConstraint(
            (
                "business_unit IN "
                "('hardt_api', "
                "'hardt_studio', "
                "'hardt_systems', "
                "'corporate')"
            ),
            name=(
                "ck_manual_financial_entries_"
                "business_unit"
            ),
        ),

        sa.CheckConstraint(
            (
                "nature IN "
                "('revenue', "
                "'direct_cost', "
                "'operating_expense', "
                "'other')"
            ),
            name=(
                "ck_manual_financial_entries_"
                "nature"
            ),
        ),

        sa.CheckConstraint(
            (
                "status IN "
                "('pending', "
                "'settled', "
                "'cancelled')"
            ),
            name=(
                "ck_manual_financial_entries_"
                "status"
            ),
        ),

        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="SET NULL",
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),

        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),

        sa.UniqueConstraint(
            "external_reference",
            name=(
                "uq_manual_financial_entries_"
                "external_reference"
            ),
        ),
    )

    for column in (
        "entry_type",
        "business_unit",
        "nature",
        "category",
        "product_id",
        "user_id",
        "status",
        "occurred_at",
        "settled_at",
        "created_by_user_id",
    ):
        op.create_index(
            (
                "ix_manual_financial_entries_"
                + column
            ),
            "manual_financial_entries",
            [column],
            unique=False,
        )


def downgrade() -> None:
    op.drop_table(
        "manual_financial_entries"
    )

    op.drop_constraint(
        "ck_products_business_unit",
        "products",
        type_="check",
    )

    op.drop_index(
        "ix_products_business_unit",
        table_name="products",
    )

    op.drop_column(
        "products",
        "business_unit",
    )
