import csv
import io

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from app.auth.dependencies import (
    get_current_admin,
    get_current_user,
)
from app.core.database import get_db
from app.inventory.models import (
    InventoryItem,
    Purchase,
)
from app.inventory.schemas import (
    InventoryBulkCreateRequest,
    InventoryBulkCreateResponse,
    InventoryStockResponse,
    PurchaseCreateRequest,
    PurchaseDeliveryResponse,
    PurchaseResponse,
    StoreProductResponse,
)
from app.inventory.services import (
    InventoryError,
    OutOfStockError,
    ProductNotFoundError,
    ProductUnavailableError,
    PurchaseNotFoundError,
    add_inventory_item,
    count_available,
    get_purchase_delivery,
    list_user_purchases,
    purchase_product,
)
from app.products.models import Product
from app.users.models import User
from app.wallet.services import (
    InsufficientBalanceError,
    WalletNotFoundError,
)


router = APIRouter(
    prefix="/store",
    tags=["Store"],
)


def serialize_purchase(
    db: Session,
    purchase: Purchase,
) -> PurchaseResponse:
    product = db.get(
        Product,
        purchase.product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Produto vinculado à compra "
                "não foi encontrado."
            ),
        )

    return PurchaseResponse(
        id=purchase.id,
        product_id=purchase.product_id,
        product_name=product.name,
        product_slug=product.slug,
        inventory_item_id=(
            purchase.inventory_item_id
        ),
        quantity=purchase.quantity,
        unit_price_brl=purchase.unit_price_brl,
        amount_brl=purchase.amount_brl,
        status=purchase.status,
        completed_at=purchase.completed_at,
        created_at=purchase.created_at,
    )


