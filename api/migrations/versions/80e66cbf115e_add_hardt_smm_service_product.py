"""add hardt smm service product

Revision ID: 80e66cbf115e
Revises: 0515811aa6c2
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "80e66cbf115e"
down_revision: Union[str, None] = "0515811aa6c2"
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
    # Hardt SMM é um produto-container.
    # O preço real é dinâmico conforme serviço
    # JAP + quantidade e NÃO usa Product.price.
    op.execute(
        sa.text(
            """
            INSERT INTO products (
                id,
                name,
                slug,
                description,
                version,
                price,
                is_active,
                billing_type,
                delivery_type,
                license_duration_days,
                max_devices,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                'Hardt SMM',
                'hardt-smm',
                'Serviços de social media sob demanda através do ecossistema Hardt.',
                '1.0.0',
                0.00,
                TRUE,
                'one_time',
                'service',
                NULL,
                1,
                NOW(),
                NOW()
            )
            ON CONFLICT (slug)
            DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                is_active = TRUE,
                billing_type = 'one_time',
                delivery_type = 'service',
                updated_at = NOW();
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM products
            WHERE slug = 'hardt-smm'
              AND delivery_type = 'service';
            """
        )
    )
