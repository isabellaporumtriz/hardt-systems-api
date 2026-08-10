from __future__ import annotations

import asyncio
import re
from datetime import (
    date,
    datetime,
    timezone,
)
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

# Estes imports registram todos os models relacionados
# antes de o SQLAlchemy configurar os mappers.
from app.devices.models import Device  # noqa: F401
from app.licenses.models import License  # noqa: F401

from app.asaas.client import (
    AsaasError,
    asaas_client,
)
from app.billing.models import BillingSubscription
from app.billing.schemas import (
    LicenseRenewalResponse,
    MonthlyCheckoutRequest,
    MonthlyCheckoutResponse,
    OneTimeCheckoutRequest,
    OneTimeCheckoutResponse,
)
from app.finance.models import Charge
from app.core.config import settings
from app.finance.services import generate_charge_number
from app.products.models import Product
from app.users.models import User


ACTIVE_LOCAL_STATUSES = {
    "pending",
    "active",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def only_digits(value: str) -> str:
    return re.sub(
        r"\D",
        "",
        value,
    )


def parse_due_date(
    value: str | None,
) -> datetime:
    if not value:
        return utc_now()

    parsed_date = date.fromisoformat(value)

    return datetime(
        parsed_date.year,
        parsed_date.month,
        parsed_date.day,
        23,
        59,
        59,
        tzinfo=timezone.utc,
    )


def validate_document(
    cpf_cnpj: str,
) -> str:
    value = only_digits(cpf_cnpj)

    if len(value) not in {
        11,
        14,
    }:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="CPF ou CNPJ inválido.",
        )

    return value


def validate_mobile_phone(
    mobile_phone: str,
) -> str:
    value = only_digits(mobile_phone)

    if len(value) not in {
        10,
        11,
    }:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="Celular inválido.",
        )

    return value


def get_monthly_product(
    db: Session,
    product_slug: str,
) -> Product:
    normalized_slug = (
        product_slug.strip().lower()
    )

    product = db.scalar(
        select(Product).where(
            Product.slug == normalized_slug,
            Product.is_active.is_(True),
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado.",
        )

    if product.billing_type != "monthly":
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Esse produto não está configurado "
                "como assinatura mensal."
            ),
        )

    if Decimal(product.price) <= 0:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "O produto não possui um preço válido."
            ),
        )

    return product


def build_existing_response(
    subscription: BillingSubscription,
    product: Product,
    user: User,
) -> MonthlyCheckoutResponse:
    if (
        not subscription.invoice_url
        or not subscription.asaas_subscription_id
        or not subscription.latest_payment_id
        or not user.asaas_customer_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Existe uma assinatura incompleta. "
                "Cancele-a antes de criar outra."
            ),
        )

    return MonthlyCheckoutResponse(
        subscription_id=subscription.id,
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        amount=Decimal(product.price),
        cycle=subscription.billing_cycle,
        status=subscription.status,
        invoice_url=subscription.invoice_url,
        asaas_customer_id=(
            user.asaas_customer_id
        ),
        asaas_subscription_id=(
            subscription.asaas_subscription_id
        ),
        asaas_payment_id=(
            subscription.latest_payment_id
        ),
    )


async def ensure_asaas_customer(
    db: Session,
    user: User,
    *,
    cpf_cnpj: str,
    mobile_phone: str,
) -> str:
    if user.asaas_customer_id:
        return user.asaas_customer_id

    try:
        result = await asaas_client.post(
            "/customers",
            json={
                "name": user.name,
                "email": user.email,
                "cpfCnpj": cpf_cnpj,
                "mobilePhone": mobile_phone,
                "externalReference": str(user.id),
                "notificationDisabled": False,
            },
        )
    except AsaasError as exc:
        raise HTTPException(
            status_code=(
                exc.status_code
                or status.HTTP_502_BAD_GATEWAY
            ),
            detail={
                "message": (
                    "Não foi possível criar o "
                    "cliente no Asaas."
                ),
                "asaas": exc.response_data,
            },
        ) from exc

    customer_id = result.get("id")

    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "O Asaas não retornou o ID "
                "do cliente."
            ),
        )

    user.asaas_customer_id = str(
        customer_id
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return str(customer_id)


async def get_first_payment(
    asaas_subscription_id: str,
) -> dict[str, Any]:
    for attempt in range(1, 8):
        try:
            result = await asaas_client.get(
                (
                    f"/subscriptions/"
                    f"{asaas_subscription_id}"
                    "/payments"
                ),
                params={
                    "limit": 10,
                    "offset": 0,
                },
            )
        except AsaasError as exc:
            raise HTTPException(
                status_code=(
                    exc.status_code
                    or status.HTTP_502_BAD_GATEWAY
                ),
                detail={
                    "message": (
                        "Não foi possível consultar "
                        "a cobrança da assinatura."
                    ),
                    "asaas": exc.response_data,
                },
            ) from exc

        payments = result.get("data") or []

        if payments:
            return payments[0]

        await asyncio.sleep(
            attempt * 0.7
        )

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=(
            "A assinatura foi criada, mas a primeira "
            "cobrança ainda não ficou disponível."
        ),
    )


async def create_monthly_checkout(
    db: Session,
    user: User,
    payload: MonthlyCheckoutRequest,
) -> MonthlyCheckoutResponse:
    cpf_cnpj = validate_document(
        payload.cpf_cnpj
    )

    mobile_phone = validate_mobile_phone(
        payload.mobile_phone
    )

    product = get_monthly_product(
        db,
        payload.product_slug,
    )

    existing_subscription = db.scalar(
        select(BillingSubscription).where(
            BillingSubscription.user_id
            == user.id,
            BillingSubscription.product_id
            == product.id,
            BillingSubscription.status.in_(
                ACTIVE_LOCAL_STATUSES
            ),
        )
    )

    if existing_subscription is not None:
        return build_existing_response(
            existing_subscription,
            product,
            user,
        )

    customer_id = await ensure_asaas_customer(
        db,
        user,
        cpf_cnpj=cpf_cnpj,
        mobile_phone=mobile_phone,
    )

    local_subscription = BillingSubscription(
        user_id=user.id,
        product_id=product.id,
        provider="asaas",
        status="pending",
        billing_cycle="MONTHLY",
        next_due_at=utc_now(),
    )

    db.add(local_subscription)
    db.flush()

    try:
        asaas_subscription = (
            await asaas_client.post(
                "/subscriptions",
                json={
                    "customer": customer_id,
                    "billingType": "UNDEFINED",
                    "value": float(
                        Decimal(product.price)
                    ),
                    "nextDueDate": (
                        utc_now()
                        .date()
                        .isoformat()
                    ),
                    "cycle": "MONTHLY",
                    "description": (
                        f"Assinatura mensal "
                        f"{product.name}"
                    ),
                    "externalReference": str(
                        local_subscription.id
                    ),
                },
            )
        )
    except AsaasError as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                exc.status_code
                or status.HTTP_502_BAD_GATEWAY
            ),
            detail={
                "message": (
                    "Não foi possível criar a "
                    "assinatura no Asaas."
                ),
                "asaas": exc.response_data,
            },
        ) from exc

    asaas_subscription_id = (
        asaas_subscription.get("id")
    )

    if not asaas_subscription_id:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "O Asaas não retornou o ID "
                "da assinatura."
            ),
        )

    try:
        payment = await get_first_payment(
            str(asaas_subscription_id)
        )
    except Exception:
        db.rollback()
        raise

    payment_id = payment.get("id")
    invoice_url = payment.get("invoiceUrl")

    if not payment_id or not invoice_url:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "O Asaas não retornou a cobrança "
                "ou o link de pagamento."
            ),
        )

    local_subscription.asaas_subscription_id = str(
        asaas_subscription_id
    )

    local_subscription.latest_payment_id = str(
        payment_id
    )

    local_subscription.invoice_url = str(
        invoice_url
    )

    local_subscription.next_due_at = (
        parse_due_date(
            payment.get("dueDate")
        )
    )

    charge = Charge(
        user_id=user.id,
        product_id=product.id,
        license_id=None,
        charge_number=(
            generate_charge_number(db)
        ),
        description=(
            f"Assinatura mensal {product.name}"
        ),
        amount=Decimal(product.price),
        status="pending",
        payment_method=payment.get(
            "billingType"
        ),
        due_at=parse_due_date(
            payment.get("dueDate")
        ),
        paid_at=None,
        cancelled_at=None,
        refunded_at=None,
        external_reference=str(
            payment_id
        ),
        notes=(
            "Cobrança criada automaticamente "
            "pela integração Asaas."
        ),
        asaas_payment_id=str(
            payment_id
        ),
        asaas_subscription_id=str(
            asaas_subscription_id
        ),
        invoice_url=str(
            invoice_url
        ),
    )

    db.add(local_subscription)
    db.add(charge)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(local_subscription)

    return MonthlyCheckoutResponse(
        subscription_id=(
            local_subscription.id
        ),
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        amount=Decimal(product.price),
        cycle="MONTHLY",
        status="pending",
        invoice_url=str(invoice_url),
        asaas_customer_id=customer_id,
        asaas_subscription_id=str(
            asaas_subscription_id
        ),
        asaas_payment_id=str(
            payment_id
        ),
    )


async def create_one_time_checkout(
    db: Session,
    user: User,
    payload: OneTimeCheckoutRequest,
) -> OneTimeCheckoutResponse:
    mobile_phone = validate_mobile_phone(
        payload.mobile_phone
    )

    normalized_slug = (
        payload.product_slug
        .strip()
        .lower()
    )

    product = db.scalar(
        select(Product).where(
            Product.slug == normalized_slug,
            Product.is_active.is_(True),
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado.",
        )

    if Decimal(product.price) <= 0:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "O produto não possui um preço válido."
            ),
        )

    description = (
        f"Licença {product.name} "
        f"por {product.license_duration_days or 30} dias"
    )

    try:
        payment_link = await asaas_client.post(
            "/paymentLinks",
            json={
                "name": product.name,
                "description": description,
                "value": float(
                    Decimal(product.price)
                ),
                "billingType": "UNDEFINED",
                "chargeType": "DETACHED",
                "dueDateLimitDays": 1,
                "notificationEnabled": False,
                "isAddressRequired": False,
                "externalReference": (
                    f"{user.id}:{product.id}"
                ),
                "callback": {
                    "successUrl": (
                        f"{settings.frontend_url.rstrip('/')}/login"
                    ),
                    "autoRedirect": True,
                },
            },
        )

    except AsaasError as exc:
        raise HTTPException(
            status_code=(
                exc.status_code
                or status.HTTP_502_BAD_GATEWAY
            ),
            detail={
                "message": (
                    "Não foi possível criar "
                    "o link de pagamento no Asaas."
                ),
                "asaas": exc.response_data,
            },
        ) from exc

    payment_link_id = payment_link.get("id")
    payment_link_url = payment_link.get("url")

    if not payment_link_id or not payment_link_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "O Asaas não retornou o link "
                "de pagamento."
            ),
        )

    charge = Charge(
        user_id=user.id,
        product_id=product.id,
        license_id=None,
        charge_number=(
            generate_charge_number(db)
        ),
        description=description,
        amount=Decimal(product.price),
        status="pending",
        payment_method=None,
        due_at=utc_now(),
        paid_at=None,
        cancelled_at=None,
        refunded_at=None,

        # Guardamos o ID do Payment Link aqui.
        # Quando o webhook PAYMENT_* chegar,
        # payment.paymentLink terá este mesmo ID.
        external_reference=str(
            payment_link_id
        ),

        notes=(
            "Compra avulsa criada por "
            "Payment Link Asaas. "
            f"Celular informado: {mobile_phone}"
        ),
        asaas_payment_id=None,
        asaas_subscription_id=None,
        invoice_url=str(
            payment_link_url
        ),
    )

    db.add(charge)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(charge)

    return OneTimeCheckoutResponse(
        charge_id=charge.id,
        charge_number=charge.charge_number,
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        amount=Decimal(product.price),
        status=charge.status,
        invoice_url=str(payment_link_url),
        asaas_customer_id=None,
        asaas_payment_id=None,
    )


async def create_license_renewal_checkout(
    db: Session,
    user: User,
    license_id,
) -> LicenseRenewalResponse:
    license_record = db.scalar(
        select(License).where(
            License.id == license_id,
            License.user_id == user.id,
        )
    )

    if license_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licença não encontrada.",
        )

    if license_record.status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Uma licença revogada não pode "
                "ser renovada."
            ),
        )

    product = db.get(
        Product,
        license_record.product_id,
    )

    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado ou inativo.",
        )

    if Decimal(product.price) <= 0:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "O produto não possui um preço válido."
            ),
        )

    if not user.asaas_customer_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Seu cadastro de pagamento ainda "
                "não está disponível para renovação."
            ),
        )

    # Evita gerar múltiplas cobranças pendentes
    # para a mesma licença.
    existing_charge = db.scalar(
        select(Charge)
        .where(
            Charge.user_id == user.id,
            Charge.license_id == license_record.id,
            Charge.status == "pending",
        )
        .order_by(
            Charge.created_at.desc()
        )
    )

    if (
        existing_charge is not None
        and existing_charge.invoice_url
    ):
        return LicenseRenewalResponse(
            charge_id=existing_charge.id,
            charge_number=(
                existing_charge.charge_number
            ),
            license_id=license_record.id,
            license_number=(
                license_record.license_number
            ),
            product_id=product.id,
            product_name=product.name,
            amount=existing_charge.amount,
            status=existing_charge.status,
            invoice_url=existing_charge.invoice_url,
            asaas_customer_id=(
                user.asaas_customer_id
            ),
            asaas_payment_id=(
                existing_charge.asaas_payment_id
                or ""
            ),
        )

    customer_id = user.asaas_customer_id

    try:
        payment = await asaas_client.post(
            "/payments",
            json={
                "customer": customer_id,
                "billingType": "UNDEFINED",
                "value": float(
                    Decimal(product.price)
                ),
                "dueDate": (
                    utc_now()
                    .date()
                    .isoformat()
                ),
                "description": (
                    f"Renovação {product.name} "
                    f"por "
                    f"{product.license_duration_days or 30} "
                    f"dias"
                ),
                "externalReference": (
                    f"renew:{license_record.id}"
                ),
                "callback": {
                    "successUrl": (
                        f"{settings.frontend_url.rstrip('/')}/login"
                    ),
                    "autoRedirect": True,
                },
            },
        )

    except AsaasError as exc:
        raise HTTPException(
            status_code=(
                exc.status_code
                or status.HTTP_502_BAD_GATEWAY
            ),
            detail={
                "message": (
                    "Não foi possível criar "
                    "a cobrança de renovação."
                ),
                "asaas": exc.response_data,
            },
        ) from exc

    payment_id = payment.get("id")
    invoice_url = payment.get("invoiceUrl")

    if not payment_id or not invoice_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "O Asaas não retornou a cobrança "
                "ou o link de pagamento."
            ),
        )

    charge = Charge(
        user_id=user.id,
        product_id=product.id,

        # Aqui está a diferença fundamental:
        # a cobrança já nasce vinculada à licença.
        license_id=license_record.id,

        charge_number=(
            generate_charge_number(db)
        ),
        description=(
            f"Renovação {product.name} "
            f"por {product.license_duration_days or 30} "
            f"dias"
        ),
        amount=Decimal(product.price),
        status="pending",
        payment_method=payment.get(
            "billingType"
        ),
        due_at=parse_due_date(
            payment.get("dueDate")
        ),
        paid_at=None,
        cancelled_at=None,
        refunded_at=None,
        external_reference=str(
            payment_id
        ),
        notes=(
            "Cobrança avulsa de renovação "
            "criada pela integração Asaas."
        ),
        asaas_payment_id=str(
            payment_id
        ),
        asaas_subscription_id=None,
        invoice_url=str(
            invoice_url
        ),
    )

    db.add(charge)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(charge)

    return LicenseRenewalResponse(
        charge_id=charge.id,
        charge_number=charge.charge_number,
        license_id=license_record.id,
        license_number=license_record.license_number,
        product_id=product.id,
        product_name=product.name,
        amount=Decimal(product.price),
        status=charge.status,
        invoice_url=str(invoice_url),
        asaas_customer_id=str(customer_id),
        asaas_payment_id=str(payment_id),
    )


async def create_admin_monthly_checkout(
    db: Session,
    payload,
):
    from app.billing.schemas import (
        AdminMonthlyCheckoutResponse,
        MonthlyCheckoutRequest,
    )

    user = db.get(
        User,
        payload.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail="O usuário selecionado está inativo.",
        )

    product = db.get(
        Product,
        payload.product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado.",
        )

    if not product.is_active:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail="O produto selecionado está inativo.",
        )

    if product.billing_type != "monthly":
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "O produto selecionado não está "
                "configurado como mensal."
            ),
        )

    checkout = await create_monthly_checkout(
        db,
        user,
        MonthlyCheckoutRequest(
            product_slug=product.slug,
            cpf_cnpj=payload.cpf_cnpj,
            mobile_phone=payload.mobile_phone,
        ),
    )

    return AdminMonthlyCheckoutResponse(
        **checkout.model_dump(),
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
    )
