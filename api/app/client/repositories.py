from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.devices.models import Device
from app.finance.models import Charge
from app.licenses.models import License
from app.products.models import Product


def count_user_licenses(
    db: Session,
    user_id: UUID,
    *,
    status: str | None = None,
) -> int:
    statement = (
        select(
            func.count(
                License.id,
            )
        )
        .where(
            License.user_id == user_id,
        )
    )

    if status is not None:
        statement = statement.where(
            License.status == status,
        )

    return int(
        db.scalar(statement) or 0,
    )


def get_user_device_summary(
    db: Session,
    user_id: UUID,
) -> tuple[
    int,
    int,
    int,
]:
    active_devices_statement = (
        select(
            func.count(
                Device.id,
            )
        )
        .join(
            License,
            License.id == Device.license_id,
        )
        .where(
            License.user_id == user_id,
            Device.is_active.is_(True),
        )
    )

    inactive_devices_statement = (
        select(
            func.count(
                Device.id,
            )
        )
        .join(
            License,
            License.id == Device.license_id,
        )
        .where(
            License.user_id == user_id,
            Device.is_active.is_(False),
        )
    )

    device_limit_statement = (
        select(
            func.coalesce(
                func.sum(
                    License.max_devices,
                ),
                0,
            )
        )
        .where(
            License.user_id == user_id,
            License.is_active.is_(True),
            License.status.in_(
                {
                    "active",
                    "pending_activation",
                }
            ),
        )
    )

    active_devices = int(
        db.scalar(
            active_devices_statement,
        )
        or 0
    )

    inactive_devices = int(
        db.scalar(
            inactive_devices_statement,
        )
        or 0
    )

    total_limit = int(
        db.scalar(
            device_limit_statement,
        )
        or 0
    )

    return (
        active_devices,
        inactive_devices,
        total_limit,
    )


def count_user_charges(
    db: Session,
    user_id: UUID,
    *,
    status: str,
) -> int:
    statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == status,
        )
    )

    return int(
        db.scalar(statement) or 0,
    )


def sum_user_charge_amount(
    db: Session,
    user_id: UUID,
    *,
    status: str,
) -> Decimal:
    statement = (
        select(
            func.coalesce(
                func.sum(
                    Charge.amount,
                ),
                0,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == status,
        )
    )

    value = db.scalar(statement)

    return Decimal(
        value or 0,
    )


def get_next_user_charge(
    db: Session,
    user_id: UUID,
) -> Charge | None:
    statement = (
        select(Charge)
        .where(
            Charge.user_id == user_id,
            Charge.status == "pending",
        )
        .order_by(
            Charge.due_at.asc(),
            Charge.created_at.asc(),
        )
        .limit(1)
    )

    return db.scalar(statement)


def get_last_user_payment(
    db: Session,
    user_id: UUID,
) -> Charge | None:
    statement = (
        select(Charge)
        .where(
            Charge.user_id == user_id,
            Charge.status == "paid",
            Charge.paid_at.is_not(None),
        )
        .order_by(
            Charge.paid_at.desc(),
            Charge.created_at.desc(),
        )
        .limit(1)
    )

    return db.scalar(statement)


def get_recent_user_licenses(
    db: Session,
    user_id: UUID,
    *,
    limit: int = 5,
) -> list[
    tuple[
        License,
        Product,
        int,
    ]
]:
    active_devices_expression = (
        select(
            func.count(
                Device.id,
            )
        )
        .where(
            Device.license_id == License.id,
            Device.is_active.is_(True),
        )
        .correlate(License)
        .scalar_subquery()
    )

    statement = (
        select(
            License,
            Product,
            active_devices_expression.label(
                "active_devices",
            ),
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .where(
            License.user_id == user_id,
        )
        .order_by(
            License.created_at.desc(),
        )
        .limit(limit)
    )

    rows = db.execute(
        statement,
    ).all()

    return [
        (
            license_record,
            product,
            int(active_devices or 0),
        )
        for (
            license_record,
            product,
            active_devices,
        ) in rows
    ]


def get_recent_user_charges(
    db: Session,
    user_id: UUID,
    *,
    limit: int = 5,
) -> list[
    tuple[
        Charge,
        Product | None,
        License | None,
    ]
]:
    statement = (
        select(
            Charge,
            Product,
            License,
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
            Charge.user_id == user_id,
        )
        .order_by(
            Charge.created_at.desc(),
        )
        .limit(limit)
    )

    return list(
        db.execute(statement).all()
    )


def mark_user_overdue_charges(
    db: Session,
    user_id: UUID,
    *,
    now,
) -> int:
    statement = (
        update(Charge)
        .where(
            Charge.user_id == user_id,
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
        result.rowcount or 0,
    )

def list_user_licenses(
    db: Session,
    user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    search: str | None = None,
) -> tuple[
    list[
        tuple[
            License,
            Product,
            int,
        ]
    ],
    int,
]:
    active_devices_expression = (
        select(
            func.count(
                Device.id,
            )
        )
        .where(
            Device.license_id == License.id,
            Device.is_active.is_(True),
        )
        .correlate(License)
        .scalar_subquery()
    )

    filters = [
        License.user_id == user_id,
    ]

    if status is not None:
        filters.append(
            License.status == status,
        )

    normalized_search = (
        search.strip()
        if search is not None
        else ""
    )

    if normalized_search:
        search_value = (
            f"%{normalized_search}%"
        )

        filters.append(
            or_(
                License.license_number.ilike(
                    search_value,
                ),
                License.key_preview.ilike(
                    search_value,
                ),
                Product.name.ilike(
                    search_value,
                ),
                Product.slug.ilike(
                    search_value,
                ),
            )
        )

    total_statement = (
        select(
            func.count(
                License.id,
            )
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .where(
            *filters,
        )
    )

    total = int(
        db.scalar(total_statement)
        or 0
    )

    offset = (
        page - 1
    ) * page_size

    statement = (
        select(
            License,
            Product,
            active_devices_expression.label(
                "active_devices",
            ),
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .where(
            *filters,
        )
        .order_by(
            License.created_at.desc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    rows = db.execute(
        statement,
    ).all()

    items = [
        (
            license_record,
            product,
            int(active_devices or 0),
        )
        for (
            license_record,
            product,
            active_devices,
        ) in rows
    ]

    return items, total


def list_user_devices(
    db: Session,
    user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 10,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[
    list[
        tuple[
            Device,
            License,
            Product,
        ]
    ],
    int,
]:
    filters = [
        License.user_id == user_id,
    ]

    if is_active is not None:
        filters.append(
            Device.is_active.is_(is_active),
        )

    normalized_search = (
        search.strip()
        if search is not None
        else ""
    )

    if normalized_search:
        search_value = (
            f"%{normalized_search}%"
        )

        filters.append(
            or_(
                Device.name.ilike(
                    search_value,
                ),
                Device.device_identifier.ilike(
                    search_value,
                ),
                Device.operating_system.ilike(
                    search_value,
                ),
                Device.app_version.ilike(
                    search_value,
                ),
                License.license_number.ilike(
                    search_value,
                ),
                Product.name.ilike(
                    search_value,
                ),
            )
        )

    total_statement = (
        select(
            func.count(
                Device.id,
            )
        )
        .join(
            License,
            License.id == Device.license_id,
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .where(
            *filters,
        )
    )

    total = int(
        db.scalar(total_statement)
        or 0
    )

    offset = (
        page - 1
    ) * page_size

    statement = (
        select(
            Device,
            License,
            Product,
        )
        .join(
            License,
            License.id == Device.license_id,
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .where(
            *filters,
        )
        .order_by(
            Device.is_active.desc(),
            Device.last_validated_at.desc(),
            Device.activated_at.desc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    return (
        list(
            db.execute(statement).all()
        ),
        total,
    )


def get_user_device_by_id(
    db: Session,
    user_id: UUID,
    device_id: UUID,
) -> Device | None:
    statement = (
        select(Device)
        .join(
            License,
            License.id == Device.license_id,
        )
        .where(
            Device.id == device_id,
            License.user_id == user_id,
        )
    )

    return db.scalar(statement)


def deactivate_user_device(
    db: Session,
    device: Device,
) -> Device:
    device.is_active = False

    db.add(device)
    db.commit()
    db.refresh(device)

    return device


def list_user_charges(
    db: Session,
    user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    search: str | None = None,
) -> tuple[
    list[
        tuple[
            Charge,
            Product | None,
            License | None,
        ]
    ],
    int,
]:
    filters = [
        Charge.user_id == user_id,
    ]

    if status is not None:
        filters.append(
            Charge.status == status,
        )

    normalized_search = (
        search.strip()
        if search is not None
        else ""
    )

    if normalized_search:
        search_value = (
            f"%{normalized_search}%"
        )

        filters.append(
            or_(
                Charge.charge_number.ilike(
                    search_value,
                ),
                Charge.description.ilike(
                    search_value,
                ),
                Charge.payment_method.ilike(
                    search_value,
                ),
                Product.name.ilike(
                    search_value,
                ),
                License.license_number.ilike(
                    search_value,
                ),
            )
        )

    total_statement = (
        select(
            func.count(
                Charge.id,
            )
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
            *filters,
        )
    )

    total = int(
        db.scalar(total_statement)
        or 0
    )

    offset = (
        page - 1
    ) * page_size

    statement = (
        select(
            Charge,
            Product,
            License,
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
            *filters,
        )
        .order_by(
            Charge.due_at.desc(),
            Charge.created_at.desc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    return (
        list(
            db.execute(statement).all()
        ),
        total,
    )


def get_user_charge_summary(
    db: Session,
    user_id: UUID,
) -> tuple[
    int,
    int,
    int,
    int,
    int,
    int,
    Decimal,
]:
    total_statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
        )
    )

    paid_statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == "paid",
        )
    )

    pending_statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == "pending",
        )
    )

    overdue_statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == "overdue",
        )
    )

    cancelled_statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == "cancelled",
        )
    )

    refunded_statement = (
        select(
            func.count(
                Charge.id,
            )
        )
        .where(
            Charge.user_id == user_id,
            Charge.status == "refunded",
        )
    )

    total_amount_statement = (
        select(
            func.coalesce(
                func.sum(
                    Charge.amount,
                ),
                0,
            )
        )
        .where(
            Charge.user_id == user_id,
        )
    )

    return (
        int(db.scalar(total_statement) or 0),
        int(db.scalar(paid_statement) or 0),
        int(db.scalar(pending_statement) or 0),
        int(db.scalar(overdue_statement) or 0),
        int(db.scalar(cancelled_statement) or 0),
        int(db.scalar(refunded_statement) or 0),
        Decimal(
            db.scalar(
                total_amount_statement,
            )
            or 0
        ),
    )
