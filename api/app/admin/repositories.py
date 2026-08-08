from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.devices.models import Device
from app.licenses.models import License
from app.products.models import Product
from app.users.models import User


def count_users(db: Session) -> int:
    statement = select(func.count(User.id))
    return int(db.scalar(statement) or 0)


def count_products(db: Session) -> int:
    statement = select(func.count(Product.id))
    return int(db.scalar(statement) or 0)


def count_licenses(
    db: Session,
    *,
    status: str | None = None,
) -> int:
    statement = select(func.count(License.id))

    if status is not None:
        statement = statement.where(
            License.status == status
        )

    return int(db.scalar(statement) or 0)


def count_devices(
    db: Session,
    *,
    active_only: bool = False,
) -> int:
    statement = select(func.count(Device.id))

    if active_only:
        statement = statement.where(
            Device.is_active.is_(True)
        )

    return int(db.scalar(statement) or 0)


def count_active_devices_for_license(
    db: Session,
    license_id: UUID,
) -> int:
    statement = (
        select(func.count(Device.id))
        .where(
            Device.license_id == license_id,
            Device.is_active.is_(True),
        )
    )

    return int(db.scalar(statement) or 0)


def list_licenses(
    db: Session,
    *,
    status: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[tuple[License, User, Product]]:
    statement = (
        select(License, User, Product)
        .join(
            User,
            User.id == License.user_id,
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .order_by(License.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if status:
        statement = statement.where(
            License.status == status
        )

    if search:
        normalized_search = f"%{search.strip()}%"

        statement = statement.where(
            License.license_number.ilike(
                normalized_search
            )
            | License.key_preview.ilike(
                normalized_search
            )
            | User.name.ilike(
                normalized_search
            )
            | User.email.ilike(
                normalized_search
            )
            | Product.name.ilike(
                normalized_search
            )
            | Product.slug.ilike(
                normalized_search
            )
        )

    return list(db.execute(statement).all())


def get_license_details(
    db: Session,
    license_id: UUID,
) -> tuple[License, User, Product] | None:
    statement = (
        select(License, User, Product)
        .join(
            User,
            User.id == License.user_id,
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .where(License.id == license_id)
    )

    return db.execute(statement).one_or_none()


def list_license_devices(
    db: Session,
    license_id: UUID,
) -> list[Device]:
    statement = (
        select(Device)
        .where(Device.license_id == license_id)
        .order_by(Device.activated_at.desc())
    )

    return list(db.scalars(statement).all())


def get_device_by_id(
    db: Session,
    device_id: UUID,
) -> Device | None:
    return db.get(Device, device_id)


def list_devices(
    db: Session,
    *,
    active_only: bool = False,
    search: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[tuple[Device, License, User, Product]]:
    statement = (
        select(
            Device,
            License,
            User,
            Product,
        )
        .join(
            License,
            License.id == Device.license_id,
        )
        .join(
            User,
            User.id == License.user_id,
        )
        .join(
            Product,
            Product.id == License.product_id,
        )
        .order_by(
            Device.activated_at.desc()
        )
        .offset(offset)
        .limit(limit)
    )

    if active_only:
        statement = statement.where(
            Device.is_active.is_(True)
        )

    if search:
        normalized_search = f"%{search.strip()}%"

        statement = statement.where(
            Device.device_identifier.ilike(
                normalized_search
            )
            | func.coalesce(
                Device.name,
                "",
            ).ilike(normalized_search)
            | func.coalesce(
                Device.operating_system,
                "",
            ).ilike(normalized_search)
            | License.license_number.ilike(
                normalized_search
            )
            | User.name.ilike(
                normalized_search
            )
            | User.email.ilike(
                normalized_search
            )
            | Product.name.ilike(
                normalized_search
            )
            | Product.slug.ilike(
                normalized_search
            )
        )

    return list(db.execute(statement).all())


def get_admin_by_id(
    db: Session,
    admin_id: UUID,
) -> User | None:
    statement = select(User).where(
        User.id == admin_id,
        User.is_admin.is_(True),
    )

    return db.scalar(statement)


def get_user_by_email_excluding_id(
    db: Session,
    *,
    email: str,
    user_id: UUID,
) -> User | None:
    statement = select(User).where(
        User.email == email,
        User.id != user_id,
    )

    return db.scalar(statement)


def update_admin_profile(
    db: Session,
    *,
    admin: User,
    name: str,
    email: str,
) -> User:
    admin.name = name
    admin.email = email

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin


def update_admin_password(
    db: Session,
    *,
    admin: User,
    password_hash: str,
) -> User:
    admin.password_hash = password_hash

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin