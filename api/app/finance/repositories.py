from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.finance.models import Charge
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