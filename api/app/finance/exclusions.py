from uuid import UUID

from sqlalchemy import (
    ForeignKey,
    String,
    UniqueConstraint,
    Uuid,
    exists,
    select,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import BaseModel


FINANCIAL_SOURCE_TYPES = {
    "charge",
    "purchase",
    "wallet_topup",
}


class FinancialSourceExclusion(BaseModel):
    __tablename__ = "financial_source_exclusions"

    __table_args__ = (
        UniqueConstraint(
            "source_type",
            "source_id",
            name=(
                "uq_financial_source_"
                "exclusions_source"
            ),
        ),
    )

    source_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    source_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )

    reason: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default=(
            "Excluído manualmente "
            "do Finance V2"
        ),
    )

    excluded_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )


def included_source_clause(
    source_type: str,
    source_id_column,
):
    """
    SQL expression que mantém apenas fontes que
    não foram excluídas do Finance V2.
    """

    return ~exists(
        select(
            FinancialSourceExclusion.id
        ).where(
            FinancialSourceExclusion.source_type
            == source_type,
            FinancialSourceExclusion.source_id
            == source_id_column,
        )
    )
