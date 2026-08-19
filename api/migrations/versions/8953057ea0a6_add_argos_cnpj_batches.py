"""add argos cnpj batches

Revision ID: 8953057ea0a6
Revises: a83d6f10c2b4
Create Date: 2026-08-19 07:57:56.123099
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8953057ea0a6"
down_revision: Union[str, Sequence[str], None] = "a83d6f10c2b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "argos_cnpj_batches",
        sa.Column(
            "status",
            sa.String(length=40),
            server_default="parsed",
            nullable=False,
        ),
        sa.Column(
            "original_filename",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "object_key",
            sa.String(length=700),
            nullable=False,
        ),
        sa.Column(
            "mime_type",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "size_bytes",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "total_rows",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "valid_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "duplicate_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "invalid_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_by_user_id",
            sa.UUID(),
            nullable=True,
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
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key"),
    )

    op.create_index(
        op.f(
            "ix_argos_cnpj_batches_created_by_user_id"
        ),
        "argos_cnpj_batches",
        ["created_by_user_id"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_argos_cnpj_batches_status"
        ),
        "argos_cnpj_batches",
        ["status"],
        unique=False,
    )

    op.create_table(
        "argos_cnpj_batch_items",
        sa.Column(
            "batch_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "row_number",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "cnpj_original",
            sa.String(length=80),
            nullable=False,
        ),
        sa.Column(
            "cnpj_normalized",
            sa.String(length=14),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=40),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "error",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "operation_id",
            sa.UUID(),
            nullable=True,
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
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["argos_cnpj_batches.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["operation_id"],
            ["argos_operations.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f(
            "ix_argos_cnpj_batch_items_batch_id"
        ),
        "argos_cnpj_batch_items",
        ["batch_id"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_argos_cnpj_batch_items_cnpj_normalized"
        ),
        "argos_cnpj_batch_items",
        ["cnpj_normalized"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_argos_cnpj_batch_items_operation_id"
        ),
        "argos_cnpj_batch_items",
        ["operation_id"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_argos_cnpj_batch_items_status"
        ),
        "argos_cnpj_batch_items",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f(
            "ix_argos_cnpj_batch_items_status"
        ),
        table_name="argos_cnpj_batch_items",
    )

    op.drop_index(
        op.f(
            "ix_argos_cnpj_batch_items_operation_id"
        ),
        table_name="argos_cnpj_batch_items",
    )

    op.drop_index(
        op.f(
            "ix_argos_cnpj_batch_items_cnpj_normalized"
        ),
        table_name="argos_cnpj_batch_items",
    )

    op.drop_index(
        op.f(
            "ix_argos_cnpj_batch_items_batch_id"
        ),
        table_name="argos_cnpj_batch_items",
    )

    op.drop_table(
        "argos_cnpj_batch_items"
    )

    op.drop_index(
        op.f(
            "ix_argos_cnpj_batches_status"
        ),
        table_name="argos_cnpj_batches",
    )

    op.drop_index(
        op.f(
            "ix_argos_cnpj_batches_created_by_user_id"
        ),
        table_name="argos_cnpj_batches",
    )

    op.drop_table(
        "argos_cnpj_batches"
    )
