"""add hardt sms

Revision ID: c7d91f2a84b6
Revises: 98722ac313f4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d91f2a84b6"
down_revision: Union[
    str,
    Sequence[str],
    None,
] = "98722ac313f4"

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
    # -------------------------------------------------
    # Produto-container HardtSMS
    # -------------------------------------------------
    #
    # Assim como Hardt SMM, o preço é dinâmico.
    # Product.price não representa o preço real
    # de cada ativação.
    #
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
                'HardtSMS',
                'hardt-sms',
                'Números temporários e ativações SMS através do ecossistema Hardt.',
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

    # -------------------------------------------------
    # Ativações HardtSMS
    # -------------------------------------------------

    op.create_table(
        "sms_activations",

        sa.Column(
            "purchase_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "provider",
            sa.String(length=30),
            server_default="sms24h",
            nullable=False,
        ),

        sa.Column(
            "provider_activation_id",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "phone_number",
            sa.String(length=40),
            nullable=False,
        ),

        sa.Column(
            "country_code",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "service_code",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "operator",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "provider_cost_brl",
            sa.Numeric(
                precision=14,
                scale=4,
            ),
            nullable=False,
        ),

        sa.Column(
            "customer_price",
            sa.Numeric(
                precision=14,
                scale=4,
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=50),
            server_default="waiting",
            nullable=False,
        ),

        sa.Column(
            "sms_code",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "expires_at",
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
            ["purchase_id"],
            ["purchases.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f(
            "ix_sms_activations_purchase_id"
        ),
        "sms_activations",
        ["purchase_id"],
        unique=True,
    )

    op.create_index(
        op.f(
            "ix_sms_activations_user_id"
        ),
        "sms_activations",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_sms_activations_provider_activation_id"
        ),
        "sms_activations",
        ["provider_activation_id"],
        unique=True,
    )

    op.create_index(
        op.f(
            "ix_sms_activations_service_code"
        ),
        "sms_activations",
        ["service_code"],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_sms_activations_status"
        ),
        "sms_activations",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    # As purchases do HardtSMS apontam para o produto
    # hardt-sms. Para restaurar completamente o estado
    # anterior, removemos primeiro essas compras.
    #
    # O FK purchase_id -> purchases.id possui CASCADE,
    # então as respectivas sms_activations também são
    # removidas.
    op.execute(
        sa.text(
            """
            DELETE FROM purchases
            WHERE id IN (
                SELECT purchase_id
                FROM sms_activations
            );
            """
        )
    )

    op.drop_index(
        op.f(
            "ix_sms_activations_status"
        ),
        table_name="sms_activations",
    )

    op.drop_index(
        op.f(
            "ix_sms_activations_service_code"
        ),
        table_name="sms_activations",
    )

    op.drop_index(
        op.f(
            "ix_sms_activations_provider_activation_id"
        ),
        table_name="sms_activations",
    )

    op.drop_index(
        op.f(
            "ix_sms_activations_user_id"
        ),
        table_name="sms_activations",
    )

    op.drop_index(
        op.f(
            "ix_sms_activations_purchase_id"
        ),
        table_name="sms_activations",
    )

    op.drop_table(
        "sms_activations"
    )

    op.execute(
        sa.text(
            """
            DELETE FROM products
            WHERE slug = 'hardt-sms'
              AND delivery_type = 'service';
            """
        )
    )
