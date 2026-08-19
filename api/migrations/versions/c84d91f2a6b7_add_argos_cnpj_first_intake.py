"""add argos cnpj first intake

Revision ID: c84d91f2a6b7
Revises: b31e7f9c2d04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c84d91f2a6b7"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "b31e7f9c2d04"

branch_labels = None
depends_on = None


def upgrade() -> None:

    op.add_column(
        "argos_operations",
        sa.Column(
            "company_data",
            sa.JSON(),
            nullable=True,
        ),
    )

    op.add_column(
        "argos_operations",
        sa.Column(
            "company_data_confirmed_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
    )

    op.create_table(
        "argos_intakes",

        sa.Column(
            "document_type",
            sa.String(
                length=40
            ),
            server_default=(
                "CNPJ_CARD"
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(
                length=40
            ),
            server_default="parsed",
            nullable=False,
        ),

        sa.Column(
            "original_filename",
            sa.String(
                length=255
            ),
            nullable=False,
        ),

        sa.Column(
            "object_key",
            sa.String(
                length=700
            ),
            nullable=False,
        ),

        sa.Column(
            "mime_type",
            sa.String(
                length=120
            ),
            nullable=False,
        ),

        sa.Column(
            "size_bytes",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "extracted_text",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "extracted_data",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "parse_error",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "operation_id",
            sa.Uuid(),
            nullable=True,
        ),

        sa.Column(
            "confirmed_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),

        sa.Column(
            "created_by_user_id",
            sa.Uuid(),
            nullable=True,
        ),

        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["operation_id"],
            ["argos_operations.id"],
            ondelete="SET NULL",
        ),

        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "object_key"
        ),
    )

    op.create_index(
        "ix_argos_intakes_document_type",
        "argos_intakes",
        ["document_type"],
    )

    op.create_index(
        "ix_argos_intakes_status",
        "argos_intakes",
        ["status"],
    )

    op.create_index(
        "ix_argos_intakes_operation_id",
        "argos_intakes",
        ["operation_id"],
    )

    op.create_index(
        "ix_argos_intakes_created_by_user_id",
        "argos_intakes",
        ["created_by_user_id"],
    )


def downgrade() -> None:

    op.drop_index(
        "ix_argos_intakes_created_by_user_id",
        table_name="argos_intakes",
    )

    op.drop_index(
        "ix_argos_intakes_operation_id",
        table_name="argos_intakes",
    )

    op.drop_index(
        "ix_argos_intakes_status",
        table_name="argos_intakes",
    )

    op.drop_index(
        "ix_argos_intakes_document_type",
        table_name="argos_intakes",
    )

    op.drop_table(
        "argos_intakes"
    )

    op.drop_column(
        "argos_operations",
        "company_data_confirmed_at",
    )

    op.drop_column(
        "argos_operations",
        "company_data",
    )
