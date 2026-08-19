"""add argos meta profile pool

Revision ID: e31c4f72a9d0
Revises: d7e3a91c4f20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e31c4f72a9d0"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "d7e3a91c4f20"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "argos_meta_profiles",

        sa.Column(
            "label",
            sa.String(length=180),
            nullable=False,
        ),

        sa.Column(
            "facebook_id",
            sa.String(length=120),
            nullable=True,
        ),

        sa.Column(
            "profile_ref",
            sa.String(length=180),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="available",
        ),

        sa.Column(
            "capacity",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),

        sa.Column(
            "encrypted_payload",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "notes",
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
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "profile_ref",
            name="uq_argos_meta_profiles_profile_ref",
        ),
    )

    op.create_index(
        "ix_argos_meta_profiles_facebook_id",
        "argos_meta_profiles",
        ["facebook_id"],
    )

    op.create_index(
        "ix_argos_meta_profiles_profile_ref",
        "argos_meta_profiles",
        ["profile_ref"],
        unique=True,
    )

    op.create_index(
        "ix_argos_meta_profiles_status",
        "argos_meta_profiles",
        ["status"],
    )


    op.create_table(
        "argos_meta_assignments",

        sa.Column(
            "operation_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "meta_profile_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="reserved",
        ),

        sa.Column(
            "reserved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "login_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "released_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "business_id",
            sa.String(length=120),
            nullable=True,
        ),

        sa.Column(
            "last_error",
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
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["operation_id"],
            ["argos_operations.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["meta_profile_id"],
            ["argos_meta_profiles.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "operation_id",
            "meta_profile_id",
            name=(
                "uq_argos_meta_assignment_"
                "operation_profile"
            ),
        ),
    )

    op.create_index(
        "ix_argos_meta_assignments_operation_id",
        "argos_meta_assignments",
        ["operation_id"],
    )

    op.create_index(
        "ix_argos_meta_assignments_meta_profile_id",
        "argos_meta_assignments",
        ["meta_profile_id"],
    )

    op.create_index(
        "ix_argos_meta_assignments_status",
        "argos_meta_assignments",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_argos_meta_assignments_status",
        table_name="argos_meta_assignments",
    )

    op.drop_index(
        "ix_argos_meta_assignments_meta_profile_id",
        table_name="argos_meta_assignments",
    )

    op.drop_index(
        "ix_argos_meta_assignments_operation_id",
        table_name="argos_meta_assignments",
    )

    op.drop_table(
        "argos_meta_assignments"
    )

    op.drop_index(
        "ix_argos_meta_profiles_status",
        table_name="argos_meta_profiles",
    )

    op.drop_index(
        "ix_argos_meta_profiles_profile_ref",
        table_name="argos_meta_profiles",
    )

    op.drop_index(
        "ix_argos_meta_profiles_facebook_id",
        table_name="argos_meta_profiles",
    )

    op.drop_table(
        "argos_meta_profiles"
    )
