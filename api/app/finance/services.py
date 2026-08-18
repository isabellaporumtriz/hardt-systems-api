from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.finance import repositories
from app.finance.models import Charge, ManualFinancialEntry
from app.finance.schemas import (
    ChargeCreateRequest,
    ChargeDetailResponse,
    ChargeListItemResponse,
    ChargeStatusUpdateRequest,
    ChargeStatusUpdateResponse,
    ChargeUpdateRequest,
    FinancialDashboardResponse,
    FinancialSummaryResponse,
    MonthlyRevenueItemResponse,
    UpcomingChargeItemResponse,
    ManualFinancialEntryCreateRequest,
    ManualFinancialEntryUpdateRequest,
    FinancialManagementSummaryResponse,
    FinancialManagementUnitResponse,
)
from app.licenses.models import License
from app.products.models import Product
from app.users.models import User


ALLOWED_CHARGE_STATUSES = {
    "pending",
    "paid",
    "overdue",
    "cancelled",
    "refunded",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def start_of_month(
    value: datetime,
) -> datetime:
    return value.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def add_months(
    value: datetime,
    months: int,
) -> datetime:
    absolute_month = (
        value.year * 12
        + value.month
        - 1
        + months
    )

    year, month_index = divmod(
        absolute_month,
        12,
    )

    return value.replace(
        year=year,
        month=month_index + 1,
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def get_month_label(
    value: datetime,
) -> str:
    month_names = (
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    )

    return (
        f"{month_names[value.month - 1]} "
        f"{value.year}"
    )


def get_user_or_404(
    db: Session,
    user_id: UUID,
) -> User:
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    return user


def get_product_or_404(
    db: Session,
    product_id: UUID,
) -> Product:
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado.",
        )

    return product


def get_license_or_404(
    db: Session,
    license_id: UUID,
) -> License:
    license_record = db.get(
        License,
        license_id,
    )

    if license_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licença não encontrada.",
        )

    return license_record


def get_charge_or_404(
    db: Session,
    charge_id: UUID,
) -> Charge:
    charge = repositories.get_charge_by_id(
        db,
        charge_id,
    )

    if charge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cobrança não encontrada.",
        )

    return charge


def normalize_optional_text(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip()

    return normalized or None


def generate_charge_number(
    db: Session,
) -> str:
    statement = select(
        func.max(
            Charge.charge_number,
        )
    ).where(
        Charge.charge_number.like(
            "CHG-%",
        )
    )

    last_charge_number = db.scalar(
        statement,
    )

    next_sequence = 1

    if last_charge_number:
        try:
            current_sequence = int(
                last_charge_number.split(
                    "-",
                )[-1]
            )

            next_sequence = (
                current_sequence + 1
            )
        except (
            TypeError,
            ValueError,
            IndexError,
        ):
            next_sequence = (
                repositories.count_charges(
                    db,
                )
                + 1
            )

    return f"CHG-{next_sequence:06d}"


def validate_external_reference(
    db: Session,
    external_reference: str | None,
    *,
    exclude_charge_id: UUID | None = None,
) -> None:
    normalized_reference = (
        normalize_optional_text(
            external_reference,
        )
    )

    if normalized_reference is None:
        return

    statement = select(
        Charge.id,
    ).where(
        Charge.external_reference
        == normalized_reference,
    )

    if exclude_charge_id is not None:
        statement = statement.where(
            Charge.id
            != exclude_charge_id,
        )

    existing_charge_id = db.scalar(
        statement,
    )

    if existing_charge_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Já existe uma cobrança com essa "
                "referência externa."
            ),
        )


def validate_charge_relationships(
    db: Session,
    *,
    user_id: UUID,
    product_id: UUID | None,
    license_id: UUID | None,
) -> tuple[
    User,
    Product | None,
    License | None,
]:
    user = get_user_or_404(
        db,
        user_id,
    )

    product: Product | None = None
    license_record: License | None = None

    if product_id is not None:
        product = get_product_or_404(
            db,
            product_id,
        )

    if license_id is not None:
        license_record = get_license_or_404(
            db,
            license_id,
        )

        if license_record.user_id != user_id:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_CONTENT
                ),
                detail=(
                    "A licença informada não pertence "
                    "ao usuário selecionado."
                ),
            )

        if (
            product_id is not None
            and license_record.product_id
            != product_id
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_CONTENT
                ),
                detail=(
                    "A licença informada não pertence "
                    "ao produto selecionado."
                ),
            )

        if product is None:
            product = get_product_or_404(
                db,
                license_record.product_id,
            )

    return (
        user,
        product,
        license_record,
    )


