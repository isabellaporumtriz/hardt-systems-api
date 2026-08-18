"""add financial exclusion timestamp defaults

Revision ID: b31e7f9c2d04
Revises: a92f7c1d4e8b
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "b31e7f9c2d04"
down_revision: str | None = "a92f7c1d4e8b"
branch_labels: (
    str | Sequence[str] | None
) = None
depends_on: (
    str | Sequence[str] | None
) = None


def upgrade() -> None:
    op.alter_column(
        "financial_source_exclusions",
        "created_at",
        existing_type=sa.DateTime(
            timezone=True
        ),
        server_default=sa.text("now()"),
        existing_nullable=False,
    )

    op.alter_column(
        "financial_source_exclusions",
        "updated_at",
        existing_type=sa.DateTime(
            timezone=True
        ),
        server_default=sa.text("now()"),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "financial_source_exclusions",
        "updated_at",
        existing_type=sa.DateTime(
            timezone=True
        ),
        server_default=None,
        existing_nullable=False,
    )

    op.alter_column(
        "financial_source_exclusions",
        "created_at",
        existing_type=sa.DateTime(
            timezone=True
        ),
        server_default=None,
        existing_nullable=False,
    )
