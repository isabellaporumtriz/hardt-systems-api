from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.crypto import (
    decrypt_sensitive_value,
    encrypt_sensitive_value,
)
from app.inventory.models import (
    InventoryItem,
    Purchase,
    PurchaseItem,
)
from app.products.models import Product
from app.wallet.services import (
    InsufficientBalanceError,
    debit,
)


class InventoryError(RuntimeError):
    pass


class ProductNotFoundError(InventoryError):
    pass


class ProductUnavailableError(InventoryError):
    pass


class OutOfStockError(InventoryError):
    pass


class PurchaseNotFoundError(InventoryError):
    pass


def serialize_delivery_payload(
    payload: dict[str, Any],
) -> str:
    raw = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return encrypt_sensitive_value(raw)


def deserialize_delivery_payload(
    encrypted_payload: str,
) -> dict[str, Any]:
    raw = decrypt_sensitive_value(
        encrypted_payload
    )

    data = json.loads(raw)

    if not isinstance(data, dict):
        raise InventoryError(
            "Payload de entrega inválido."
        )

    return data


def add_inventory_item(
    db: Session,
    *,
    product_id: UUID,
    delivery_payload: dict[str, Any],
) -> InventoryItem:
    product = db.get(
        Product,
        product_id,
    )

    if product is None:
        raise ProductNotFoundError(
            "Produto não encontrado."
        )

    item = InventoryItem(
        product_id=product.id,
        status="available",
        delivery_payload=(
            serialize_delivery_payload(
                delivery_payload
            )
        ),
        sold_at=None,
    )

    db.add(item)
    db.flush()

    return item


def count_available(
    db: Session,
    *,
    product_id: UUID,
) -> int:
    count = db.scalar(
        select(
            func.count(
                InventoryItem.id
            )
        ).where(
            InventoryItem.product_id
            == product_id,
            InventoryItem.status
            == "available",
        )
    )

    return int(count or 0)


def purchase_product(
    db: Session,
    *,
    user_id: UUID,
    product_id: UUID,
    idempotency_key: str,
    quantity: int = 1,
) -> Purchase:
    """
    Compra uma ou várias unidades de forma atômica.

    Ou toda a quantidade solicitada é entregue e debitada,
    ou nenhuma unidade é consumida.
    """

    clean_idempotency_key = (
        str(idempotency_key or "").strip()
    )

    if not clean_idempotency_key:
        raise InventoryError(
            "Chave de idempotência obrigatória."
        )

    try:
        clean_quantity = int(quantity)
    except (TypeError, ValueError) as exc:
        raise InventoryError(
            "Quantidade inválida."
        ) from exc

    if clean_quantity < 1:
        raise InventoryError(
            "Quantidade deve ser maior que zero."
        )

    if clean_quantity > 500:
        raise InventoryError(
            "Quantidade máxima por compra é 500."
        )

    existing_purchase = db.scalar(
        select(Purchase).where(
            Purchase.user_id == user_id,
            Purchase.idempotency_key
            == clean_idempotency_key,
        )
    )

    if existing_purchase is not None:
        return existing_purchase

    try:
        product = db.scalar(
            select(Product)
            .where(
                Product.id == product_id,
            )
            .with_for_update()
        )

        if product is None:
            raise ProductNotFoundError(
                "Produto não encontrado."
            )

        if not product.is_active:
            raise ProductUnavailableError(
                "Produto indisponível para compra."
            )

        items = list(
            db.scalars(
                select(InventoryItem)
                .where(
                    InventoryItem.product_id
                    == product.id,
                    InventoryItem.status
                    == "available",
                )
                .order_by(
                    InventoryItem.created_at.asc()
                )
                .with_for_update(
                    skip_locked=True
                )
                .limit(clean_quantity)
            ).all()
        )

        if len(items) != clean_quantity:
            raise OutOfStockError(
                (
                    "Estoque insuficiente. "
                    f"Solicitado={clean_quantity} | "
                    f"Disponível={len(items)}"
                )
            )

        unit_price = Decimal(
            product.price
        ).quantize(
            Decimal("0.01")
        )

        total_amount = (
            unit_price
            * Decimal(clean_quantity)
        ).quantize(
            Decimal("0.01")
        )

        purchase_id = uuid4()

        debit(
            db,
            user_id=user_id,
            amount=total_amount,
            reference=(
                f"purchase:{purchase_id}"
            ),
            description=(
                f"Compra: {product.name} "
                f"x{clean_quantity}"
            ),
            product_code=product.slug,
        )

        now = datetime.now(
            timezone.utc
        )

        first_item = items[0]

        purchase = Purchase(
            id=purchase_id,
            user_id=user_id,
            product_id=product.id,
            inventory_item_id=first_item.id,
            idempotency_key=clean_idempotency_key,
            quantity=clean_quantity,
            unit_price_brl=unit_price,
            amount_brl=total_amount,
            status="completed",
            completed_at=now,
        )

        db.add(purchase)

        for item in items:
            item.status = "sold"
            item.sold_at = now

            purchase_item = PurchaseItem(
                purchase_id=purchase_id,
                inventory_item_id=item.id,
            )

            db.add(item)
            db.add(purchase_item)

        db.commit()

        db.refresh(purchase)

        return purchase

    except Exception:
        db.rollback()
        raise

def get_purchase(
    db: Session,
    *,
    purchase_id: UUID,
    user_id: UUID,
) -> Purchase:
    purchase = db.scalar(
        select(Purchase).where(
            Purchase.id == purchase_id,
            Purchase.user_id == user_id,
        )
    )

    if purchase is None:
        raise PurchaseNotFoundError(
            "Compra não encontrada."
        )

    return purchase


def get_purchase_delivery(
    db: Session,
    *,
    purchase_id: UUID,
    user_id: UUID,
) -> list[dict[str, Any]]:
    purchase = get_purchase(
        db,
        purchase_id=purchase_id,
        user_id=user_id,
    )

    purchase_items = list(
        db.scalars(
            select(PurchaseItem)
            .where(
                PurchaseItem.purchase_id
                == purchase.id,
            )
            .order_by(
                PurchaseItem.created_at.asc(),
                PurchaseItem.id.asc(),
            )
        ).all()
    )

    # Compatibilidade com compras antigas,
    # anteriores ao suporte a PurchaseItem.
    if not purchase_items:
        legacy_item = db.get(
            InventoryItem,
            purchase.inventory_item_id,
        )

        if legacy_item is None:
            raise InventoryError(
                "Item da compra não encontrado."
            )

        return [
            {
                "inventory_item_id": legacy_item.id,
                "payload": (
                    deserialize_delivery_payload(
                        legacy_item.delivery_payload
                    )
                ),
            }
        ]

    delivery_items: list[dict[str, Any]] = []

    for purchase_item in purchase_items:
        inventory_item = db.get(
            InventoryItem,
            purchase_item.inventory_item_id,
        )

        if inventory_item is None:
            raise InventoryError(
                "Item da compra não encontrado."
            )

        delivery_items.append(
            {
                "inventory_item_id": inventory_item.id,
                "payload": (
                    deserialize_delivery_payload(
                        inventory_item.delivery_payload
                    )
                ),
            }
        )

    return delivery_items

def list_user_purchases(
    db: Session,
    *,
    user_id: UUID,
) -> list[Purchase]:
    return list(
        db.scalars(
            select(Purchase)
            .where(
                Purchase.user_id
                == user_id,
            )
            .order_by(
                Purchase.created_at.desc()
            )
        ).all()
    )
