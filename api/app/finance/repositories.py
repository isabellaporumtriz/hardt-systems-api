from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.finance.models import Charge, ManualFinancialEntry
from app.licenses.models import License
from app.products.models import Product
from app.users.models import User


def get_charge_by_id(
    db: Session,
    charge_id: UUID,
) -> Charge | None:
    return db.get(
        Charge,
        charge_id,
    )


def list_charges(
    db: Session,
    *,
    status: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[
    tuple[
        Charge,
        User,
        Product | None,
        License | None,
    ]
]:
    statement = (
        select(
            Charge,
            User,
            Product,
            License,
        )
        .join(
            User,
            User.id == Charge.user_id,
        )
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .outerjoin(
            License,
            License.id == Charge.license_id,
        )
        .order_by(
            Charge.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    if status:
        statement = statement.where(
            Charge.status == status,
        )

    if search:
        value = f"%{search.strip()}%"

        statement = statement.where(
            Charge.charge_number.ilike(value)
            | Charge.description.ilike(value)
            | User.name.ilike(value)
            | User.email.ilike(value)
            | func.coalesce(
                Product.name,
                "",
            ).ilike(value)
            | func.coalesce(
                License.license_number,
                "",
            ).ilike(value)
        )

    return list(
        db.execute(statement).all()
    )


def get_charge_details(
    db: Session,
    charge_id: UUID,
):
    statement = (
        select(
            Charge,
            User,
            Product,
            License,
        )
        .join(
            User,
            User.id == Charge.user_id,
        )
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .outerjoin(
            License,
            License.id == Charge.license_id,
        )
        .where(
            Charge.id == charge_id,
        )
    )

    return db.execute(
        statement,
    ).one_or_none()


def create_charge(
    db: Session,
    charge: Charge,
) -> Charge:
    db.add(charge)
    db.commit()
    db.refresh(charge)

    return charge


def update_charge(
    db: Session,
    charge: Charge,
) -> Charge:
    db.add(charge)
    db.commit()
    db.refresh(charge)

    return charge


def delete_charge(
    db: Session,
    charge: Charge,
) -> None:
    db.delete(charge)
    db.commit()


def count_charges(
    db: Session,
    *,
    status: str | None = None,
) -> int:
    statement = select(
        func.count(Charge.id),
    )

    if status:
        statement = statement.where(
            Charge.status == status,
        )

    return int(
        db.scalar(statement) or 0,
    )


def sum_amount(
    db: Session,
    *,
    status: str | None = None,
) -> Decimal:
    statement = select(
        func.coalesce(
            func.sum(
                Charge.amount,
            ),
            0,
        ),
    )

    if status:
        statement = statement.where(
            Charge.status == status,
        )

    value = db.scalar(statement)

    return Decimal(
        value or 0,
    )


def count_distinct_customers(
    db: Session,
) -> int:
    statement = (
        select(
            func.count(
                func.distinct(
                    Charge.user_id,
                ),
            ),
        )
        .where(
            Charge.status == "paid",
        )
    )

    return int(
        db.scalar(statement) or 0,
    )


def recent_charges(
    db: Session,
    *,
    limit: int = 10,
) -> list[
    tuple[
        Charge,
        User,
        Product | None,
        License | None,
    ]
]:
    statement = (
        select(
            Charge,
            User,
            Product,
            License,
        )
        .join(
            User,
            User.id == Charge.user_id,
        )
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .outerjoin(
            License,
            License.id == Charge.license_id,
        )
        .order_by(
            Charge.created_at.desc(),
        )
        .limit(limit)
    )

    return list(
        db.execute(statement).all()
    )


def sum_paid_amount_between(
    db: Session,
    *,
    start_at: datetime,
    end_at: datetime,
) -> Decimal:
    statement = (
        select(
            func.coalesce(
                func.sum(
                    Charge.amount,
                ),
                0,
            ),
        )
        .where(
            Charge.status == "paid",
            Charge.paid_at.is_not(None),
            Charge.paid_at >= start_at,
            Charge.paid_at < end_at,
        )
    )

    value = db.scalar(statement)

    return Decimal(
        value or 0,
    )


def count_paid_charges_between(
    db: Session,
    *,
    start_at: datetime,
    end_at: datetime,
) -> int:
    statement = (
        select(
            func.count(
                Charge.id,
            ),
        )
        .where(
            Charge.status == "paid",
            Charge.paid_at.is_not(None),
            Charge.paid_at >= start_at,
            Charge.paid_at < end_at,
        )
    )

    return int(
        db.scalar(statement) or 0,
    )


def get_monthly_revenue(
    db: Session,
    *,
    start_at: datetime,
    end_at: datetime,
) -> list[
    tuple[
        datetime,
        Decimal,
        int,
    ]
]:
    month_expression = func.date_trunc(
        "month",
        Charge.paid_at,
    )

    statement = (
        select(
            month_expression.label(
                "month",
            ),
            func.coalesce(
                func.sum(
                    Charge.amount,
                ),
                0,
            ).label(
                "revenue",
            ),
            func.count(
                Charge.id,
            ).label(
                "payments",
            ),
        )
        .where(
            Charge.status == "paid",
            Charge.paid_at.is_not(None),
            Charge.paid_at >= start_at,
            Charge.paid_at < end_at,
        )
        .group_by(
            month_expression,
        )
        .order_by(
            month_expression.asc(),
        )
    )

    rows = db.execute(
        statement,
    ).all()

    return [
        (
            month,
            Decimal(
                revenue or 0,
            ),
            int(
                payments or 0,
            ),
        )
        for (
            month,
            revenue,
            payments,
        ) in rows
    ]


def get_upcoming_charges(
    db: Session,
    *,
    start_at: datetime,
    end_at: datetime,
    limit: int = 10,
) -> list[
    tuple[
        Charge,
        User,
        Product | None,
        License | None,
    ]
]:
    statement = (
        select(
            Charge,
            User,
            Product,
            License,
        )
        .join(
            User,
            User.id == Charge.user_id,
        )
        .outerjoin(
            Product,
            Product.id == Charge.product_id,
        )
        .outerjoin(
            License,
            License.id == Charge.license_id,
        )
        .where(
            Charge.status == "pending",
            Charge.due_at >= start_at,
            Charge.due_at < end_at,
        )
        .order_by(
            Charge.due_at.asc(),
            Charge.created_at.asc(),
        )
        .limit(limit)
    )

    return list(
        db.execute(statement).all()
    )


def get_manual_financial_entry_by_id(
    db: Session,
    entry_id: UUID,
) -> ManualFinancialEntry | None:
    return db.get(
        ManualFinancialEntry,
        entry_id,
    )


def get_manual_financial_entry_by_external_reference(
    db: Session,
    external_reference: str,
) -> ManualFinancialEntry | None:
    return db.scalar(
        select(
            ManualFinancialEntry
        ).where(
            ManualFinancialEntry.external_reference
            == external_reference
        )
    )


def list_manual_financial_entries(
    db: Session,
    *,
    entry_type: str | None = None,
    business_unit: str | None = None,
    nature: str | None = None,
    status: str | None = None,
    product_id: UUID | None = None,
    search: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[ManualFinancialEntry]:
    statement = select(
        ManualFinancialEntry
    )

    if entry_type:
        statement = statement.where(
            ManualFinancialEntry.entry_type
            == entry_type
        )

    if business_unit:
        statement = statement.where(
            ManualFinancialEntry.business_unit
            == business_unit
        )

    if nature:
        statement = statement.where(
            ManualFinancialEntry.nature
            == nature
        )

    if status:
        statement = statement.where(
            ManualFinancialEntry.status
            == status
        )

    if product_id:
        statement = statement.where(
            ManualFinancialEntry.product_id
            == product_id
        )

    if start_at:
        statement = statement.where(
            ManualFinancialEntry.occurred_at
            >= start_at
        )

    if end_at:
        statement = statement.where(
            ManualFinancialEntry.occurred_at
            < end_at
        )

    if search:
        value = f"%{search.strip()}%"

        statement = statement.where(
            or_(
                ManualFinancialEntry.description.ilike(
                    value
                ),
                ManualFinancialEntry.category.ilike(
                    value
                ),
                func.coalesce(
                    ManualFinancialEntry.counterparty,
                    "",
                ).ilike(value),
                func.coalesce(
                    ManualFinancialEntry.payment_method,
                    "",
                ).ilike(value),
                func.coalesce(
                    ManualFinancialEntry.external_reference,
                    "",
                ).ilike(value),
            )
        )

    statement = (
        statement
        .order_by(
            ManualFinancialEntry.occurred_at.desc(),
            ManualFinancialEntry.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    return list(
        db.scalars(statement).all()
    )


def create_manual_financial_entry(
    db: Session,
    entry: ManualFinancialEntry,
) -> ManualFinancialEntry:
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


def update_manual_financial_entry(
    db: Session,
    entry: ManualFinancialEntry,
) -> ManualFinancialEntry:
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry
