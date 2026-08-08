"""add asaas columns to existing tables

Revision ID: ce364d847388
Revises: 89e01b83946d
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ce364d847388'
down_revision: Union[str, None] = '89e01b83946d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "asaas_customer_id",
            sa.String(length=80),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_users_asaas_customer_id",
        "users",
        ["asaas_customer_id"],
        unique=True,
    )

    op.add_column(
        "products",
        sa.Column(
            "billing_type",
            sa.String(length=30),
            nullable=False,
            server_default="one_time",
        ),
    )
    op.add_column(
        "products",
        sa.Column(
            "license_duration_days",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.add_column(
        "products",
        sa.Column(
            "max_devices",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    op.create_index(
        "ix_products_billing_type",
        "products",
        ["billing_type"],
        unique=False,
    )

    op.add_column(
        "charges",
        sa.Column(
            "asaas_payment_id",
            sa.String(length=80),
            nullable=True,
        ),
    )
    op.add_column(
        "charges",
        sa.Column(
            "asaas_subscription_id",
            sa.String(length=80),
            nullable=True,
        ),
    )
    op.add_column(
        "charges",
        sa.Column(
            "invoice_url",
            sa.Text(),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_charges_asaas_payment_id",
        "charges",
        ["asaas_payment_id"],
        unique=True,
    )
    op.create_index(
        "ix_charges_asaas_subscription_id",
        "charges",
        ["asaas_subscription_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_charges_asaas_subscription_id",
        table_name="charges",
    )
    op.drop_index(
        "ix_charges_asaas_payment_id",
        table_name="charges",
    )
    op.drop_column(
        "charges",
        "invoice_url",
    )
    op.drop_column(
        "charges",
        "asaas_subscription_id",
    )
    op.drop_column(
        "charges",
        "asaas_payment_id",
    )

    op.drop_index(
        "ix_products_billing_type",
        table_name="products",
    )
    op.drop_column(
        "products",
        "max_devices",
    )
    op.drop_column(
        "products",
        "license_duration_days",
    )
    op.drop_column(
        "products",
        "billing_type",
    )

    op.drop_index(
        "ix_users_asaas_customer_id",
        table_name="users",
    )
    op.drop_column(
        "users",
        "asaas_customer_id",
    )
