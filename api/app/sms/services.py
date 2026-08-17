from __future__ import annotations

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from decimal import (
    Decimal,
    ROUND_HALF_UP,
)
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.inventory.models import Purchase
from app.products.models import Product
from app.sms.models import SMSActivation
from app.sms.provider import (
    BRAZIL_ID,
    SERVICE_NAMES,
    SMS24hProvider,
    SMS24hProviderError,
    SMS24hPurchaseUncertainError,
)
from app.wallet.services import (
    InsufficientBalanceError,
    credit,
    debit,
    get_wallet_for_update,
)


PRODUCT_CODE = "hardt-sms"


class SMSServiceError(RuntimeError):
    pass


class SMSProductUnavailableError(
    SMSServiceError
):
    pass


class SMSProviderPurchaseError(
    SMSServiceError
):
    pass


class SMSActivationNotFoundError(
    SMSServiceError
):
    pass


class SMSActivationConflictError(
    SMSServiceError
):
    pass


class SMSCancelTooEarlyError(
    SMSActivationConflictError
):
    pass


def _provider() -> SMS24hProvider:
    return SMS24hProvider()


def _markup_multiplier() -> Decimal:
    multiplier = Decimal(
        str(
            settings.sms24h_markup_multiplier
        )
    )

    if multiplier <= 0:
        raise SMSServiceError(
            "SMS24H_MARKUP_MULTIPLIER inválido."
        )

    return multiplier


def _sell_price(
    provider_cost_brl: Decimal,
) -> Decimal:
    return (
        provider_cost_brl
        * _markup_multiplier()
    ).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def _country_data(
    raw: dict,
    country: int,
) -> dict:
    data = (
        raw.get(str(country))
        or raw.get(country)
        or {}
    )

    if not isinstance(data, dict):
        return {}

    return data


def get_catalog(
    country: int = BRAZIL_ID,
) -> list[dict]:
    raw = _provider().get_prices(
        country=country
    )

    country_data = _country_data(
        raw,
        country,
    )

    services: list[dict] = []

    for code, info in country_data.items():
        if not isinstance(info, dict):
            continue

        count = int(
            info.get("count", 0)
            or 0
        )

        if count <= 0:
            continue

        code_string = str(code)

        services.append(
            {
                "code": code_string,
                "name": (
                    SERVICE_NAMES.get(
                        code_string
                    )
                    or code_string.upper()
                ),
                "available_count": count,
            }
        )

    services.sort(
        key=lambda item: (
            0
            if item["code"] == "wa"
            else 1,
            item["name"].lower(),
        )
    )

    return services


def get_quote(
    *,
    country: int,
    service_code: str,
) -> dict:
    provider = _provider()

    raw = provider.get_prices(
        country=country,
        service=service_code,
    )

    country_data = _country_data(
        raw,
        country,
    )

    info = country_data.get(
        service_code
    )

    if not isinstance(info, dict):
        raise SMSServiceError(
            "Serviço indisponível."
        )

    provider_cost = Decimal(
        str(
            info.get("cost")
        )
    )

    count = int(
        info.get("count", 0)
        or 0
    )

    return {
        "country": country,
        "service_code": service_code,
        "service_name": (
            SERVICE_NAMES.get(service_code)
            or service_code.upper()
        ),
        "available": count > 0,
        "provider_cost_brl": provider_cost,
        "price_brl": _sell_price(
            provider_cost
        ),
    }


def _get_product(
    db: Session,
) -> Product:
    product = db.scalar(
        select(Product).where(
            Product.slug == PRODUCT_CODE,
            Product.is_active.is_(True),
            Product.delivery_type
            == "service",
        )
    )

    if product is None:
        raise SMSProductUnavailableError(
            "HardtSMS indisponível."
        )

    return product


def _get_activation(
    db: Session,
    *,
    user_id: UUID,
    activation_id: UUID,
    for_update: bool = False,
) -> SMSActivation:
    query = select(
        SMSActivation
    ).where(
        SMSActivation.id == activation_id,
        SMSActivation.user_id == user_id,
    )

    if for_update:
        query = query.with_for_update()

    activation = db.scalar(query)

    if activation is None:
        raise SMSActivationNotFoundError(
            "Ativação não encontrada."
        )

    return activation


