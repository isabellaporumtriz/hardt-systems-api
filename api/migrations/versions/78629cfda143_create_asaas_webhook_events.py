"""create asaas webhook events

Revision ID: 78629cfda143
Revises: ce364d847388
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "78629cfda143"
down_revision: Union[str, None] = "ce364d847388"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "asaas_webhook_events",
        sa.Column(
            "event_id",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "event_type",
            sa.String(length=80),
            nullable=False,
        ),
        sa.Column(
            "payment_id",
            sa.String(length=80),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="processing",
        ),
        sa.Column(
            "error_message",
            sa.Text(),
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
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_asaas_webhook_events_event_id",
        "asaas_webhook_events",
        ["event_id"],
        unique=True,
    )

    op.create_index(
        "ix_asaas_webhook_events_event_type",
        "asaas_webhook_events",
        ["event_type"],
        unique=False,
    )

    op.create_index(
        "ix_asaas_webhook_events_payment_id",
        "asaas_webhook_events",
        ["payment_id"],
        unique=False,
    )

    op.create_index(
        "ix_asaas_webhook_events_status",
        "asaas_webhook_events",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_asaas_webhook_events_status",
        table_name="asaas_webhook_events",
    )
    op.drop_index(
        "ix_asaas_webhook_events_payment_id",
        table_name="asaas_webhook_events",
    )
    op.drop_index(
        "ix_asaas_webhook_events_event_type",
        table_name="asaas_webhook_events",
    )
    op.drop_index(
        "ix_asaas_webhook_events_event_id",
        table_name="asaas_webhook_events",
    )

    op.drop_table(
        "asaas_webhook_events"
    )
