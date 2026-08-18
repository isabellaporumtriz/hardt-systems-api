from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.finance.models import (
    Charge,
    ManualFinancialEntry,
)
from app.finance.schemas import (
    FinancialCashFlowSummaryResponse,
    FinancialCashFlowUnitResponse,
)
from app.products.models import Product
from app.wallet.models import WalletTopup


BUSINESS_UNITS = (
    "hardt_api",
    "hardt_studio",
    "hardt_systems",
    "corporate",
)


def get_financial_cash_flow(
    db: Session,
    *,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> FinancialCashFlowSummaryResponse:
    """
    Fluxo de caixa efetivo da Hardt.

    Entradas:
    - Charge com paid_at
    - WalletTopup com paid_at
    - Manual income settled

    Saídas:
    - Charge com refunded_at
    - Manual expense settled

    Purchase e WalletTransaction NÃO representam
    dinheiro novo entrando ou saindo da empresa.

    Custos operacionais de provider também não são
    tratados automaticamente como saída de caixa,
    pois podem consumir saldo previamente aportado.
    """

    if (
        start_at is not None
        and end_at is not None
        and end_at <= start_at
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "end_at deve ser posterior a start_at."
            ),
        )

    zero = Decimal("0.00")

    unit_data = {
        unit: {
            "charge_inflows": zero,
            "manual_inflows": zero,
            "charge_refund_outflows": zero,
            "manual_outflows": zero,
        }
        for unit in BUSINESS_UNITS
    }

    def normalize_unit(
        value: str | None,
    ) -> str:
        if value in BUSINESS_UNITS:
            return str(value)

        return "corporate"

    def add_unit_value(
        unit: str | None,
        field: str,
        value: Decimal | None,
    ) -> None:
        normalized = normalize_unit(
            unit
        )

        unit_data[normalized][field] += Decimal(
            value or zero
        )

    def apply_period(
        statement,
        column,
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

    # ========================================================
    # 1. CHARGES RECEBIDAS
    #
    # paid_at é o evento de caixa.
    #
    # Não filtramos apenas status="paid", porque uma cobrança
    # pode ter sido paga e posteriormente reembolsada.
    # Nesse caso:
    # - paid_at = entrada histórica
    # - refunded_at = saída histórica
    # ========================================================

    charge_unit = func.coalesce(
        Product.business_unit,
        "corporate",
    )

    charge_inflow_statement = (
        select(
            charge_unit.label(
                "business_unit"
            ),
            func.count(
                Charge.id
            ).label("count"),
            func.sum(
                Charge.amount
            ).label("amount"),
        )
        .select_from(Charge)
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .where(
            Charge.paid_at.is_not(None),
        )
        .group_by(
            charge_unit
        )
    )

    charge_inflow_statement = apply_period(
        charge_inflow_statement,
        Charge.paid_at,
    )

    charge_inflow_count = 0
    charge_inflows = zero

    for row in db.execute(
        charge_inflow_statement
    ).all():
        count = int(
            row.count or 0
        )

        amount = Decimal(
            row.amount or zero
        )

        charge_inflow_count += count
        charge_inflows += amount

        add_unit_value(
            row.business_unit,
            "charge_inflows",
            amount,
        )

    # ========================================================
    # 2. WALLET TOPUPS RECEBIDOS
    #
    # O topup é dinheiro novo recebido pela Hardt,
    # mas ainda não pertence economicamente a um produto
    # ou unidade específica.
    #
    # Por isso permanece NÃO ALOCADO no fluxo de caixa.
    # ========================================================

    topup_statement = (
        select(
            func.count(
                WalletTopup.id
            ).label("count"),
            func.coalesce(
                func.sum(
                    WalletTopup.amount_brl
                ),
                0,
            ).label("amount"),
        )
        .where(
            WalletTopup.paid_at.is_not(None),
        )
    )

    topup_statement = apply_period(
        topup_statement,
        WalletTopup.paid_at,
    )

    topup_row = db.execute(
        topup_statement
    ).one()

    wallet_topup_count = int(
        topup_row.count or 0
    )

    wallet_topup_inflows = Decimal(
        topup_row.amount or zero
    )

    # ========================================================
    # 3. RECEITAS MANUAIS RECEBIDAS
    # ========================================================

    manual_effective_at = func.coalesce(
        ManualFinancialEntry.settled_at,
        ManualFinancialEntry.occurred_at,
    )

    manual_income_statement = (
        select(
            ManualFinancialEntry.business_unit,
            func.count(
                ManualFinancialEntry.id
            ).label("count"),
            func.sum(
                ManualFinancialEntry.amount
            ).label("amount"),
        )
        .where(
            ManualFinancialEntry.status
            == "settled",
            ManualFinancialEntry.entry_type
            == "income",
        )
        .group_by(
            ManualFinancialEntry.business_unit
        )
    )

    manual_income_statement = apply_period(
        manual_income_statement,
        manual_effective_at,
    )

    manual_inflow_count = 0
    manual_inflows = zero

    for row in db.execute(
        manual_income_statement
    ).all():
        count = int(
            row.count or 0
        )

        amount = Decimal(
            row.amount or zero
        )

        manual_inflow_count += count
        manual_inflows += amount

        add_unit_value(
            row.business_unit,
            "manual_inflows",
            amount,
        )

    # ========================================================
    # 4. REEMBOLSOS DE CHARGES
    #
    # Modelo atual não possui refund_amount.
    # Portanto refunded_at representa reembolso integral.
    # ========================================================

    charge_refund_statement = (
        select(
            charge_unit.label(
                "business_unit"
            ),
            func.count(
                Charge.id
            ).label("count"),
            func.sum(
                Charge.amount
            ).label("amount"),
        )
        .select_from(Charge)
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .where(
            Charge.refunded_at.is_not(None),
        )
        .group_by(
            charge_unit
        )
    )

    charge_refund_statement = apply_period(
        charge_refund_statement,
        Charge.refunded_at,
    )

    charge_refund_count = 0
    charge_refund_outflows = zero

    for row in db.execute(
        charge_refund_statement
    ).all():
        count = int(
            row.count or 0
        )

        amount = Decimal(
            row.amount or zero
        )

        charge_refund_count += count
        charge_refund_outflows += amount

        add_unit_value(
            row.business_unit,
            "charge_refund_outflows",
            amount,
        )

    # ========================================================
    # 5. DESPESAS MANUAIS PAGAS
    # ========================================================

    manual_expense_statement = (
        select(
            ManualFinancialEntry.business_unit,
            func.count(
                ManualFinancialEntry.id
            ).label("count"),
            func.sum(
                ManualFinancialEntry.amount
            ).label("amount"),
        )
        .where(
            ManualFinancialEntry.status
            == "settled",
            ManualFinancialEntry.entry_type
            == "expense",
        )
        .group_by(
            ManualFinancialEntry.business_unit
        )
    )

    manual_expense_statement = apply_period(
        manual_expense_statement,
        manual_effective_at,
    )

    manual_outflow_count = 0
    manual_outflows = zero

    for row in db.execute(
        manual_expense_statement
    ).all():
        count = int(
            row.count or 0
        )

        amount = Decimal(
            row.amount or zero
        )

        manual_outflow_count += count
        manual_outflows += amount

        add_unit_value(
            row.business_unit,
            "manual_outflows",
            amount,
        )

    # ========================================================
    # 6. TOTAIS
    # ========================================================

    total_inflows = (
        charge_inflows
        + wallet_topup_inflows
        + manual_inflows
    )

    total_outflows = (
        charge_refund_outflows
        + manual_outflows
    )

    net_cash_flow = (
        total_inflows
        - total_outflows
    )

    # ========================================================
    # 7. UNIDADES
    #
    # WalletTopup NÃO é artificialmente atribuído
    # a hardt.api / studio / systems / corporate.
    # ========================================================

    unit_responses = []

    for unit in BUSINESS_UNITS:
        values = unit_data[unit]

        attributable_inflows = (
            values["charge_inflows"]
            + values["manual_inflows"]
        )

        attributable_outflows = (
            values["charge_refund_outflows"]
            + values["manual_outflows"]
        )

        unit_responses.append(
            FinancialCashFlowUnitResponse(
                business_unit=unit,

                charge_inflows=(
                    values[
                        "charge_inflows"
                    ]
                ),
                manual_inflows=(
                    values[
                        "manual_inflows"
                    ]
                ),
                attributable_inflows=(
                    attributable_inflows
                ),

                charge_refund_outflows=(
                    values[
                        "charge_refund_outflows"
                    ]
                ),
                manual_outflows=(
                    values[
                        "manual_outflows"
                    ]
                ),
                attributable_outflows=(
                    attributable_outflows
                ),

                net_attributable_cash_flow=(
                    attributable_inflows
                    - attributable_outflows
                ),
            )
        )

    return FinancialCashFlowSummaryResponse(
        start_at=start_at,
        end_at=end_at,

        charge_inflow_count=(
            charge_inflow_count
        ),
        charge_inflows=(
            charge_inflows
        ),

        wallet_topup_count=(
            wallet_topup_count
        ),
        wallet_topup_inflows=(
            wallet_topup_inflows
        ),

        manual_inflow_count=(
            manual_inflow_count
        ),
        manual_inflows=(
            manual_inflows
        ),

        total_inflows=(
            total_inflows
        ),

        charge_refund_count=(
            charge_refund_count
        ),
        charge_refund_outflows=(
            charge_refund_outflows
        ),

        manual_outflow_count=(
            manual_outflow_count
        ),
        manual_outflows=(
            manual_outflows
        ),

        total_outflows=(
            total_outflows
        ),

        net_cash_flow=(
            net_cash_flow
        ),

        unallocated_wallet_inflows=(
            wallet_topup_inflows
        ),

        units=unit_responses,
    )