def _get_purchase(
    db: Session,
    activation: SMSActivation,
) -> Purchase | None:
    return db.get(
        Purchase,
        activation.purchase_id,
    )


def _mark_purchase_failed(
    db: Session,
    activation: SMSActivation,
) -> None:
    purchase = _get_purchase(
        db,
        activation,
    )

    if purchase is not None:
        purchase.status = "failed"
        purchase.completed_at = (
            datetime.now(timezone.utc)
        )
        db.add(purchase)


def _mark_purchase_completed(
    db: Session,
    activation: SMSActivation,
) -> None:
    purchase = _get_purchase(
        db,
        activation,
    )

    if purchase is not None:
        purchase.status = "completed"
        purchase.completed_at = (
            datetime.now(timezone.utc)
        )
        db.add(purchase)


def _refund_once(
    db: Session,
    activation: SMSActivation,
) -> None:
    credit(
        db,
        user_id=activation.user_id,
        amount=Decimal(
            activation.customer_price
        ),
        reference=(
            f"sms-refund:"
            f"{activation.purchase_id}"
        ),
        description=(
            "Estorno automático HardtSMS"
        ),
        product_code=PRODUCT_CODE,
    )


def purchase_activation(
    db: Session,
    *,
    user_id: UUID,
    country: int,
    service_code: str,
    idempotency_key: str,
) -> SMSActivation:
    clean_key = idempotency_key.strip()

    existing_purchase = db.scalar(
        select(Purchase).where(
            Purchase.idempotency_key
            == clean_key
        )
    )

    if existing_purchase is not None:
        if (
            existing_purchase.user_id
            != user_id
        ):
            raise SMSActivationConflictError(
                "Idempotency key já utilizada."
            )

        existing_activation = db.scalar(
            select(SMSActivation).where(
                SMSActivation.purchase_id
                == existing_purchase.id
            )
        )

        if existing_activation is None:
            raise SMSActivationConflictError(
                "Compra existente sem ativação SMS."
            )

        return existing_activation

    product = _get_product(db)

    quote = get_quote(
        country=country,
        service_code=service_code,
    )

    if not quote["available"]:
        raise SMSProviderPurchaseError(
            "Nenhum número disponível."
        )

    customer_price = Decimal(
        quote["price_brl"]
    )

    provider_cost = Decimal(
        quote["provider_cost_brl"]
    )

    wallet = get_wallet_for_update(
        db,
        user_id,
    )

    if wallet.balance < customer_price:
        raise InsufficientBalanceError(
            "Saldo insuficiente."
        )

    purchase_id = uuid4()

    purchase = Purchase(
        id=purchase_id,
        user_id=user_id,
        product_id=product.id,
        inventory_item_id=None,
        idempotency_key=clean_key,
        quantity=1,
        unit_price_brl=customer_price,
        amount_brl=customer_price,
        status="processing",
        completed_at=None,
    )

    activation = SMSActivation(
        purchase_id=purchase_id,
        user_id=user_id,
        provider="sms24h",
        provider_activation_id=None,
        phone_number=None,
        country_code=country,
        service_code=service_code,
        operator="any",
        provider_cost_brl=provider_cost,
        customer_price=customer_price,
        status="submitting",
        expires_at=None,
    )

    db.add(purchase)
    db.add(activation)
    db.flush()

    debit(
        db,
        user_id=user_id,
        amount=customer_price,
        reference=f"purchase:{purchase_id}",
        description=(
            "Compra HardtSMS: "
            f"{quote['service_name']}"
        ),
        product_code=PRODUCT_CODE,
    )

    # Durabilidade antes da chamada externa:
    # se o processo morrer durante getNumber,
    # teremos Purchase + débito + activation=submitting.
    db.commit()

    provider = _provider()

    try:
        result = provider.buy_number(
            service=service_code,
            country=country,
            operator="any",
        )

    except SMS24hPurchaseUncertainError:
        activation.status = (
            "submission_unknown"
        )

        db.add(activation)
        db.commit()
        db.refresh(activation)

        # NÃO estornar.
        # O provider pode ter alocado um número.
        # NÃO fazer retry automático.
        return activation

    except SMS24hProviderError as exc:
        _refund_once(
            db,
            activation,
        )

        activation.status = "failed"
        activation.finished_at = (
            datetime.now(timezone.utc)
        )

        purchase.status = "failed"
        purchase.completed_at = (
            datetime.now(timezone.utc)
        )

        db.add(activation)
        db.add(purchase)
        db.commit()

        raise SMSProviderPurchaseError(
            str(exc)
        ) from exc

    if (
        isinstance(result, str)
        and result in {
            "NO_NUMBERS",
            "NO_BALANCE",
            "WRONG_SERVICE",
        }
    ):
        messages = {
            "NO_NUMBERS":
                "Nenhum número disponível.",
            "NO_BALANCE":
                "Provider temporariamente "
                "indisponível.",
            "WRONG_SERVICE":
                "Serviço inválido.",
        }

        _refund_once(
            db,
            activation,
        )

        activation.status = "failed"
        activation.finished_at = (
            datetime.now(timezone.utc)
        )

        purchase.status = "failed"
        purchase.completed_at = (
            datetime.now(timezone.utc)
        )

        db.add(activation)
        db.add(purchase)
        db.commit()

        raise SMSProviderPurchaseError(
            messages[result]
        )

    if not isinstance(result, dict):
        # Teoricamente o provider já classifica isso
        # como uncertain. Mantemos defesa adicional.
        activation.status = (
            "submission_unknown"
        )

        db.add(activation)
        db.commit()
        db.refresh(activation)

        return activation

    provider_activation_id = str(
        result["activation_id"]
    )

    phone_number = str(
        result["phone_number"]
    )

    activation.provider_activation_id = (
        provider_activation_id
    )
    activation.phone_number = phone_number
    activation.status = "waiting"
    activation.expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=20)
    )

    db.add(activation)

    try:
        db.commit()
        db.refresh(activation)

    except Exception:
        db.rollback()

        # Agora conhecemos o ID do provider.
        # Tentamos cancelar para não deixar
        # uma ativação órfã.
        try:
            provider.cancel(
                provider_activation_id
            )
        except Exception:
            # Não sabemos se o cancelamento ocorreu.
            # Não criamos retry automático aqui.
            pass

        raise

    return activation


def list_activations(
    db: Session,
    *,
    user_id: UUID,
) -> list[SMSActivation]:
    return list(
        db.scalars(
            select(SMSActivation)
            .where(
                SMSActivation.user_id
                == user_id
            )
            .order_by(
                SMSActivation.created_at.desc()
            )
        ).all()
    )


def sync_activation(
    db: Session,
    *,
    user_id: UUID,
    activation_id: UUID,
) -> SMSActivation:
    activation = _get_activation(
        db,
        user_id=user_id,
        activation_id=activation_id,
        for_update=True,
    )

    if activation.status in {
        "finished",
        "cancelled",
        "expired",
        "failed",
        "submission_unknown",
    }:
        return activation

    if (
        activation.status == "submitting"
        and activation.provider_activation_id
        is None
    ):
        now = datetime.now(timezone.utc)

        created_at = activation.created_at

        if (
            created_at is not None
            and created_at.tzinfo is None
        ):
            created_at = created_at.replace(
                tzinfo=timezone.utc
            )

        if (
            created_at is not None
            and now - created_at
            >= timedelta(seconds=60)
        ):
            activation.status = (
                "submission_unknown"
            )
            db.add(activation)
            db.flush()

        return activation

    if not activation.provider_activation_id:
        raise SMSActivationConflictError(
            "Ativação ainda não possui confirmação "
            "do provider."
        )

    provider_status = (
        _provider().get_status(
            activation.provider_activation_id
        )
    )

    now = datetime.now(timezone.utc)

    if provider_status == "STATUS_WAIT_CODE":
        activation.status = "waiting"

    elif provider_status.startswith(
        "STATUS_OK:"
    ):
        activation.status = (
            "code_received"
        )
        activation.sms_code = (
            provider_status.split(
                ":",
                1,
            )[1]
        )

    elif provider_status in {
        "STATUS_CANCEL",
        "NO_ACTIVATION",
    }:
        if not activation.sms_code:
            _refund_once(
                db,
                activation,
            )

        activation.status = (
            "cancelled"
            if provider_status
            == "STATUS_CANCEL"
            else "expired"
        )

        activation.finished_at = now

        _mark_purchase_failed(
            db,
            activation,
        )

    db.add(activation)
    db.flush()

    return activation


