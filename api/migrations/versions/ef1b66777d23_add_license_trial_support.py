"""add license trial support

Revision ID: ef1b66777d23
Revises: 5f85419143f1
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ef1b66777d23"
down_revision: Union[str, None] = "5f85419143f1"
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
        "licenses",
        sa.Column(
            "is_trial",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "licenses",
        sa.Column(
            "trial_started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_licenses_is_trial",
        "licenses",
        ["is_trial"],
        unique=False,
    )

    # PostgreSQL partial unique index:
    # impede mais de um trial do mesmo produto
    # para o mesmo usuário, sem afetar licenças pagas.
    op.create_index(
        "uq_licenses_trial_user_product",
        "licenses",
        [
            "user_id",
            "product_id",
        ],
        unique=True,
        postgresql_where=sa.text(
            "is_trial = true "
            "OR trial_started_at IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_licenses_trial_user_product",
        table_name="licenses",
    )

    op.drop_index(
        "ix_licenses_is_trial",
        table_name="licenses",
    )

    op.drop_column(
        "licenses",
        "trial_started_at",
    )

    op.drop_column(
        "licenses",
        "is_trial",
    )
