from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.products.models import Product


def create_product(
    db: Session,
    *,
    name: str,
    slug: str,
    description: str | None,
    version: str,
    price,
    is_active: bool,
) -> Product:
    product = Product(
        name=name,
        slug=slug,
        description=description,
        version=version,
        price=price,
        is_active=is_active,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def get_product_by_id(
    db: Session,
    product_id: UUID,
) -> Product | None:
    return db.get(Product, product_id)


def get_product_by_slug(
    db: Session,
    slug: str,
) -> Product | None:
    statement = select(Product).where(Product.slug == slug)
    return db.scalar(statement)


def list_products(
    db: Session,
) -> list[Product]:
    statement = select(Product).order_by(Product.created_at.desc())
    return list(db.scalars(statement).all())


def update_product(
    db: Session,
    *,
    product: Product,
    update_data: dict,
) -> Product:
    for field, value in update_data.items():
        setattr(product, field, value)

    db.add(product)
    db.commit()
    db.refresh(product)

    return product
