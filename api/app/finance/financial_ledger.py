from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.orm import Session

from app.finance.exclusions import (
    FINANCIAL_SOURCE_TYPES,
    FinancialSourceExclusion,
    included_source_clause,
)
from app.finance.models import (
    Charge,
    ManualFinancialEntry,
)
from app.finance.schemas import (
    FinancialExclusionActionResponse,
    FinancialLedgerItemResponse,
)
from app.inventory.models import Purchase
from app.products.models import Product
from app.wallet.models import WalletTopup


def _apply_period(
    statement,
    column,
    *,
    start_at: datetime | None,
    end_at: datetime | None,
):
    if start_at is not None:
        statement = statement.where(
            column >= start_at
        )

    if end_at is not None:
        statement = statement.where(
            column < end_at
        )

    return statement


def list_financial_ledger(
    db: Session,
    *,
    business_unit: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> list[FinancialLedgerItemResponse]:
    """
    Ledger operacional do Finance V2.

    Mostra somente fontes atualmente incluídas no
    financeiro. O objetivo é permitir auditoria e
    exclusão de registros de teste sem destruir o
    registro operacional original.
    """

    items: list[
        FinancialLedgerItemResponse
    ] = []

    # ========================================================
    # CHARGES RECEBIDAS
    # ========================================================

    charge_unit = func.coalesce(
        Product.business_unit,
        "corporate",
    )

    statement = (
        select(
            Charge.id,
            Charge.charge_number,
            Charge.description,
            Charge.amount,
            Charge.status,
            Charge.paid_at,
            Charge.product_id,
            Product.name.label(
                "product_name"
            ),
            charge_unit.label(
                "business_unit"
            ),
        )
        .select_from(Charge)
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .where(
            Charge.paid_at.is_not(None),
            included_source_clause(
                "charge",
                Charge.id,
            ),
        )
    )

    statement = _apply_period(
        statement,
        Charge.paid_at,
        start_at=start_at,
        end_at=end_at,
    )

    if business_unit is not None:
        statement = statement.where(
            charge_unit == business_unit
        )

    for row in db.execute(
        statement
    ).all():
        items.append(
            FinancialLedgerItemResponse(
                source_type="charge",
                source_id=row.id,
                source_label=(
                    row.charge_number
                ),
                business_unit=(
                    row.business_unit
                ),
                product_id=row.product_id,
                product_name=(
                    row.product_name
                ),
                direction="inflow",
                impact="dre_cash",
                description=(
                    row.description
                ),
                amount=Decimal(
                    row.amount
                ),
                status=row.status,
                occurred_at=row.paid_at,
                is_manual=False,
            )
        )

    # ========================================================
    # PURCHASES CONCLUÍDAS
    # ========================================================

    statement = (
        select(
            Purchase.id,
            Purchase.amount_brl,
            Purchase.status,
            Purchase.completed_at,
            Purchase.product_id,
            Product.name.label(
                "product_name"
            ),
            Product.business_unit,
        )
        .select_from(Purchase)
        .join(
            Product,
            Product.id == Purchase.product_id,
        )
        .where(
            Purchase.status == "completed",
            Purchase.completed_at.is_not(None),
            included_source_clause(
                "purchase",
                Purchase.id,
            ),
        )
    )

    statement = _apply_period(
        statement,
        Purchase.completed_at,
        start_at=start_at,
        end_at=end_at,
    )

    if business_unit is not None:
        statement = statement.where(
            Product.business_unit
            == business_unit
        )

    for row in db.execute(
        statement
    ).all():
        items.append(
            FinancialLedgerItemResponse(
                source_type="purchase",
                source_id=row.id,
                source_label="Compra no portal",
                business_unit=(
                    row.business_unit
                ),
                product_id=row.product_id,
                product_name=(
                    row.product_name
                ),
                direction="inflow",
                impact="dre",
                description=(
                    row.product_name
                ),
                amount=Decimal(
                    row.amount_brl
                ),
                status=row.status,
                occurred_at=(
                    row.completed_at
                ),
                is_manual=False,
            )
        )

    # ========================================================
    # WALLET TOPUPS
    # ========================================================

    if business_unit is None:
        statement = (
            select(
                WalletTopup.id,
                WalletTopup.amount_brl,
                WalletTopup.status,
                WalletTopup.provider,
                WalletTopup.paid_at,
            )
            .where(
                WalletTopup.paid_at.is_not(None),
                included_source_clause(
                    "wallet_topup",
                    WalletTopup.id,
                ),
            )
        )

        statement = _apply_period(
            statement,
            WalletTopup.paid_at,
            start_at=start_at,
            end_at=end_at,
        )

        for row in db.execute(
            statement
        ).all():
            items.append(
                FinancialLedgerItemResponse(
                    source_type=(
                        "wallet_topup"
                    ),
                    source_id=row.id,
                    source_label=(
                        "Recarga de carteira"
                    ),
                    business_unit=None,
                    product_id=None,
                    product_name=(
                        "Carteira Hardt"
                    ),
                    direction="inflow",
                    impact="cash",
                    description=(
                        "Recarga via "
                        + row.provider
                    ),
                    amount=Decimal(
                        row.amount_brl
                    ),
                    status=row.status,
                    occurred_at=row.paid_at,
                    is_manual=False,
                )
            )

    # ========================================================
    # LANÇAMENTOS MANUAIS
    # ========================================================

    manual_effective_at = func.coalesce(
        ManualFinancialEntry.settled_at,
        ManualFinancialEntry.occurred_at,
    )

    statement = (
        select(
            ManualFinancialEntry.id,
            ManualFinancialEntry.entry_type,
            ManualFinancialEntry.business_unit,
            ManualFinancialEntry.category,
            ManualFinancialEntry.description,
            ManualFinancialEntry.amount,
            ManualFinancialEntry.status,
            ManualFinancialEntry.product_id,
            ManualFinancialEntry.occurred_at,
            ManualFinancialEntry.settled_at,
            Product.name.label(
                "canonical_product_name"
            ),
        )
        .select_from(
            ManualFinancialEntry
        )
        .outerjoin(
            Product,
            Product.id
            == ManualFinancialEntry.product_id,
        )
        .where(
            ManualFinancialEntry.status
            != "cancelled",
        )
    )

    statement = _apply_period(
        statement,
        manual_effective_at,
        start_at=start_at,
        end_at=end_at,
    )

    if business_unit is not None:
        statement = statement.where(
            ManualFinancialEntry.business_unit
            == business_unit
        )

    for row in db.execute(
        statement
    ).all():
        product_name = (
            row.canonical_product_name
            or row.category
        )

        occurred_at = (
            row.settled_at
            or row.occurred_at
        )

        direction = (
            "inflow"
            if row.entry_type == "income"
            else "outflow"
        )

        items.append(
            FinancialLedgerItemResponse(
                source_type=(
                    "manual_entry"
                ),
                source_id=row.id,
                source_label=(
                    "Lançamento externo"
                ),
                business_unit=(
                    row.business_unit
                ),
                product_id=row.product_id,
                product_name=product_name,
                direction=direction,
                impact="dre_cash",
                description=(
                    row.description
                ),
                amount=Decimal(
                    row.amount
                ),
                status=row.status,
                occurred_at=occurred_at,
                is_manual=True,
            )
        )

    items.sort(
        key=lambda item: item.occurred_at,
        reverse=True,
    )

    return items


def exclude_financial_source(
    db: Session,
    *,
    source_type: str,
    source_id: UUID,
    excluded_by_user_id: UUID,
) -> FinancialExclusionActionResponse:
    """
    Exclui uma fonte da camada financeira sem apagar
    o registro operacional.

    ManualEntry usa o cancelamento já existente.
    """

    if source_type == "manual_entry":
        from app.finance import services

        services.cancel_manual_financial_entry(
            db,
            source_id,
        )

        return FinancialExclusionActionResponse(
            source_type=source_type,
            source_id=source_id,
            excluded=True,
        )

    if source_type not in FINANCIAL_SOURCE_TYPES:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "Tipo de fonte financeira inválido."
            ),
        )

    source_models = {
        "charge": Charge,
        "purchase": Purchase,
        "wallet_topup": WalletTopup,
    }

    model = source_models[source_type]

    source = db.get(
        model,
        source_id,
    )

    if source is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Fonte financeira não encontrada."
            ),
        )

    existing = db.scalar(
        select(
            FinancialSourceExclusion
        ).where(
            FinancialSourceExclusion.source_type
            == source_type,
            FinancialSourceExclusion.source_id
            == source_id,
        )
    )

    if existing is None:
        exclusion = FinancialSourceExclusion(
            source_type=source_type,
            source_id=source_id,
            reason=(
                "Excluído manualmente "
                "do Finance V2"
            ),
            excluded_by_user_id=(
                excluded_by_user_id
            ),
        )

        db.add(exclusion)
        db.commit()

    return FinancialExclusionActionResponse(
        source_type=source_type,
        source_id=source_id,
        excluded=True,
    )