@router.get(
    "/products",
    response_model=list[StoreProductResponse],
)
def list_store_products(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> list[StoreProductResponse]:
    rows = db.execute(
        select(
            Product,
            func.count(
                InventoryItem.id
            ).label("available_stock"),
        )
        .outerjoin(
            InventoryItem,
            (
                InventoryItem.product_id
                == Product.id
            )
            & (
                InventoryItem.status
                == "available"
            ),
        )
        .where(
            Product.is_active.is_(True),
        )
        .group_by(
            Product.id,
        )
        .having(
            (
                Product.delivery_type
                == "licensed"
            )
            | (
                func.count(
                    InventoryItem.id
                ) > 0
            )
        )
        .order_by(
            Product.name.asc(),
        )
    ).all()

    return [
        StoreProductResponse(
            id=product.id,
            name=product.name,
            slug=product.slug,
            description=product.description,
            price=product.price,
            available_stock=int(
                available_stock or 0
            ),
        )
        for product, available_stock in rows
    ]


@router.post(
    "/purchases",
    response_model=PurchaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase(
    payload: PurchaseCreateRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> PurchaseResponse:
    try:
        purchase = purchase_product(
            db,
            user_id=current_user.id,
            product_id=payload.product_id,
            idempotency_key=payload.idempotency_key,
            quantity=payload.quantity,
        )

        return serialize_purchase(
            db,
            purchase,
        )

    except ProductNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except ProductUnavailableError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except OutOfStockError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except InsufficientBalanceError as exc:
        raise HTTPException(
            status_code=402,
            detail="Saldo insuficiente.",
        ) from exc

    except WalletNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail="Carteira não encontrada.",
        ) from exc

    except InventoryError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.get(
    "/purchases",
    response_model=list[PurchaseResponse],
)
def read_my_purchases(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> list[PurchaseResponse]:
    purchases = list_user_purchases(
        db,
        user_id=current_user.id,
    )

    return [
        serialize_purchase(
            db,
            purchase,
        )
        for purchase in purchases
    ]


@router.get(
    "/purchases/{purchase_id}/delivery",
    response_model=PurchaseDeliveryResponse,
)
def read_purchase_delivery(
    purchase_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> PurchaseDeliveryResponse:
    purchase = db.scalar(
        select(Purchase).where(
            Purchase.id == purchase_id,
            Purchase.user_id
            == current_user.id,
        )
    )

    if purchase is None:
        raise HTTPException(
            status_code=404,
            detail="Compra não encontrada.",
        )

    product = db.get(
        Product,
        purchase.product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Produto vinculado à compra "
                "não foi encontrado."
            ),
        )

    try:
        delivery = get_purchase_delivery(
            db,
            purchase_id=purchase.id,
            user_id=current_user.id,
        )

    except PurchaseNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except InventoryError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível carregar "
                "os dados da compra."
            ),
        ) from exc

    return PurchaseDeliveryResponse(
        purchase_id=purchase.id,
        product_id=product.id,
        product_name=product.name,
        quantity=purchase.quantity,
        items=delivery,
    )


@router.post(
    "/admin/products/{product_id}/inventory",
    response_model=InventoryBulkCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_bulk(
    product_id: UUID,
    payload: InventoryBulkCreateRequest,
    current_admin: User = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
) -> InventoryBulkCreateResponse:
    product = db.get(
        Product,
        product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado.",
        )

    try:
        for request_item in payload.items:
            add_inventory_item(
                db,
                product_id=product.id,
                delivery_payload=(
                    request_item.payload
                ),
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    available = count_available(
        db,
        product_id=product.id,
    )

    return InventoryBulkCreateResponse(
        product_id=product.id,
        created=len(payload.items),
        available_stock=available,
    )


@router.get(
    "/admin/products/{product_id}/stock",
    response_model=InventoryStockResponse,
)
def read_inventory_stock(
    product_id: UUID,
    current_admin: User = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
) -> InventoryStockResponse:
    product = db.get(
        Product,
        product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado.",
        )

    counts = dict(
        db.execute(
            select(
                InventoryItem.status,
                func.count(
                    InventoryItem.id
                ),
            )
            .where(
                InventoryItem.product_id
                == product.id,
            )
            .group_by(
                InventoryItem.status,
            )
        ).all()
    )

    available = int(
        counts.get(
            "available",
            0,
        )
    )

    sold = int(
        counts.get(
            "sold",
            0,
        )
    )

    total = sum(
        int(value)
        for value in counts.values()
    )

    return InventoryStockResponse(
        product_id=product.id,
        product_name=product.name,
        available=available,
        sold=sold,
        total=total,
    )


@router.get(
    "/purchases/{purchase_id}/delivery.csv",
)
def download_purchase_delivery_csv(
    purchase_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    purchase = db.scalar(
        select(Purchase).where(
            Purchase.id == purchase_id,
            Purchase.user_id
            == current_user.id,
        )
    )

    if purchase is None:
        raise HTTPException(
            status_code=404,
            detail="Compra não encontrada.",
        )

    product = db.get(
        Product,
        purchase.product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Produto vinculado à compra "
                "não foi encontrado."
            ),
        )

    try:
        delivery = get_purchase_delivery(
            db,
            purchase_id=purchase.id,
            user_id=current_user.id,
        )

    except PurchaseNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except InventoryError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível carregar "
                "os dados da compra."
            ),
        ) from exc

    # União das chaves de todos os payloads.
    fieldnames: list[str] = []

    for delivery_item in delivery:
        payload = delivery_item["payload"]

        for key in payload.keys():
            if key not in fieldnames:
                fieldnames.append(key)

    output = io.StringIO(
        newline="",
    )

    writer = csv.DictWriter(
        output,
        fieldnames=fieldnames,
        extrasaction="ignore",
    )

    writer.writeheader()

    for delivery_item in delivery:
        payload = delivery_item["payload"]

        row = {}

        for key in fieldnames:
            value = payload.get(
                key,
                "",
            )

            if value is None:
                value = ""

            elif isinstance(
                value,
                (dict, list),
            ):
                import json

                value = json.dumps(
                    value,
                    ensure_ascii=False,
                )

            else:
                value = str(value)

            row[key] = value

        writer.writerow(row)

    content = output.getvalue()

    # BOM UTF-8 ajuda Excel no Windows a
    # reconhecer acentuação corretamente.
    csv_bytes = (
        "\ufeff" + content
    ).encode("utf-8")

    filename = (
        f"{product.slug}-"
        f"{purchase.id}.csv"
    )

    return StreamingResponse(
        iter([csv_bytes]),
        media_type=(
            "text/csv; charset=utf-8"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            ),
            "Cache-Control": (
                "private, no-store, max-age=0"
            ),
        },
    )
