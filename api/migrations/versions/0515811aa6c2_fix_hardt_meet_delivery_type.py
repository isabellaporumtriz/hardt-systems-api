"""fix hardt meet delivery type

Revision ID: 0515811aa6c2
Revises: 6b78634c58db
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0515811aa6c2"
down_revision: Union[str, None] = "6b78634c58db"
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
    op.execute(
        sa.text(
            """
            UPDATE products
            SET delivery_type = 'licensed'
            WHERE slug IN (
                'hardt-meet',
                'google-meet-robot'
            )
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE products
            SET delivery_type = 'inventory'
            WHERE slug = 'hardt-meet'
            """
        )
    )