def build_charge_response(
    charge: Charge,
    user: User,
    product: Product | None,
    license_record: License | None,
) -> ChargeDetailResponse:
    return ChargeDetailResponse(
        id=charge.id,
        charge_number=(
            charge.charge_number
        ),
        user_id=charge.user_id,
        user_name=user.name,
        user_email=user.email,
        product_id=charge.product_id,
        product_name=(
            product.name
            if product is not None
            else None
        ),
        product_slug=(
            product.slug
            if product is not None
            else None
        ),
        license_id=charge.license_id,
        license_number=(
            license_record.license_number
            if license_record is not None
            else None
        ),
        description=charge.description,
        amount=charge.amount,
        status=charge.status,
        payment_method=(
            charge.payment_method
        ),
        due_at=charge.due_at,
        paid_at=charge.paid_at,
        cancelled_at=(
            charge.cancelled_at
        ),
        refunded_at=charge.refunded_at,
        external_reference=(
            charge.external_reference
        ),
        notes=charge.notes,
        created_at=charge.created_at,
        updated_at=charge.updated_at,
    )


def build_charge_list_item(
    charge: Charge,
    user: User,
    product: Product | None,
    license_record: License | None,
) -> ChargeListItemResponse:
    return ChargeListItemResponse(
        **build_charge_response(
            charge,
            user,
            product,
            license_record,
        ).model_dump()
    )


def sync_overdue_charges(
    db: Session,
) -> int:
    now = utc_now()

    statement = (
        update(Charge)
        .where(
            Charge.status == "pending",
            Charge.due_at < now,
        )
        .values(
            status="overdue",
            updated_at=now,
        )
    )

    result = db.execute(statement)
    db.commit()

    return int(
        result.rowcount or 0
    )


