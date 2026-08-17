"""harden sms submission

Revision ID: f14a62d90c31
Revises: c7d91f2a84b6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f14a62d90c31"
down_revision: Union[
    str,
    Sequence[str],
    None,
] = "c7d91f2a84b6"

branch_labels = None
depends_on = None


def upgrade() -> None:
    # Durante a janela "submitting", ainda não temos
    # confirmação segura do ID/número retornado pelo
    # provider.
    op.alter_column(
        "sms_activations",
        "provider_activation_id",
        existing_type=sa.String(length=120),
        nullable=True,
    )

    op.alter_column(
        "sms_activations",
        "phone_number",
        existing_type=sa.String(length=40),
        nullable=True,
    )


def downgrade() -> None:
    # Downgrade só é seguro se não existirem registros
    # intermediários sem número confirmado.
    connection = op.get_bind()

    count = connection.execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM sms_activations
            WHERE provider_activation_id IS NULL
               OR phone_number IS NULL
            """
        )
    ).scalar_one()

    if count:
        raise RuntimeError(
            "Existem ativações intermediárias "
            "sem confirmação do provider."
        )

    op.alter_column(
        "sms_activations",
        "phone_number",
        existing_type=sa.String(length=40),
        nullable=False,
    )

    op.alter_column(
        "sms_activations",
        "provider_activation_id",
        existing_type=sa.String(length=120),
        nullable=False,
    )
