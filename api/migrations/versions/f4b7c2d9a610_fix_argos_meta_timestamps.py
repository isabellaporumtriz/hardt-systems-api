"""fix argos meta timestamps

Revision ID: f4b7c2d9a610
Revises: e31c4f72a9d0
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4b7c2d9a610"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "e31c4f72a9d0"

branch_labels = None
depends_on = None


TABLES = (
    "argos_meta_profiles",
    "argos_meta_assignments",
)


def upgrade() -> None:
    for table in TABLES:
        op.alter_column(
            table,
            "created_at",
            existing_type=sa.DateTime(
                timezone=False
            ),
            type_=sa.DateTime(
                timezone=True
            ),
            existing_nullable=False,
            server_default=sa.text("now()"),
        )

        op.alter_column(
            table,
            "updated_at",
            existing_type=sa.DateTime(
                timezone=False
            ),
            type_=sa.DateTime(
                timezone=True
            ),
            existing_nullable=False,
            server_default=sa.text("now()"),
        )


def downgrade() -> None:
    for table in TABLES:
        op.alter_column(
            table,
            "updated_at",
            existing_type=sa.DateTime(
                timezone=True
            ),
            type_=sa.DateTime(
                timezone=False
            ),
            existing_nullable=False,
            server_default=None,
        )

        op.alter_column(
            table,
            "created_at",
            existing_type=sa.DateTime(
                timezone=True
            ),
            type_=sa.DateTime(
                timezone=False
            ),
            existing_nullable=False,
            server_default=None,
        )