def list_charges(
    db: Session,
    *,
    charge_status: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[ChargeListItemResponse]:
    sync_overdue_charges(db)

    if (
        charge_status is not None
        and charge_status
        not in ALLOWED_CHARGE_STATUSES
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail="Status de cobrança inválido.",
        )

    rows = repositories.list_charges(
        db,
        status=charge_status,
        search=normalize_optional_text(
            search,
        ),
        offset=offset,
        limit=limit,
    )

    return [
        build_charge_list_item(
            charge,
            user,
            product,
            license_record,
        )
        for (
            charge,
            user,
            product,
            license_record,
        ) in rows
    ]


def get_charge_details(
    db: Session,
    charge_id: UUID,
) -> ChargeDetailResponse:
    sync_overdue_charges(db)

    row = repositories.get_charge_details(
        db,
        charge_id,
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cobrança não encontrada.",
        )

    (
        charge,
        user,
        product,
        license_record,
    ) = row

    return build_charge_response(
        charge,
        user,
        product,
        license_record,
    )


def create_charge(
    db: Session,
    payload: ChargeCreateRequest,
) -> ChargeDetailResponse:
    (
        _user,
        product,
        license_record,
    ) = validate_charge_relationships(
        db,
        user_id=payload.user_id,
        product_id=payload.product_id,
        license_id=payload.license_id,
    )

    external_reference = (
        normalize_optional_text(
            payload.external_reference,
        )
    )

    validate_external_reference(
        db,
        external_reference,
    )

    resolved_product_id = (
        product.id
        if product is not None
        else None
    )

    charge = Charge(
        user_id=payload.user_id,
        product_id=resolved_product_id,
        license_id=(
            license_record.id
            if license_record is not None
            else None
        ),
        charge_number=(
            generate_charge_number(db)
        ),
        description=(
            payload.description.strip()
        ),
        amount=payload.amount,
        status=(
            "overdue"
            if payload.due_at < utc_now()
            else "pending"
        ),
        payment_method=(
            normalize_optional_text(
                payload.payment_method,
            )
        ),
        due_at=payload.due_at,
        external_reference=(
            external_reference
        ),
        notes=normalize_optional_text(
            payload.notes,
        ),
    )

    created_charge = (
        repositories.create_charge(
            db,
            charge,
        )
    )

    return get_charge_details(
        db,
        created_charge.id,
    )


def update_charge(
    db: Session,
    charge_id: UUID,
    payload: ChargeUpdateRequest,
) -> ChargeDetailResponse:
    charge = get_charge_or_404(
        db,
        charge_id,
    )

    changes = payload.model_dump(
        exclude_unset=True,
    )

    if (
        "external_reference" in changes
    ):
        external_reference = (
            normalize_optional_text(
                changes[
                    "external_reference"
                ],
            )
        )

        validate_external_reference(
            db,
            external_reference,
            exclude_charge_id=charge.id,
        )

        charge.external_reference = (
            external_reference
        )

    if "description" in changes:
        description = changes[
            "description"
        ]

        if description is not None:
            charge.description = (
                description.strip()
            )

    if "amount" in changes:
        amount = changes["amount"]

        if amount is not None:
            charge.amount = amount

    if "due_at" in changes:
        due_at = changes["due_at"]

        if due_at is not None:
            charge.due_at = due_at

            if charge.status in {
                "pending",
                "overdue",
            }:
                charge.status = (
                    "overdue"
                    if due_at < utc_now()
                    else "pending"
                )

    if "payment_method" in changes:
        charge.payment_method = (
            normalize_optional_text(
                changes[
                    "payment_method"
                ],
            )
        )

    if "notes" in changes:
        charge.notes = (
            normalize_optional_text(
                changes["notes"],
            )
        )

    repositories.update_charge(
        db,
        charge,
    )

    return get_charge_details(
        db,
        charge.id,
    )


def update_charge_status(
    db: Session,
    charge_id: UUID,
    payload: ChargeStatusUpdateRequest,
) -> ChargeStatusUpdateResponse:
    charge = get_charge_or_404(
        db,
        charge_id,
    )

    new_status = (
        payload.status
        .strip()
        .lower()
    )

    if (
        new_status
        not in ALLOWED_CHARGE_STATUSES
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail="Status de cobrança inválido.",
        )

    now = utc_now()

    if new_status == "paid":
        charge.status = "paid"
        charge.paid_at = (
            payload.paid_at or now
        )
        charge.cancelled_at = None
        charge.refunded_at = None

    elif new_status == "cancelled":
        if charge.status == "refunded":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Uma cobrança estornada não pode "
                    "ser cancelada."
                ),
            )

        charge.status = "cancelled"
        charge.cancelled_at = now
        charge.paid_at = None
        charge.refunded_at = None

    elif new_status == "refunded":
        if charge.status != "paid":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Somente uma cobrança paga pode "
                    "ser estornada."
                ),
            )

        charge.status = "refunded"
        charge.refunded_at = now
        charge.cancelled_at = None

    elif new_status == "overdue":
        if charge.due_at >= now:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Uma cobrança com vencimento "
                    "futuro não pode ser marcada "
                    "como vencida."
                ),
            )

        charge.status = "overdue"
        charge.paid_at = None
        charge.cancelled_at = None
        charge.refunded_at = None

    else:
        charge.status = "pending"
        charge.paid_at = None
        charge.cancelled_at = None
        charge.refunded_at = None

    if payload.payment_method is not None:
        charge.payment_method = (
            normalize_optional_text(
                payload.payment_method,
            )
        )

    if payload.notes is not None:
        charge.notes = normalize_optional_text(
            payload.notes,
        )

    updated_charge = (
        repositories.update_charge(
            db,
            charge,
        )
    )

    return ChargeStatusUpdateResponse(
        success=True,
        message=(
            "Status da cobrança atualizado "
            "com sucesso."
        ),
        charge_id=updated_charge.id,
        charge_number=(
            updated_charge.charge_number
        ),
        status=updated_charge.status,
        paid_at=updated_charge.paid_at,
        cancelled_at=(
            updated_charge.cancelled_at
        ),
        refunded_at=(
            updated_charge.refunded_at
        ),
        updated_at=updated_charge.updated_at,
    )


