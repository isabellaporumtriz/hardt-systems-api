"""create plans table

Revision ID: fc715c13e600
Revises: 68afad497a4b
Create Date: 2026-07-29 18:14:04.228990

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fc715c13e600'
down_revision: Union[str, Sequence[str], None] = '68afad497a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
