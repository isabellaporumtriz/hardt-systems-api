"""add argos legacy reconciliation

Revision ID: d7e3a91c4f20
Revises: c84d91f2a6b7
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7e3a91c4f20"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "c84d91f2a6b7"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "argos_operations",
        sa.Column(
            "legacy_reconciliation_status",
            sa.String(
                length=40
            ),
            nullable=True,
        ),
    )

    op.add_column(
        "argos_operations",
        sa.Column(
            "legacy_source",
            sa.String(
                length=180
            ),
            nullable=True,
        ),
    )

    op.add_column(
        "argos_operations",
        sa.Column(
            "legacy_evidence",
            sa.JSON(),
            nullable=True,
        ),
    )

    op.add_column(
        "argos_operations",
        sa.Column(
            "legacy_reconciled_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_argos_operations_legacy_reconciliation_status",
        "argos_operations",
        [
            "legacy_reconciliation_status"
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_argos_operations_legacy_reconciliation_status",
        table_name="argos_operations",
    )

    op.drop_column(
        "argos_operations",
        "legacy_reconciled_at",
    )

    op.drop_column(
        "argos_operations",
        "legacy_evidence",
    )

    op.drop_column(
        "argos_operations",
        "legacy_source",
    )

    op.drop_column(
        "argos_operations",
        "legacy_reconciliation_status",
    )