def get_financial_summary(
    db: Session,
) -> FinancialSummaryResponse:
    sync_overdue_charges(db)

    now = utc_now()

    today_start = now.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    tomorrow_start = (
        today_start
        + timedelta(days=1)
    )

    current_month_start = start_of_month(
        now,
    )
    next_month_start = add_months(
        current_month_start,
        1,
    )

    total_revenue = (
        repositories.sum_amount(
            db,
            status="paid",
        )
    )
    paid_charges = (
        repositories.count_charges(
            db,
            status="paid",
        )
    )

    average_ticket = Decimal("0.00")

    if paid_charges > 0:
        average_ticket = (
            total_revenue
            / Decimal(paid_charges)
        ).quantize(
            Decimal("0.01"),
        )

    return FinancialSummaryResponse(
        total_charges=(
            repositories.count_charges(db)
        ),
        total_revenue=total_revenue,
        total_pending=(
            repositories.sum_amount(
                db,
                status="pending",
            )
        ),
        total_overdue=(
            repositories.sum_amount(
                db,
                status="overdue",
            )
        ),
        total_cancelled=(
            repositories.sum_amount(
                db,
                status="cancelled",
            )
        ),
        total_refunded=(
            repositories.sum_amount(
                db,
                status="refunded",
            )
        ),
        revenue_today=(
            repositories
            .sum_paid_amount_between(
                db,
                start_at=today_start,
                end_at=tomorrow_start,
            )
        ),
        revenue_current_month=(
            repositories
            .sum_paid_amount_between(
                db,
                start_at=current_month_start,
                end_at=next_month_start,
            )
        ),
        average_ticket=average_ticket,
        paid_charges=paid_charges,
        pending_charges=(
            repositories.count_charges(
                db,
                status="pending",
            )
        ),
        overdue_charges=(
            repositories.count_charges(
                db,
                status="overdue",
            )
        ),
        cancelled_charges=(
            repositories.count_charges(
                db,
                status="cancelled",
            )
        ),
        refunded_charges=(
            repositories.count_charges(
                db,
                status="refunded",
            )
        ),
        payments_current_month=(
            repositories
            .count_paid_charges_between(
                db,
                start_at=current_month_start,
                end_at=next_month_start,
            )
        ),
        paying_customers=(
            repositories
            .count_distinct_customers(db)
        ),
    )


def get_financial_dashboard(
    db: Session,
    *,
    recent_limit: int = 10,
) -> FinancialDashboardResponse:
    sync_overdue_charges(db)

    now = utc_now()

    recent_rows = (
        repositories.recent_charges(
            db,
            limit=recent_limit,
        )
    )

    recent = [
        build_charge_list_item(
            charge,
            user,
            product,
            license_record,
        )
        for (
            charge,
            user,
            product,
            license_record,
        ) in recent_rows
    ]

    current_month_start = start_of_month(
        now,
    )
    chart_start = add_months(
        current_month_start,
        -11,
    )
    chart_end = add_months(
        current_month_start,
        1,
    )

    monthly_rows = (
        repositories.get_monthly_revenue(
            db,
            start_at=chart_start,
            end_at=chart_end,
        )
    )

    monthly_values = {
        month.strftime("%Y-%m"): (
            revenue,
            payments,
        )
        for (
            month,
            revenue,
            payments,
        ) in monthly_rows
    }

    monthly_revenue: list[
        MonthlyRevenueItemResponse
    ] = []

    for month_offset in range(12):
        month_value = add_months(
            chart_start,
            month_offset,
        )
        month_key = month_value.strftime(
            "%Y-%m",
        )

        revenue, payments = (
            monthly_values.get(
                month_key,
                (
                    Decimal("0.00"),
                    0,
                ),
            )
        )

        monthly_revenue.append(
            MonthlyRevenueItemResponse(
                month=month_key,
                label=get_month_label(
                    month_value,
                ),
                revenue=revenue,
                payments=payments,
            )
        )

    upcoming_end = (
        now
        + timedelta(days=7)
    )

    upcoming_rows = (
        repositories.get_upcoming_charges(
            db,
            start_at=now,
            end_at=upcoming_end,
            limit=10,
        )
    )

    upcoming_charges: list[
        UpcomingChargeItemResponse
    ] = []

    for (
        charge,
        user,
        product,
        license_record,
    ) in upcoming_rows:
        remaining_seconds = max(
            (
                charge.due_at
                - now
            ).total_seconds(),
            0,
        )

        days_until_due = int(
            remaining_seconds
            // 86400
        )

        upcoming_charges.append(
            UpcomingChargeItemResponse(
                id=charge.id,
                charge_number=(
                    charge.charge_number
                ),
                user_id=charge.user_id,
                user_name=user.name,
                user_email=user.email,
                product_id=charge.product_id,
                product_name=(
                    product.name
                    if product is not None
                    else None
                ),
                license_id=charge.license_id,
                license_number=(
                    license_record
                    .license_number
                    if license_record
                    is not None
                    else None
                ),
                description=(
                    charge.description
                ),
                amount=charge.amount,
                status=charge.status,
                due_at=charge.due_at,
                days_until_due=(
                    days_until_due
                ),
            )
        )

    return FinancialDashboardResponse(
        summary=get_financial_summary(db),
        monthly_revenue=monthly_revenue,
        upcoming_charges=upcoming_charges,
        recent_charges=recent,
    )