def cancel_activation(
    db: Session,
    *,
    user_id: UUID,
    activation_id: UUID,
) -> SMSActivation:
    activation = _get_activation(
        db,
        user_id=user_id,
        activation_id=activation_id,
        for_update=True,
    )

    if activation.status == "cancelled":
        return activation

    if activation.status in {
        "submitting",
        "submission_unknown",
    }:
        raise SMSActivationConflictError(
            "A ativação ainda aguarda reconciliação "
            "com o provider e não pode ser "
            "cancelada automaticamente."
        )

    if not activation.provider_activation_id:
        raise SMSActivationConflictError(
            "Ativação sem ID confirmado do provider."
        )

    if activation.status == "finished":
        raise SMSActivationConflictError(
            "Ativação finalizada não pode "
            "ser cancelada."
        )

    provider = _provider()

    status = provider.get_status(
        activation.provider_activation_id
    )

    if status.startswith(
        "STATUS_OK:"
    ):
        activation.status = (
            "code_received"
        )
        activation.sms_code = (
            status.split(
                ":",
                1,
            )[1]
        )

        db.add(activation)
        db.flush()

        raise SMSActivationConflictError(
            "Ativação já recebeu SMS e "
            "não pode ser estornada."
        )

    if status != "STATUS_CANCEL":
        cancel_result = provider.cancel(
            activation.provider_activation_id
        )

        if (
            "EARLY_CANCEL_DENIED"
            in cancel_result
        ):
            raise SMSCancelTooEarlyError(
                "Aguarde pelo menos 120 "
                "segundos após a compra."
            )

        status = provider.get_status(
            activation.provider_activation_id
        )

    if status != "STATUS_CANCEL":
        raise SMSActivationConflictError(
            "SMS24h não confirmou "
            "o cancelamento."
        )

    _refund_once(
        db,
        activation,
    )

    activation.status = "cancelled"
    activation.finished_at = (
        datetime.now(timezone.utc)
    )

    _mark_purchase_failed(
        db,
        activation,
    )

    db.add(activation)
    db.flush()

    return activation


def finish_activation(
    db: Session,
    *,
    user_id: UUID,
    activation_id: UUID,
) -> SMSActivation:
    activation = _get_activation(
        db,
        user_id=user_id,
        activation_id=activation_id,
        for_update=True,
    )

    if activation.status == "finished":
        return activation

    if activation.status in {
        "submitting",
        "submission_unknown",
    }:
        raise SMSActivationConflictError(
            "A ativação ainda aguarda reconciliação "
            "com o provider e não pode ser "
            "finalizada."
        )

    if not activation.provider_activation_id:
        raise SMSActivationConflictError(
            "Ativação sem ID confirmado do provider."
        )

    if activation.status == "cancelled":
        raise SMSActivationConflictError(
            "Ativação cancelada não pode "
            "ser finalizada."
        )

    provider = _provider()

    status = provider.get_status(
        activation.provider_activation_id
    )

    if status == "STATUS_CANCEL":
        if not activation.sms_code:
            _refund_once(
                db,
                activation,
            )

        activation.status = "cancelled"
        activation.finished_at = (
            datetime.now(timezone.utc)
        )

        _mark_purchase_failed(
            db,
            activation,
        )

        db.add(activation)
        db.flush()

        raise SMSActivationConflictError(
            "Ativação já foi cancelada "
            "no provider."
        )

    if not status.startswith(
        "STATUS_OK:"
    ):
        raise SMSActivationConflictError(
            "Ativação ainda não recebeu SMS."
        )

    activation.sms_code = (
        status.split(
            ":",
            1,
        )[1]
    )

    provider.finish(
        activation.provider_activation_id
    )

    activation.status = "finished"
    activation.finished_at = (
        datetime.now(timezone.utc)
    )

    _mark_purchase_completed(
        db,
        activation,
    )

    db.add(activation)
    db.flush()

    return activation
