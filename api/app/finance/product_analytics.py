from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.finance.models import (
    Charge,
    ManualFinancialEntry,
)
from app.finance.schemas import (
    FinancialProductPerformanceItemResponse,
    FinancialProductPerformanceSummaryResponse,
)
from app.inventory.models import Purchase
from app.products.models import Product
from app.sms.models import SMSActivation
from app.smm.models import SMMOrder


BUSINESS_UNITS = (
    "hardt_api",
    "hardt_studio",
    "hardt_systems",
    "corporate",
)


def get_product_financial_performance(
    db: Session,
    *,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> FinancialProductPerformanceSummaryResponse:
    """
    Breakdown gerencial por produto.

    Produtos sem movimento continuam aparecendo com zero.

    Lançamentos sem product_id são preservados em buckets
    "Sem produto" por business_unit, permitindo reconciliação
    integral com o consolidado.
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
    hundred = Decimal("100.00")

    metric_fields = (
        "charge_revenue",
        "purchase_revenue",
        "manual_revenue",
        "sms_provider_cost",
        "smm_provider_cost",
        "manual_direct_cost",
        "operating_expenses",
        "other_expenses",
    )

    count_fields = (
        "charge_count",
        "purchase_count",
        "manual_income_count",
    )

    rows: dict[
        tuple[UUID | None, str],
        dict[str, Any],
    ] = {}

    def normalize_unit(
        value: str | None,
    ) -> str:
        if value in BUSINESS_UNITS:
            return str(value)

        return "corporate"

    def ensure_bucket(
        *,
        product_id: UUID | None,
        product_name: str | None,
        product_slug: str | None,
        business_unit: str | None,
    ) -> dict[str, Any]:
        unit = normalize_unit(
            business_unit
        )

        key = (
            product_id,
            unit,
        )

        if key not in rows:
            bucket: dict[str, Any] = {
                "product_id": product_id,
                "product_name": (
                    product_name
                    if product_name
                    else "Sem produto"
                ),
                "product_slug": product_slug,
                "business_unit": unit,
            }

            for field in metric_fields:
                bucket[field] = zero

            for field in count_fields:
                bucket[field] = 0

            rows[key] = bucket

        return rows[key]

    def add_decimal(
        bucket: dict[str, Any],
        field: str,
        value: Decimal | None,
    ) -> None:
        bucket[field] += Decimal(
            value or zero
        )

    def add_count(
        bucket: dict[str, Any],
        field: str,
        value: int | None,
    ) -> None:
        bucket[field] += int(
            value or 0
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
    # 0. TODOS OS PRODUTOS
    # ========================================================

    products = db.execute(
        select(
            Product.id,
            Product.name,
            Product.slug,
            Product.business_unit,
        )
        .order_by(
            Product.name.asc()
        )
    ).all()

    for (
        product_id,
        product_name,
        product_slug,
        business_unit,
    ) in products:
        ensure_bucket(
            product_id=product_id,
            product_name=product_name,
            product_slug=product_slug,
            business_unit=business_unit,
        )

    # ========================================================
    # 1. CHARGES PAGAS
    # ========================================================

    charge_unit = func.coalesce(
        Product.business_unit,
        "corporate",
    )

    charge_statement = (
        select(
            Charge.product_id,
            Product.name,
            Product.slug,
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
            Charge.status == "paid",
            Charge.paid_at.is_not(None),
        )
        .group_by(
            Charge.product_id,
            Product.name,
            Product.slug,
            charge_unit,
        )
    )

    charge_statement = apply_period(
        charge_statement,
        Charge.paid_at,
    )

    for row in db.execute(
        charge_statement
    ).all():
        bucket = ensure_bucket(
            product_id=row.product_id,
            product_name=row.name,
            product_slug=row.slug,
            business_unit=row.business_unit,
        )

        add_decimal(
            bucket,
            "charge_revenue",
            row.amount,
        )

        add_count(
            bucket,
            "charge_count",
            row.count,
        )

    # ========================================================
    # 2. PURCHASES CONCLUÍDAS
    # ========================================================

    purchase_statement = (
        select(
            Purchase.product_id,
            Product.name,
            Product.slug,
            Product.business_unit,
            func.count(
                Purchase.id
            ).label("count"),
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
        )
        .group_by(
            Purchase.product_id,
            Product.name,
            Product.slug,
            Product.business_unit,
        )
    )

    purchase_statement = apply_period(
        purchase_statement,
        Purchase.completed_at,
    )

    for row in db.execute(
        purchase_statement
    ).all():
        bucket = ensure_bucket(
            product_id=row.product_id,
            product_name=row.name,
            product_slug=row.slug,
            business_unit=row.business_unit,
        )

        add_decimal(
            bucket,
            "purchase_revenue",
            row.amount,
        )

        add_count(
            bucket,
            "purchase_count",
            row.count,
        )

    # ========================================================
    # 3. RECEITA MANUAL
    # ========================================================

    manual_effective_at = func.coalesce(
        ManualFinancialEntry.settled_at,
        ManualFinancialEntry.occurred_at,
    )

    manual_income_statement = (
        select(
            ManualFinancialEntry.product_id,
            Product.name,
            Product.slug,
            ManualFinancialEntry.business_unit,
            func.count(
                ManualFinancialEntry.id
            ).label("count"),
            func.sum(
                ManualFinancialEntry.amount
            ).label("amount"),
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
            == "settled",
            ManualFinancialEntry.entry_type
            == "income",
        )
        .group_by(
            ManualFinancialEntry.product_id,
            Product.name,
            Product.slug,
            ManualFinancialEntry.business_unit,
        )
    )

    manual_income_statement = apply_period(
        manual_income_statement,
        manual_effective_at,
    )

    for row in db.execute(
        manual_income_statement
    ).all():
        bucket = ensure_bucket(
            product_id=row.product_id,
            product_name=row.name,
            product_slug=row.slug,
            business_unit=row.business_unit,
        )

        add_decimal(
            bucket,
            "manual_revenue",
            row.amount,
        )

        add_count(
            bucket,
            "manual_income_count",
            row.count,
        )

    # ========================================================
    # 4. CUSTO SMS
    # ========================================================

    sms_statement = (
        select(
            Purchase.product_id,
            Product.name,
            Product.slug,
            Product.business_unit,
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
        )
        .group_by(
            Purchase.product_id,
            Product.name,
            Product.slug,
            Product.business_unit,
        )
    )

    sms_statement = apply_period(
        sms_statement,
        Purchase.completed_at,
    )

    for row in db.execute(
        sms_statement
    ).all():
        bucket = ensure_bucket(
            product_id=row.product_id,
            product_name=row.name,
            product_slug=row.slug,
            business_unit=row.business_unit,
        )

        add_decimal(
            bucket,
            "sms_provider_cost",
            row.amount,
        )

    # ========================================================
    # 5. CUSTO SMM
    # ========================================================

    smm_cost_brl = (
        SMMOrder.provider_cost_usd
        * SMMOrder.usd_brl_rate
    )

    smm_statement = (
        select(
            Purchase.product_id,
            Product.name,
            Product.slug,
            Product.business_unit,
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
        )
        .group_by(
            Purchase.product_id,
            Product.name,
            Product.slug,
            Product.business_unit,
        )
    )

    smm_statement = apply_period(
        smm_statement,
        Purchase.completed_at,
    )

    for row in db.execute(
        smm_statement
    ).all():
        bucket = ensure_bucket(
            product_id=row.product_id,
            product_name=row.name,
            product_slug=row.slug,
            business_unit=row.business_unit,
        )

        add_decimal(
            bucket,
            "smm_provider_cost",
            row.amount,
        )

    # ========================================================
    # 6. DESPESAS MANUAIS
    # ========================================================

    manual_expense_statement = (
        select(
            ManualFinancialEntry.product_id,
            Product.name,
            Product.slug,
            ManualFinancialEntry.business_unit,
            ManualFinancialEntry.nature,
            func.sum(
                ManualFinancialEntry.amount
            ).label("amount"),
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
            == "settled",
            ManualFinancialEntry.entry_type
            == "expense",
        )
        .group_by(
            ManualFinancialEntry.product_id,
            Product.name,
            Product.slug,
            ManualFinancialEntry.business_unit,
            ManualFinancialEntry.nature,
        )
    )

    manual_expense_statement = apply_period(
        manual_expense_statement,
        manual_effective_at,
    )

    for row in db.execute(
        manual_expense_statement
    ).all():
        bucket = ensure_bucket(
            product_id=row.product_id,
            product_name=row.name,
            product_slug=row.slug,
            business_unit=row.business_unit,
        )

        if row.nature == "direct_cost":
            field = "manual_direct_cost"

        elif row.nature == "operating_expense":
            field = "operating_expenses"

        else:
            field = "other_expenses"

        add_decimal(
            bucket,
            field,
            row.amount,
        )

    # ========================================================
    # 7. RECEITA GLOBAL PARA SHARE
    # ========================================================

    total_revenue_all = sum(
        (
            bucket["charge_revenue"]
            + bucket["purchase_revenue"]
            + bucket["manual_revenue"]
        )
        for bucket in rows.values()
    )

    # ========================================================
    # 8. RESPOSTAS
    # ========================================================

    items: list[
        FinancialProductPerformanceItemResponse
    ] = []

    for bucket in rows.values():
        total_revenue = (
            bucket["charge_revenue"]
            + bucket["purchase_revenue"]
            + bucket["manual_revenue"]
        )

        direct_costs = (
            bucket["sms_provider_cost"]
            + bucket["smm_provider_cost"]
            + bucket["manual_direct_cost"]
        )

        gross_profit = (
            total_revenue
            - direct_costs
        )

        net_result = (
            gross_profit
            - bucket["operating_expenses"]
            - bucket["other_expenses"]
        )

        if total_revenue:
            gross_margin_percent = (
                gross_profit
                / total_revenue
                * hundred
            )

            net_margin_percent = (
                net_result
                / total_revenue
                * hundred
            )

            revenue_share_percent = (
                total_revenue
                / total_revenue_all
                * hundred
            )

        else:
            gross_margin_percent = zero
            net_margin_percent = zero
            revenue_share_percent = zero

        total_sales_count = (
            bucket["charge_count"]
            + bucket["purchase_count"]
            + bucket["manual_income_count"]
        )

        items.append(
            FinancialProductPerformanceItemResponse(
                product_id=(
                    bucket["product_id"]
                ),
                product_name=(
                    bucket["product_name"]
                ),
                product_slug=(
                    bucket["product_slug"]
                ),
                business_unit=(
                    bucket["business_unit"]
                ),

                charge_count=(
                    bucket["charge_count"]
                ),
                purchase_count=(
                    bucket["purchase_count"]
                ),
                manual_income_count=(
                    bucket[
                        "manual_income_count"
                    ]
                ),
                total_sales_count=(
                    total_sales_count
                ),

                charge_revenue=(
                    bucket["charge_revenue"]
                ),
                purchase_revenue=(
                    bucket["purchase_revenue"]
                ),
                manual_revenue=(
                    bucket["manual_revenue"]
                ),
                total_revenue=total_revenue,

                sms_provider_cost=(
                    bucket[
                        "sms_provider_cost"
                    ]
                ),
                smm_provider_cost=(
                    bucket[
                        "smm_provider_cost"
                    ]
                ),
                manual_direct_cost=(
                    bucket[
                        "manual_direct_cost"
                    ]
                ),
                direct_costs=direct_costs,

                gross_profit=gross_profit,
                gross_margin_percent=(
                    gross_margin_percent
                ),

                operating_expenses=(
                    bucket[
                        "operating_expenses"
                    ]
                ),
                other_expenses=(
                    bucket["other_expenses"]
                ),

                net_result=net_result,
                net_margin_percent=(
                    net_margin_percent
                ),

                revenue_share_percent=(
                    revenue_share_percent
                ),
            )
        )

    items.sort(
        key=lambda item: (
            -item.total_revenue,
            item.product_name.lower(),
            item.business_unit,
        )
    )

    # ========================================================
    # 9. TOTAIS
    # ========================================================

    total_revenue = sum(
        item.total_revenue
        for item in items
    )

    direct_costs = sum(
        item.direct_costs
        for item in items
    )

    gross_profit = (
        total_revenue
        - direct_costs
    )

    operating_expenses = sum(
        item.operating_expenses
        for item in items
    )

    other_expenses = sum(
        item.other_expenses
        for item in items
    )

    net_result = (
        gross_profit
        - operating_expenses
        - other_expenses
    )

    return FinancialProductPerformanceSummaryResponse(
        start_at=start_at,
        end_at=end_at,
        total_revenue=total_revenue,
        direct_costs=direct_costs,
        gross_profit=gross_profit,
        operating_expenses=operating_expenses,
        other_expenses=other_expenses,
        net_result=net_result,
        products=items,
    )
