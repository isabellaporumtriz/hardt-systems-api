"""add argos meta allocation order

Revision ID: a83d6f10c2b4
Revises: f4b7c2d9a610
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a83d6f10c2b4"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "f4b7c2d9a610"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "argos_meta_profiles",
        sa.Column(
            "allocation_order",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Compatibilidade caso algum ambiente já possua
    # perfis antes desta migration.
    op.execute(
        """
        WITH ordered AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    ORDER BY created_at ASC, id ASC
                ) AS position
            FROM argos_meta_profiles
        )
        UPDATE argos_meta_profiles AS p
        SET allocation_order = ordered.position
        FROM ordered
        WHERE p.id = ordered.id
        """
    )

    op.alter_column(
        "argos_meta_profiles",
        "allocation_order",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.create_index(
        "ix_argos_meta_profiles_allocation_order",
        "argos_meta_profiles",
        ["allocation_order"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_argos_meta_profiles_allocation_order",
        table_name="argos_meta_profiles",
    )

    op.drop_column(
        "argos_meta_profiles",
        "allocation_order",
    )
