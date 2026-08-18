"""backfill smm purchase completed at

Revision ID: e6a7c0f9b312
Revises: d4f38a7c210b
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op


revision: str = "e6a7c0f9b312"
down_revision: Union[str, None] = "d4f38a7c210b"

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
    """
    Corrige compras SMM historicamente marcadas como
    completed sem completed_at.

    Usa o timestamp da última sincronização do SMM como
    melhor representação disponível do momento em que o
    estado Completed foi observado pelo sistema.
    """

    op.execute(
        """
        UPDATE purchases AS p
        SET completed_at = COALESCE(
            s.updated_at,
            p.updated_at,
            p.created_at
        )
        FROM smm_orders AS s
        WHERE
            s.purchase_id = p.id
            AND p.status = 'completed'
            AND p.completed_at IS NULL
            AND LOWER(
                COALESCE(
                    s.provider_status,
                    ''
                )
            ) IN (
                'completed',
                'complete'
            )
        """
    )


def downgrade() -> None:
    # Migração de reparo histórico deliberadamente
    # não destrutiva.
    #
    # Não é seguro zerar completed_at no downgrade,
    # pois após o upgrade novas sincronizações legítimas
    # também podem ter preenchido esse campo.
    pass
