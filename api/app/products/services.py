from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.products import repositories
from app.products.models import Product
from app.products.schemas import ProductCreate, ProductUpdate


def create_product(
    db: Session,
    product_data: ProductCreate,
) -> Product:
    existing_product = repositories.get_product_by_slug(
        db,
        product_data.slug,
    )

    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um produto com esse slug.",
        )

    try:
        return repositories.create_product(
            db,
            **product_data.model_dump(),
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível criar o produto porque seus dados já existem.",
        )


def list_products(
    db: Session,
) -> list[Product]:
    return repositories.list_products(db)


def get_product(
    db: Session,
    product_id: UUID,
) -> Product:
    product = repositories.get_product_by_id(
        db,
        product_id,
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado.",
        )

    return product


def update_product(
    db: Session,
    product_id: UUID,
    product_data: ProductUpdate,
) -> Product:
    product = get_product(
        db,
        product_id,
    )

    update_data = product_data.model_dump(
        exclude_unset=True,
    )

    if not update_data:
        return product

    new_slug = update_data.get("slug")

    if new_slug and new_slug != product.slug:
        existing_product = repositories.get_product_by_slug(
            db,
            new_slug,
        )

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um produto com esse slug.",
            )

    try:
        return repositories.update_product(
            db,
            product=product,
            update_data=update_data,
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível atualizar o produto.",
        )
