from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.inventory.models import Purchase
from app.products.models import Product
from app.smm.models import SMMOrder
from app.smm.provider import (
    JAPProvider,
    JAPOrderRejectedError,
    JAPOrderUncertainError,
    calculate_hardt_price_usd,
    decimal_from_jap,
    hardt_rate_usd,
)
from app.smm.schemas import (
    SMMCatalogResponse,
    SMMPricePreviewResponse,
    SMMQuoteResponse,
    SMMServiceResponse,
)
from app.wallet.services import credit, debit


class SMMError(RuntimeError):
    pass


class SMMServiceNotFoundError(SMMError):
    pass


class SMMExchangeRateError(SMMError):
    pass


class SMMProductUnavailableError(SMMError):
    pass


def _find_service(
    service_id: int,
) -> dict:
    provider = JAPProvider()

    services = provider.get_services()

    for item in services:
        try:
            current_id = int(
                item.get("service")
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        if current_id == service_id:
            return item

    raise SMMServiceNotFoundError(
        "Serviço SMM não encontrado."
    )


def _validate_quantity(
    *,
    item: dict,
    quantity: int,
) -> None:
    minimum = int(
        item.get("min") or 0
    )

    maximum = int(
        item.get("max") or 0
    )

    if quantity < minimum:
        raise SMMError(
            f"Quantidade mínima: {minimum}."
        )

    if maximum and quantity > maximum:
        raise SMMError(
            f"Quantidade máxima: {maximum}."
        )


def _usd_brl_rate() -> Decimal:
    value = Decimal(
        str(settings.smm_usd_brl_rate)
    )

    if value <= 0:
        raise SMMExchangeRateError(
            "SMM_USD_BRL_RATE não configurada."
        )

    return value.quantize(
        Decimal("0.000001")
    )


def get_catalog() -> SMMCatalogResponse:
    provider = JAPProvider()

    raw_services = provider.get_services()

    services: list[
        SMMServiceResponse
    ] = []

    for item in raw_services:
        try:
            service_id = int(
                item["service"]
            )

            minimum = int(
                item.get("min") or 0
            )

            maximum = int(
                item.get("max") or 0
            )

        except (
            KeyError,
            TypeError,
            ValueError,
        ):
            continue

        services.append(
            SMMServiceResponse(
                provider_service_id=(
                    service_id
                ),
                name=str(
                    item.get("name") or ""
                ),
                category=str(
                    item.get("category") or ""
                ),
                service_type=str(
                    item.get("type")
                    or "Default"
                ),
                min_quantity=minimum,
                max_quantity=maximum,
                refill=bool(
                    item.get(
                        "refill",
                        False,
                    )
                ),
                cancel=bool(
                    item.get(
                        "cancel",
                        False,
                    )
                ),
                hardt_rate_usd_per_1000=(
                    hardt_rate_usd(
                        item.get(
                            "rate",
                            "0",
                        )
                    )
                ),
            )
        )

    return SMMCatalogResponse(
        total=len(services),
        services=services,
    )


def preview_price(
    *,
    provider_service_id: int,
    quantity: int,
) -> SMMPricePreviewResponse:
    item = _find_service(
        provider_service_id
    )

    _validate_quantity(
        item=item,
        quantity=quantity,
    )

    rate = item.get(
        "rate",
        "0",
    )

    return SMMPricePreviewResponse(
        provider_service_id=(
            provider_service_id
        ),
        quantity=quantity,
        hardt_rate_usd_per_1000=(
            hardt_rate_usd(rate)
        ),
        total_usd=(
            calculate_hardt_price_usd(
                provider_rate_usd=rate,
                quantity=quantity,
            )
        ),
    )


def create_quote(
    *,
    service_id: int,
    quantity: int,
) -> SMMQuoteResponse:
    item = _find_service(
        service_id
    )

    _validate_quantity(
        item=item,
        quantity=quantity,
    )

    provider_rate = decimal_from_jap(
        item.get(
            "rate",
            "0",
        )
    )

    hardt_rate = hardt_rate_usd(
        provider_rate
    )

    hardt_price_usd = (
        calculate_hardt_price_usd(
            provider_rate_usd=(
                provider_rate
            ),
            quantity=quantity,
        )
    )

    fx = _usd_brl_rate()

    amount_brl = (
        hardt_price_usd * fx
    ).quantize(
        Decimal("0.01")
    )

    return SMMQuoteResponse(
        provider_service_id=service_id,
        service_name=str(
            item.get("name") or ""
        ),
        category=str(
            item.get("category") or ""
        ),
        quantity=quantity,
        hardt_rate_usd_per_1000=(
            hardt_rate
        ),
        hardt_price_usd=(
            hardt_price_usd
        ),
        usd_brl_rate=fx,
        amount_brl=amount_brl,
    )


def create_local_smm_purchase(
    db: Session,
    *,
    user_id: UUID,
    service_id: int,
    quantity: int,
    target_url: str,
    idempotency_key: str,
) -> tuple[Purchase, SMMOrder]:

    clean_key = str(
        idempotency_key or ""
    ).strip()

    if len(clean_key) < 8:
        raise SMMError(
            "Chave de idempotência inválida."
        )

    clean_url = str(
        target_url or ""
    ).strip()

    if not clean_url:
        raise SMMError(
            "Link de destino obrigatório."
        )

    existing_purchase = db.scalar(
        select(Purchase).where(
            Purchase.user_id
            == user_id,
            Purchase.idempotency_key
            == clean_key,
        )
    )

    if existing_purchase:
        existing_order = db.scalar(
            select(SMMOrder).where(
                SMMOrder.purchase_id
                == existing_purchase.id
            )
        )

        if existing_order is None:
            raise SMMError(
                "Compra existente sem pedido "
                "SMM correspondente."
            )

        return (
            existing_purchase,
            existing_order,
        )

    item = _find_service(
        service_id
    )

    _validate_quantity(
        item=item,
        quantity=quantity,
    )

    product = db.scalar(
        select(Product).where(
            Product.slug
            == "hardt-smm",
            Product.is_active.is_(True),
            Product.delivery_type
            == "service",
        )
    )

    if product is None:
        raise SMMProductUnavailableError(
            "Hardt SMM indisponível."
        )

    provider_rate = (
        decimal_from_jap(
            item.get(
                "rate",
                "0",
            )
        )
    )

    provider_cost_usd = (
        provider_rate
        * Decimal(quantity)
        / Decimal("1000")
    ).quantize(
        Decimal("0.000001")
    )

    hardt_rate = hardt_rate_usd(
        provider_rate
    )

    hardt_price_usd = (
        calculate_hardt_price_usd(
            provider_rate_usd=(
                provider_rate
            ),
            quantity=quantity,
        )
    )

    fx = _usd_brl_rate()

    amount_brl = (
        hardt_price_usd * fx
    ).quantize(
        Decimal("0.01")
    )

    purchase_id = uuid4()

    try:
        debit(
            db,
            user_id=user_id,
            amount=amount_brl,
            reference=(
                f"purchase:{purchase_id}"
            ),
            description=(
                "Compra Hardt SMM: "
                f"{item.get('name')}"
            ),
            product_code="hardt-smm",
        )

        now = datetime.now(
            timezone.utc
        )

        purchase = Purchase(
            id=purchase_id,
            user_id=user_id,
            product_id=product.id,
            inventory_item_id=None,
            idempotency_key=clean_key,
            quantity=quantity,
            unit_price_brl=(
                (
                    amount_brl
                    / Decimal(quantity)
                ).quantize(
                    Decimal("0.01")
                )
            ),
            amount_brl=amount_brl,
            status="processing",
            completed_at=None,
        )

        db.add(purchase)
        db.flush()

        order = SMMOrder(
            purchase_id=purchase.id,
            provider="jap",
            provider_service_id=str(
                service_id
            ),
            provider_order_id=None,
            service_name=str(
                item.get("name") or ""
            ),
            category=str(
                item.get("category") or ""
            ),
            target_url=clean_url,
            quantity=quantity,
            provider_rate_usd=(
                provider_rate
            ),
            provider_cost_usd=(
                provider_cost_usd
            ),
            hardt_rate_usd=(
                hardt_rate
            ),
            hardt_price_usd=(
                hardt_price_usd
            ),
            usd_brl_rate=fx,
            amount_brl=amount_brl,
            provider_status=(
                "not_submitted"
            ),
            start_count=None,
            remains=None,
            provider_error=None,
        )

        db.add(order)

        db.commit()

        db.refresh(purchase)
        db.refresh(order)

        return purchase, order

    except Exception:
        db.rollback()
        raise


class SMMSubmissionError(SMMError):
    pass


class SMMSubmissionUnknownError(
    SMMSubmissionError
):
    """
    A chamada ao provider pode ter chegado,
    mas não recebemos confirmação segura.

    NÃO deve haver retry automático.
    """
    pass


def submit_smm_order(
    db: Session,
    *,
    order_id: UUID,
    user_id: UUID,
) -> SMMOrder:
    order = db.scalar(
        select(SMMOrder)
        .join(
            Purchase,
            Purchase.id
            == SMMOrder.purchase_id,
        )
        .where(
            SMMOrder.id == order_id,
            Purchase.user_id == user_id,
        )
    )

    if order is None:
        raise SMMError(
            "Pedido SMM não encontrado."
        )

    if order.provider_order_id:
        return order

    if order.provider_status == "submitted":
        return order

    if order.provider_status in {
        "submitting",
        "submission_unknown",
    }:
        raise SMMSubmissionUnknownError(
            "Pedido possui submissão inconclusiva. "
            "Retry automático bloqueado."
        )

    purchase = db.get(
        Purchase,
        order.purchase_id,
    )

    if purchase is None:
        raise SMMError(
            "Purchase do pedido SMM não encontrada."
        )

    order.provider_status = "submitting"
    order.provider_error = None

    db.add(order)
    db.commit()
    db.refresh(order)

    provider = JAPProvider()

    try:
        provider_order_id = (
            provider.add_order(
                service_id=int(
                    order.provider_service_id
                ),
                link=order.target_url,
                quantity=order.quantity,
            )
        )

    except JAPOrderRejectedError as exc:
        order.provider_status = (
            "submission_failed"
        )
        order.provider_error = str(exc)

        purchase.status = "failed"

        credit(
            db,
            user_id=user_id,
            amount=order.amount_brl,
            reference=(
                f"smm-refund:{purchase.id}"
            ),
            description=(
                "Estorno automático Hardt SMM "
                "por rejeição do provider"
            ),
            product_code="hardt-smm",
        )

        db.add(order)
        db.add(purchase)

        db.commit()

        raise SMMSubmissionError(
            "A JAP rejeitou o pedido. "
            "O valor foi estornado para sua carteira."
        ) from exc

    except JAPOrderUncertainError as exc:
        order.provider_status = (
            "submission_unknown"
        )
        order.provider_error = str(exc)

        db.add(order)
        db.commit()

        raise SMMSubmissionUnknownError(
            "A confirmação do provider foi "
            "inconclusiva. O pedido foi bloqueado "
            "para evitar duplicidade."
        ) from exc

    except Exception as exc:
        order.provider_status = (
            "submission_unknown"
        )
        order.provider_error = str(exc)

        db.add(order)
        db.commit()

        raise SMMSubmissionUnknownError(
            "Falha inesperada durante submissão. "
            "Retry automático bloqueado."
        ) from exc

    order.provider_order_id = str(
        provider_order_id
    )

    order.provider_status = "submitted"
    order.provider_error = None

    purchase.status = "processing"

    order.updated_at = datetime.now(
        timezone.utc
    )

    purchase.updated_at = datetime.now(
        timezone.utc
    )

    db.add(order)
    db.add(purchase)

    db.commit()
    db.refresh(order)

    return order

def sync_smm_order(
    db: Session,
    *,
    order_id: UUID,
    user_id: UUID,
) -> SMMOrder:
    """
    Sincroniza status de um pedido já confirmado
    na JAP.
    """

    order = db.scalar(
        select(SMMOrder)
        .join(
            Purchase,
            Purchase.id
            == SMMOrder.purchase_id,
        )
        .where(
            SMMOrder.id == order_id,
            Purchase.user_id == user_id,
        )
    )

    if order is None:
        raise SMMError(
            "Pedido SMM não encontrado."
        )

    if not order.provider_order_id:
        raise SMMError(
            "Pedido ainda não possui "
            "provider_order_id."
        )

    provider = JAPProvider()

    body = provider.get_order_status(
        order_id=order.provider_order_id
    )

    raw_status = str(
        body.get("status")
        or "unknown"
    ).strip()

    order.provider_status = raw_status

    start_count = body.get(
        "start_count"
    )

    remains = body.get(
        "remains"
    )

    try:
        order.start_count = (
            int(start_count)
            if start_count
            not in (None, "")
            else None
        )
    except (
        TypeError,
        ValueError,
    ):
        pass

    try:
        order.remains = (
            int(remains)
            if remains
            not in (None, "")
            else None
        )
    except (
        TypeError,
        ValueError,
    ):
        pass

    order.provider_error = None

    sync_at = datetime.now(
        timezone.utc
    )

    order.updated_at = sync_at

    purchase = db.get(
        Purchase,
        order.purchase_id,
    )

    normalized = raw_status.lower()

    if purchase is not None:
        if normalized in {
            "completed",
            "complete",
        }:
            purchase.status = "completed"

            if purchase.completed_at is None:
                purchase.completed_at = sync_at

        elif normalized in {
            "canceled",
            "cancelled",
            "refunded",
        }:
            purchase.status = "failed"

        else:
            purchase.status = "processing"

        purchase.updated_at = sync_at

        db.add(purchase)

    db.add(order)
    db.commit()
    db.refresh(order)

    return order
