"""add financial source exclusions

Revision ID: a92f7c1d4e8b
Revises: e6a7c0f9b312
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "a92f7c1d4e8b"
down_revision: str | None = "e6a7c0f9b312"
branch_labels: (
    str | Sequence[str] | None
) = None
depends_on: (
    str | Sequence[str] | None
) = None


def upgrade() -> None:
    op.create_table(
        "financial_source_exclusions",
        sa.Column(
            "source_type",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "source_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "reason",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "excluded_by_user_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["excluded_by_user_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_type",
            "source_id",
            name=(
                "uq_financial_source_"
                "exclusions_source"
            ),
        ),
    )

    op.create_index(
        op.f(
            "ix_financial_source_"
            "exclusions_source_type"
        ),
        "financial_source_exclusions",
        ["source_type"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_financial_source_"
            "exclusions_source_id"
        ),
        "financial_source_exclusions",
        ["source_id"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_financial_source_"
            "exclusions_excluded_by_user_id"
        ),
        "financial_source_exclusions",
        ["excluded_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f(
            "ix_financial_source_"
            "exclusions_excluded_by_user_id"
        ),
        table_name=(
            "financial_source_exclusions"
        ),
    )

    op.drop_index(
        op.f(
            "ix_financial_source_"
            "exclusions_source_id"
        ),
        table_name=(
            "financial_source_exclusions"
        ),
    )

    op.drop_index(
        op.f(
            "ix_financial_source_"
            "exclusions_source_type"
        ),
        table_name=(
            "financial_source_exclusions"
        ),
    )

    op.drop_table(
        "financial_source_exclusions"
    )