ALLOWED_MANUAL_ENTRY_TYPES = {
    "income",
    "expense",
}

ALLOWED_MANUAL_BUSINESS_UNITS = {
    "hardt_api",
    "hardt_studio",
    "hardt_systems",
    "corporate",
}

ALLOWED_MANUAL_NATURES = {
    "revenue",
    "direct_cost",
    "operating_expense",
    "other",
}

ALLOWED_MANUAL_STATUSES = {
    "pending",
    "settled",
    "cancelled",
}


def validate_manual_entry_semantics(
    *,
    entry_type: str,
    nature: str,
) -> None:
    if (
        entry_type == "income"
        and nature
        not in {
            "revenue",
            "other",
        }
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "Uma entrada não pode ser classificada "
                "como custo direto ou despesa operacional."
            ),
        )

    if (
        entry_type == "expense"
        and nature == "revenue"
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "Uma saída não pode ser classificada "
                "como receita."
            ),
        )


def validate_manual_product_business_unit(
    db: Session,
    *,
    product_id: UUID | None,
    business_unit: str,
) -> None:
    if product_id is None:
        return

    product = get_product_or_404(
        db,
        product_id,
    )

    if product.business_unit != business_unit:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A unidade do lançamento não corresponde "
                "à unidade do produto selecionado."
            ),
        )


def validate_manual_optional_user(
    db: Session,
    user_id: UUID | None,
) -> None:
    if user_id is None:
        return

    get_user_or_404(
        db,
        user_id,
    )


def validate_manual_external_reference(
    db: Session,
    value: str | None,
    *,
    exclude_entry_id: UUID | None = None,
) -> str | None:
    normalized = normalize_optional_text(
        value
    )

    if normalized is None:
        return None

    existing = (
        repositories
        .get_manual_financial_entry_by_external_reference(
            db,
            normalized,
        )
    )

    if (
        existing is not None
        and existing.id != exclude_entry_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Já existe um lançamento manual com "
                "essa referência externa."
            ),
        )

    return normalized


def get_manual_financial_entry_or_404(
    db: Session,
    entry_id: UUID,
) -> ManualFinancialEntry:
    entry = (
        repositories
        .get_manual_financial_entry_by_id(
            db,
            entry_id,
        )
    )

    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lançamento financeiro não encontrado.",
        )

    return entry


