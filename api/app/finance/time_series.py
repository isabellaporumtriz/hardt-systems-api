from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.finance.exclusions import included_source_clause
from app.finance.models import (
    Charge,
    ManualFinancialEntry,
)
from app.finance.schemas import (
    FinancialTimeSeriesPointResponse,
    FinancialTimeSeriesResponse,
)
from app.inventory.models import Purchase
from app.products.models import Product
from app.sms.models import SMSActivation
from app.smm.models import SMMOrder
from app.wallet.models import WalletTopup


TIMEZONE = "America/Sao_Paulo"

GRANULARITIES = {
    "day",
    "month",
}

BUSINESS_UNITS = {
    "hardt_api",
    "hardt_studio",
    "hardt_systems",
    "corporate",
}


def get_financial_time_series(
    db: Session,
    *,
    granularity: str = "day",
    business_unit: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> FinancialTimeSeriesResponse:
    """
    Série temporal reconciliável com:
    - DRE gerencial;
    - fluxo de caixa.

    Buckets são calculados no fuso America/Sao_Paulo.

    WalletTopup aparece apenas no consolidado porque
    representa caixa recebido ainda não atribuído a uma
    unidade de negócio.
    """

    if granularity not in GRANULARITIES:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "granularity deve ser day ou month."
            ),
        )

    if (
        business_unit is not None
        and business_unit not in BUSINESS_UNITS
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail="business_unit inválida.",
        )

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

    metric_fields = (
        "charge_revenue",
        "purchase_revenue",
        "manual_revenue",
        "sms_provider_cost",
        "smm_provider_cost",
        "manual_direct_cost",
        "operating_expenses",
        "other_expenses",
        "charge_inflows",
        "wallet_topup_inflows",
        "manual_inflows",
        "charge_refund_outflows",
        "manual_outflows",
    )

    buckets: dict[
        date,
        dict[str, Any],
    ] = {}

    def bucket_expression(column):
        local_timestamp = func.timezone(
            TIMEZONE,
            column,
        )

        return cast(
            func.date_trunc(
                granularity,
                local_timestamp,
            ),
            Date,
        )

    def ensure_bucket(
        period_start: date,
    ) -> dict[str, Any]:
        if period_start not in buckets:
            row: dict[str, Any] = {
                "period_start": period_start,
            }

            for field in metric_fields:
                row[field] = zero

            buckets[period_start] = row

        return buckets[period_start]

    def add_value(
        period_start: date,
        field: str,
        amount: Decimal | None,
    ) -> None:
        bucket = ensure_bucket(
            period_start
        )

        bucket[field] += Decimal(
            amount or zero
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

    def apply_unit(
        statement,
        unit_expression,
    ):
        if business_unit is not None:
            statement = statement.where(
                unit_expression
                == business_unit
            )

        return statement

    # ========================================================
    # 1. CHARGE REVENUE — DRE
    # ========================================================

    charge_unit = func.coalesce(
        Product.business_unit,
        "corporate",
    )

    charge_revenue_bucket = (
        bucket_expression(
            Charge.paid_at
        )
    )

    statement = (
        select(
            charge_revenue_bucket.label(
                "period_start"
            ),
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
            Charge.status == "paid",
            Charge.paid_at.is_not(None),
            included_source_clause(
                "charge",
                Charge.id,
            ),
        )
        .group_by(
            charge_revenue_bucket
        )
    )

    statement = apply_period(
        statement,
        Charge.paid_at,
    )

    statement = apply_unit(
        statement,
        charge_unit,
    )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "charge_revenue",
            row.amount,
        )

    # ========================================================
    # 2. PURCHASE REVENUE — DRE
    # ========================================================

    purchase_bucket = (
        bucket_expression(
            Purchase.completed_at
        )
    )

    statement = (
        select(
            purchase_bucket.label(
                "period_start"
            ),
            func.sum(
                Purchase.amount_brl
            ).label("amount"),
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
        .group_by(
            purchase_bucket
        )
    )

    statement = apply_period(
        statement,
        Purchase.completed_at,
    )

    statement = apply_unit(
        statement,
        Product.business_unit,
    )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "purchase_revenue",
            row.amount,
        )

    # ========================================================
    # 3. RECEITA MANUAL — DRE E CAIXA
    # ========================================================

    manual_effective_at = func.coalesce(
        ManualFinancialEntry.settled_at,
        ManualFinancialEntry.occurred_at,
    )

    manual_bucket = bucket_expression(
        manual_effective_at
    )

    statement = (
        select(
            manual_bucket.label(
                "period_start"
            ),
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
            manual_bucket
        )
    )

    statement = apply_period(
        statement,
        manual_effective_at,
    )

    if business_unit is not None:
        statement = statement.where(
            ManualFinancialEntry.business_unit
            == business_unit
        )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "manual_revenue",
            row.amount,
        )

        add_value(
            row.period_start,
            "manual_inflows",
            row.amount,
        )

    # ========================================================
    # 4. SMS PROVIDER COST — DRE
    # ========================================================

    sms_bucket = bucket_expression(
        Purchase.completed_at
    )

    statement = (
        select(
            sms_bucket.label(
                "period_start"
            ),
            func.sum(
                SMSActivation.provider_cost_brl
            ).label("amount"),
        )
        .select_from(SMSActivation)
        .join(
            Purchase,
            Purchase.id
            == SMSActivation.purchase_id,
        )
        .join(
            Product,
            Product.id
            == Purchase.product_id,
        )
        .where(
            Purchase.status == "completed",
            Purchase.completed_at.is_not(None),
            included_source_clause(
                "purchase",
                Purchase.id,
            ),
        )
        .group_by(
            sms_bucket
        )
    )

    statement = apply_period(
        statement,
        Purchase.completed_at,
    )

    statement = apply_unit(
        statement,
        Product.business_unit,
    )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "sms_provider_cost",
            row.amount,
        )

    # ========================================================
    # 5. SMM PROVIDER COST — DRE
    # ========================================================

    smm_bucket = bucket_expression(
        Purchase.completed_at
    )

    smm_cost_brl = (
        SMMOrder.provider_cost_usd
        * SMMOrder.usd_brl_rate
    )

    statement = (
        select(
            smm_bucket.label(
                "period_start"
            ),
            func.sum(
                smm_cost_brl
            ).label("amount"),
        )
        .select_from(SMMOrder)
        .join(
            Purchase,
            Purchase.id
            == SMMOrder.purchase_id,
        )
        .join(
            Product,
            Product.id
            == Purchase.product_id,
        )
        .where(
            Purchase.status == "completed",
            Purchase.completed_at.is_not(None),
            included_source_clause(
                "purchase",
                Purchase.id,
            ),
        )
        .group_by(
            smm_bucket
        )
    )

    statement = apply_period(
        statement,
        Purchase.completed_at,
    )

    statement = apply_unit(
        statement,
        Product.business_unit,
    )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "smm_provider_cost",
            row.amount,
        )

    # ========================================================
    # 6. DESPESAS MANUAIS — DRE E CAIXA
    # ========================================================

    expense_bucket = bucket_expression(
        manual_effective_at
    )

    statement = (
        select(
            expense_bucket.label(
                "period_start"
            ),
            ManualFinancialEntry.nature,
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
            expense_bucket,
            ManualFinancialEntry.nature,
        )
    )

    statement = apply_period(
        statement,
        manual_effective_at,
    )

    if business_unit is not None:
        statement = statement.where(
            ManualFinancialEntry.business_unit
            == business_unit
        )

    for row in db.execute(
        statement
    ).all():
        if row.nature == "direct_cost":
            field = "manual_direct_cost"

        elif row.nature == "operating_expense":
            field = "operating_expenses"

        else:
            field = "other_expenses"

        add_value(
            row.period_start,
            field,
            row.amount,
        )

        add_value(
            row.period_start,
            "manual_outflows",
            row.amount,
        )

    # ========================================================
    # 7. CHARGE INFLOWS — CAIXA
    # ========================================================

    cash_charge_bucket = (
        bucket_expression(
            Charge.paid_at
        )
    )

    statement = (
        select(
            cash_charge_bucket.label(
                "period_start"
            ),
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
            included_source_clause(
                "charge",
                Charge.id,
            ),
        )
        .group_by(
            cash_charge_bucket
        )
    )

    statement = apply_period(
        statement,
        Charge.paid_at,
    )

    statement = apply_unit(
        statement,
        charge_unit,
    )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "charge_inflows",
            row.amount,
        )

    # ========================================================
    # 8. WALLET TOPUPS — CAIXA NÃO ALOCADO
    # ========================================================

    if business_unit is None:
        topup_bucket = (
            bucket_expression(
                WalletTopup.paid_at
            )
        )

        statement = (
            select(
                topup_bucket.label(
                    "period_start"
                ),
                func.sum(
                    WalletTopup.amount_brl
                ).label("amount"),
            )
            .where(
                WalletTopup.paid_at.is_not(None),
                included_source_clause(
                    "wallet_topup",
                    WalletTopup.id,
                ),
            )
            .group_by(
                topup_bucket
            )
        )

        statement = apply_period(
            statement,
            WalletTopup.paid_at,
        )

        for row in db.execute(
            statement
        ).all():
            add_value(
                row.period_start,
                "wallet_topup_inflows",
                row.amount,
            )

    # ========================================================
    # 9. CHARGE REFUNDS — CAIXA
    # ========================================================

    refund_bucket = (
        bucket_expression(
            Charge.refunded_at
        )
    )

    statement = (
        select(
            refund_bucket.label(
                "period_start"
            ),
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
            included_source_clause(
                "charge",
                Charge.id,
            ),
        )
        .group_by(
            refund_bucket
        )
    )

    statement = apply_period(
        statement,
        Charge.refunded_at,
    )

    statement = apply_unit(
        statement,
        charge_unit,
    )

    for row in db.execute(
        statement
    ).all():
        add_value(
            row.period_start,
            "charge_refund_outflows",
            row.amount,
        )

    # ========================================================
    # 10. CÁLCULOS DERIVADOS
    # ========================================================

    points = []

    for period_start in sorted(
        buckets
    ):
        row = buckets[period_start]

        total_revenue = (
            row["charge_revenue"]
            + row["purchase_revenue"]
            + row["manual_revenue"]
        )

        direct_costs = (
            row["sms_provider_cost"]
            + row["smm_provider_cost"]
            + row["manual_direct_cost"]
        )

        gross_profit = (
            total_revenue
            - direct_costs
        )

        net_result = (
            gross_profit
            - row["operating_expenses"]
            - row["other_expenses"]
        )

        total_inflows = (
            row["charge_inflows"]
            + row["wallet_topup_inflows"]
            + row["manual_inflows"]
        )

        total_outflows = (
            row["charge_refund_outflows"]
            + row["manual_outflows"]
        )

        net_cash_flow = (
            total_inflows
            - total_outflows
        )

        points.append(
            FinancialTimeSeriesPointResponse(
                period_start=period_start,

                charge_revenue=(
                    row["charge_revenue"]
                ),
                purchase_revenue=(
                    row["purchase_revenue"]
                ),
                manual_revenue=(
                    row["manual_revenue"]
                ),
                total_revenue=(
                    total_revenue
                ),

                sms_provider_cost=(
                    row["sms_provider_cost"]
                ),
                smm_provider_cost=(
                    row["smm_provider_cost"]
                ),
                manual_direct_cost=(
                    row["manual_direct_cost"]
                ),
                direct_costs=(
                    direct_costs
                ),

                operating_expenses=(
                    row["operating_expenses"]
                ),
                other_expenses=(
                    row["other_expenses"]
                ),

                gross_profit=(
                    gross_profit
                ),
                net_result=(
                    net_result
                ),

                charge_inflows=(
                    row["charge_inflows"]
                ),
                wallet_topup_inflows=(
                    row["wallet_topup_inflows"]
                ),
                manual_inflows=(
                    row["manual_inflows"]
                ),
                total_inflows=(
                    total_inflows
                ),

                charge_refund_outflows=(
                    row[
                        "charge_refund_outflows"
                    ]
                ),
                manual_outflows=(
                    row["manual_outflows"]
                ),
                total_outflows=(
                    total_outflows
                ),

                net_cash_flow=(
                    net_cash_flow
                ),
            )
        )

    return FinancialTimeSeriesResponse(
        granularity=granularity,
        timezone=TIMEZONE,
        business_unit=business_unit,
        start_at=start_at,
        end_at=end_at,
        points=points,
    )
