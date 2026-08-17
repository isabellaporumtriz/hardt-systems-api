"""add argos control plane

Revision ID: a71b0c8e2d44
Revises: f14a62d90c31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a71b0c8e2d44"
down_revision: Union[
    str,
    Sequence[str],
    None,
] = "f14a62d90c31"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "argos_operations",

        sa.Column(
            "company_name",
            sa.String(length=180),
            nullable=False,
        ),

        sa.Column(
            "client_slug",
            sa.String(length=180),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            server_default="active",
            nullable=False,
        ),

        sa.Column(
            "current_step",
            sa.String(length=60),
            server_default="CREATED",
            nullable=False,
        ),

        sa.Column(
            "domain_candidates",
            sa.JSON(),
            nullable=False,
        ),

        sa.Column(
            "domain",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "site_url",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "business_id",
            sa.String(length=120),
            nullable=True,
        ),

        sa.Column(
            "last_message",
            sa.Text(),
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
        sa.UniqueConstraint("client_slug"),
    )

    op.create_index(
        "ix_argos_operations_client_slug",
        "argos_operations",
        ["client_slug"],
        unique=True,
    )

    op.create_index(
        "ix_argos_operations_status",
        "argos_operations",
        ["status"],
    )

    op.create_index(
        "ix_argos_operations_current_step",
        "argos_operations",
        ["current_step"],
    )

    op.create_index(
        "ix_argos_operations_created_by_user_id",
        "argos_operations",
        ["created_by_user_id"],
    )

    op.create_table(
        "argos_jobs",

        sa.Column(
            "operation_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "action",
            sa.String(length=80),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            server_default="queued",
            nullable=False,
        ),

        sa.Column(
            "payload",
            sa.JSON(),
            nullable=False,
        ),

        sa.Column(
            "result",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "error",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "worker_id",
            sa.String(length=180),
            nullable=True,
        ),

        sa.Column(
            "claimed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "finished_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "id",
            sa.Uuid(),
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
            ["operation_id"],
            ["argos_operations.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_argos_jobs_operation_id",
        "argos_jobs",
        ["operation_id"],
    )

    op.create_index(
        "ix_argos_jobs_action",
        "argos_jobs",
        ["action"],
    )

    op.create_index(
        "ix_argos_jobs_status",
        "argos_jobs",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_argos_jobs_status",
        table_name="argos_jobs",
    )

    op.drop_index(
        "ix_argos_jobs_action",
        table_name="argos_jobs",
    )

    op.drop_index(
        "ix_argos_jobs_operation_id",
        table_name="argos_jobs",
    )

    op.drop_table(
        "argos_jobs"
    )

    op.drop_index(
        "ix_argos_operations_created_by_user_id",
        table_name="argos_operations",
    )

    op.drop_index(
        "ix_argos_operations_current_step",
        table_name="argos_operations",
    )

    op.drop_index(
        "ix_argos_operations_status",
        table_name="argos_operations",
    )

    op.drop_index(
        "ix_argos_operations_client_slug",
        table_name="argos_operations",
    )

    op.drop_table(
        "argos_operations"
    )