def list_manual_financial_entries(
    db: Session,
    *,
    entry_type: str | None = None,
    business_unit: str | None = None,
    nature: str | None = None,
    entry_status: str | None = None,
    product_id: UUID | None = None,
    search: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[ManualFinancialEntry]:
    return (
        repositories
        .list_manual_financial_entries(
            db,
            entry_type=entry_type,
            business_unit=business_unit,
            nature=nature,
            status=entry_status,
            product_id=product_id,
            search=search,
            start_at=start_at,
            end_at=end_at,
            offset=offset,
            limit=limit,
        )
    )


def create_manual_financial_entry(
    db: Session,
    payload: ManualFinancialEntryCreateRequest,
    *,
    created_by_user_id: UUID,
) -> ManualFinancialEntry:
    entry_type = payload.entry_type.strip().lower()
    business_unit = (
        payload.business_unit.strip().lower()
    )
    nature = payload.nature.strip().lower()
    entry_status = payload.status.strip().lower()

    validate_manual_entry_semantics(
        entry_type=entry_type,
        nature=nature,
    )

    validate_manual_product_business_unit(
        db,
        product_id=payload.product_id,
        business_unit=business_unit,
    )

    validate_manual_optional_user(
        db,
        payload.user_id,
    )

    external_reference = (
        validate_manual_external_reference(
            db,
            payload.external_reference,
        )
    )

    settled_at = payload.settled_at

    if entry_status == "settled":
        settled_at = (
            settled_at
            or payload.occurred_at
        )
    else:
        settled_at = None

    entry = ManualFinancialEntry(
        entry_type=entry_type,
        business_unit=business_unit,
        nature=nature,
        category=payload.category.strip(),
        product_id=payload.product_id,
        user_id=payload.user_id,
        counterparty=normalize_optional_text(
            payload.counterparty,
        ),
        description=payload.description.strip(),
        amount=payload.amount,
        payment_method=normalize_optional_text(
            payload.payment_method,
        ),
        status=entry_status,
        occurred_at=payload.occurred_at,
        settled_at=settled_at,
        external_reference=external_reference,
        notes=normalize_optional_text(
            payload.notes,
        ),
        created_by_user_id=created_by_user_id,
    )

    return (
        repositories
        .create_manual_financial_entry(
            db,
            entry,
        )
    )


def update_manual_financial_entry(
    db: Session,
    entry_id: UUID,
    payload: ManualFinancialEntryUpdateRequest,
) -> ManualFinancialEntry:
    entry = get_manual_financial_entry_or_404(
        db,
        entry_id,
    )

    changes = payload.model_dump(
        exclude_unset=True,
    )

    if not changes:
        return entry

    candidate_entry_type = (
        changes.get(
            "entry_type",
            entry.entry_type,
        )
    )

    candidate_business_unit = (
        changes.get(
            "business_unit",
            entry.business_unit,
        )
    )

    candidate_nature = (
        changes.get(
            "nature",
            entry.nature,
        )
    )

    candidate_product_id = (
        changes["product_id"]
        if "product_id" in changes
        else entry.product_id
    )

    validate_manual_entry_semantics(
        entry_type=candidate_entry_type,
        nature=candidate_nature,
    )

    validate_manual_product_business_unit(
        db,
        product_id=candidate_product_id,
        business_unit=candidate_business_unit,
    )

    if "user_id" in changes:
        validate_manual_optional_user(
            db,
            changes["user_id"],
        )

    if "external_reference" in changes:
        entry.external_reference = (
            validate_manual_external_reference(
                db,
                changes[
                    "external_reference"
                ],
                exclude_entry_id=entry.id,
            )
        )

    if "entry_type" in changes:
        entry.entry_type = (
            changes["entry_type"]
            .strip()
            .lower()
        )

    if "business_unit" in changes:
        entry.business_unit = (
            changes["business_unit"]
            .strip()
            .lower()
        )

    if "nature" in changes:
        entry.nature = (
            changes["nature"]
            .strip()
            .lower()
        )

    if "category" in changes:
        entry.category = (
            changes["category"].strip()
        )

    if "product_id" in changes:
        entry.product_id = (
            changes["product_id"]
        )

    if "user_id" in changes:
        entry.user_id = (
            changes["user_id"]
        )

    if "counterparty" in changes:
        entry.counterparty = (
            normalize_optional_text(
                changes["counterparty"],
            )
        )

    if "description" in changes:
        entry.description = (
            changes["description"].strip()
        )

    if "amount" in changes:
        entry.amount = changes["amount"]

    if "payment_method" in changes:
        entry.payment_method = (
            normalize_optional_text(
                changes["payment_method"],
            )
        )

    if "occurred_at" in changes:
        entry.occurred_at = (
            changes["occurred_at"]
        )

    if "notes" in changes:
        entry.notes = (
            normalize_optional_text(
                changes["notes"],
            )
        )

    if "status" in changes:
        entry.status = (
            changes["status"]
            .strip()
            .lower()
        )

    if "settled_at" in changes:
        entry.settled_at = (
            changes["settled_at"]
        )

    if entry.status == "settled":
        if entry.settled_at is None:
            entry.settled_at = (
                entry.occurred_at
            )
    else:
        entry.settled_at = None

    return (
        repositories
        .update_manual_financial_entry(
            db,
            entry,
        )
    )


def cancel_manual_financial_entry(
    db: Session,
    entry_id: UUID,
) -> ManualFinancialEntry:
    entry = get_manual_financial_entry_or_404(
        db,
        entry_id,
    )

    if entry.status == "cancelled":
        return entry

    entry.status = "cancelled"
    entry.settled_at = None

    return (
        repositories
        .update_manual_financial_entry(
            db,
            entry,
        )
    )


MANAGEMENT_BUSINESS_UNITS = (
    "hardt_api",
    "hardt_studio",
    "hardt_systems",
    "corporate",
)


def get_financial_management_summary(
    db: Session,
    *,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> FinancialManagementSummaryResponse:
    """
    Consolida o resultado gerencial da Hardt.

    Receita automática:
    - Charge.status == paid
    - Purchase.status == completed

    Receita/despesa manual:
    - ManualFinancialEntry.status == settled

    Custos diretos automáticos:
    - SMS provider_cost_brl
    - SMM provider_cost_usd * usd_brl_rate

    WalletTopup NÃO é receita gerencial.
    """

    from decimal import Decimal

    from sqlalchemy import (
        func,
        select,
    )

    from app.finance.exclusions import (
        included_source_clause,
    )
    from app.finance.models import (
        Charge,
        ManualFinancialEntry,
    )
    from app.inventory.models import Purchase
    from app.products.models import Product
    from app.sms.models import SMSActivation
    from app.smm.models import SMMOrder

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

    data: dict[
        str,
        dict[str, Decimal],
    ] = {
        unit: {
            "charge_revenue": zero,
            "purchase_revenue": zero,
            "manual_revenue": zero,
            "sms_provider_cost": zero,
            "smm_provider_cost": zero,
            "manual_direct_cost": zero,
            "operating_expenses": zero,
            "other_expenses": zero,
        }
        for unit in MANAGEMENT_BUSINESS_UNITS
    }

    def normalize_unit(
        value: str | None,
    ) -> str:
        if value in MANAGEMENT_BUSINESS_UNITS:
            return str(value)

        return "corporate"

    def add_value(
        unit: str | None,
        field: str,
        amount: Decimal | None,
    ) -> None:
        normalized_unit = normalize_unit(
            unit
        )

        data[normalized_unit][field] += (
            Decimal(amount or zero)
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
    # 1. CHARGES PAGAS
    # ========================================================

    charge_unit = func.coalesce(
        Product.business_unit,
        "corporate",
    )

    charge_statement = (
        select(
            charge_unit.label(
                "business_unit"
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
        .group_by(charge_unit)
    )

    charge_statement = apply_period(
        charge_statement,
        Charge.paid_at,
    )

    for unit, amount in db.execute(
        charge_statement
    ).all():
        add_value(
            unit,
            "charge_revenue",
            amount,
        )

    # ========================================================
    # 2. PURCHASES CONCLUÍDAS
    # ========================================================

    purchase_statement = (
        select(
            Product.business_unit,
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
            Product.business_unit
        )
    )

    purchase_statement = apply_period(
        purchase_statement,
        Purchase.completed_at,
    )

    for unit, amount in db.execute(
        purchase_statement
    ).all():
        add_value(
            unit,
            "purchase_revenue",
            amount,
        )

    # ========================================================
    # 3. RECEITAS MANUAIS REALIZADAS
    # ========================================================

    manual_effective_at = func.coalesce(
        ManualFinancialEntry.settled_at,
        ManualFinancialEntry.occurred_at,
    )

    manual_income_statement = (
        select(
            ManualFinancialEntry.business_unit,
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

    for unit, amount in db.execute(
        manual_income_statement
    ).all():
        add_value(
            unit,
            "manual_revenue",
            amount,
        )

    # ========================================================
    # 4. CUSTO DIRETO SMS
    # ========================================================

    sms_statement = (
        select(
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
            included_source_clause(
                "purchase",
                Purchase.id,
            ),
        )
        .group_by(
            Product.business_unit
        )
    )

    sms_statement = apply_period(
        sms_statement,
        Purchase.completed_at,
    )

    for unit, amount in db.execute(
        sms_statement
    ).all():
        add_value(
            unit,
            "sms_provider_cost",
            amount,
        )

    # ========================================================
    # 5. CUSTO DIRETO SMM
    # ========================================================

    smm_cost_brl = (
        SMMOrder.provider_cost_usd
        * SMMOrder.usd_brl_rate
    )

    smm_statement = (
        select(
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
            included_source_clause(
                "purchase",
                Purchase.id,
            ),
        )
        .group_by(
            Product.business_unit
        )
    )

    smm_statement = apply_period(
        smm_statement,
        Purchase.completed_at,
    )

    for unit, amount in db.execute(
        smm_statement
    ).all():
        add_value(
            unit,
            "smm_provider_cost",
            amount,
        )

    # ========================================================
    # 6. DESPESAS MANUAIS REALIZADAS
    # ========================================================

    manual_expense_statement = (
        select(
            ManualFinancialEntry.business_unit,
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
            ManualFinancialEntry.business_unit,
            ManualFinancialEntry.nature,
        )
    )

    manual_expense_statement = apply_period(
        manual_expense_statement,
        manual_effective_at,
    )

    for (
        unit,
        nature,
        amount,
    ) in db.execute(
        manual_expense_statement
    ).all():
        if nature == "direct_cost":
            field = "manual_direct_cost"

        elif nature == "operating_expense":
            field = "operating_expenses"

        else:
            field = "other_expenses"

        add_value(
            unit,
            field,
            amount,
        )

    # ========================================================
    # 7. CÁLCULOS POR UNIDADE
    # ========================================================

    unit_responses: list[
        FinancialManagementUnitResponse
    ] = []

    total_revenue_all = sum(
        (
            values["charge_revenue"]
            + values["purchase_revenue"]
            + values["manual_revenue"]
        )
        for values in data.values()
    )

    for unit in MANAGEMENT_BUSINESS_UNITS:
        values = data[unit]

        total_revenue = (
            values["charge_revenue"]
            + values["purchase_revenue"]
            + values["manual_revenue"]
        )

        direct_costs = (
            values["sms_provider_cost"]
            + values["smm_provider_cost"]
            + values["manual_direct_cost"]
        )

        gross_profit = (
            total_revenue
            - direct_costs
        )

        net_result = (
            gross_profit
            - values["operating_expenses"]
            - values["other_expenses"]
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

        else:
            gross_margin_percent = zero
            net_margin_percent = zero

        if total_revenue_all:
            revenue_share_percent = (
                total_revenue
                / total_revenue_all
                * hundred
            )
        else:
            revenue_share_percent = zero

        unit_responses.append(
            FinancialManagementUnitResponse(
                business_unit=unit,

                charge_revenue=(
                    values[
                        "charge_revenue"
                    ]
                ),
                purchase_revenue=(
                    values[
                        "purchase_revenue"
                    ]
                ),
                manual_revenue=(
                    values[
                        "manual_revenue"
                    ]
                ),
                total_revenue=total_revenue,

                sms_provider_cost=(
                    values[
                        "sms_provider_cost"
                    ]
                ),
                smm_provider_cost=(
                    values[
                        "smm_provider_cost"
                    ]
                ),
                manual_direct_cost=(
                    values[
                        "manual_direct_cost"
                    ]
                ),
                direct_costs=direct_costs,

                gross_profit=gross_profit,
                gross_margin_percent=(
                    gross_margin_percent
                ),

                operating_expenses=(
                    values[
                        "operating_expenses"
                    ]
                ),
                other_expenses=(
                    values[
                        "other_expenses"
                    ]
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

    # ========================================================
    # 8. CONSOLIDADO
    # ========================================================

    charge_revenue = sum(
        row.charge_revenue
        for row in unit_responses
    )

    purchase_revenue = sum(
        row.purchase_revenue
        for row in unit_responses
    )

    manual_revenue = sum(
        row.manual_revenue
        for row in unit_responses
    )

    total_revenue = (
        charge_revenue
        + purchase_revenue
        + manual_revenue
    )

    sms_provider_cost = sum(
        row.sms_provider_cost
        for row in unit_responses
    )

    smm_provider_cost = sum(
        row.smm_provider_cost
        for row in unit_responses
    )

    manual_direct_cost = sum(
        row.manual_direct_cost
        for row in unit_responses
    )

    direct_costs = (
        sms_provider_cost
        + smm_provider_cost
        + manual_direct_cost
    )

    gross_profit = (
        total_revenue
        - direct_costs
    )

    operating_expenses = sum(
        row.operating_expenses
        for row in unit_responses
    )

    other_expenses = sum(
        row.other_expenses
        for row in unit_responses
    )

    net_result = (
        gross_profit
        - operating_expenses
        - other_expenses
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
    else:
        gross_margin_percent = zero
        net_margin_percent = zero

    return FinancialManagementSummaryResponse(
        start_at=start_at,
        end_at=end_at,

        charge_revenue=charge_revenue,
        purchase_revenue=purchase_revenue,
        manual_revenue=manual_revenue,
        total_revenue=total_revenue,

        sms_provider_cost=sms_provider_cost,
        smm_provider_cost=smm_provider_cost,
        manual_direct_cost=manual_direct_cost,
        direct_costs=direct_costs,

        gross_profit=gross_profit,
        gross_margin_percent=(
            gross_margin_percent
        ),

        operating_expenses=(
            operating_expenses
        ),
        other_expenses=other_expenses,

        net_result=net_result,
        net_margin_percent=(
            net_margin_percent
        ),

        units=unit_responses,
    )
