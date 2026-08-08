from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

# Registra models relacionados no SQLAlchemy.
from app.devices.models import Device  # noqa: F401
from app.licenses.models import License
from app.products.models import Product
from app.users.models import User  # noqa: F401

from app.asaas.webhook_models import AsaasWebhookEvent
from app.billing.models import BillingSubscription
from app.finance.models import Charge
from app.finance.services import generate_charge_number
from app.licenses.schemas import LicenseCreateRequest
from app.licenses.services.issuer import LicenseIssuer


PAID_EVENTS = {
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
}

REFUND_EVENTS = {
    "PAYMENT_REFUNDED",
    "PAYMENT_CHARGEBACK_REQUESTED",
    "PAYMENT_CHARGEBACK_DISPUTE",
}

CANCEL_EVENTS = {
    "PAYMENT_DELETED",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_due_at(
    payment: dict[str, Any],
) -> datetime:
    due_date = payment.get("dueDate")

    if isinstance(due_date, str):
        try:
            parsed = datetime.strptime(
                due_date,
                "%Y-%m-%d",
            )

            return parsed.replace(
                hour=23,
                minute=59,
                second=59,
                tzinfo=timezone.utc,
            )
        except ValueError:
            pass

    return utc_now()


def get_subscription(
    db: Session,
    asaas_subscription_id: str | None,
) -> BillingSubscription | None:
    if not asaas_subscription_id:
        return None

    return db.scalar(
        select(BillingSubscription).where(
            BillingSubscription.asaas_subscription_id
            == asaas_subscription_id
        )
    )


def get_or_create_charge(
    db: Session,
    payment: dict[str, Any],
) -> Charge | None:
    payment_id = payment.get("id")

    if not payment_id:
        return None

    existing = db.scalar(
        select(Charge).where(
            Charge.asaas_payment_id
            == payment_id
        )
    )

    if existing is not None:
        return existing

    asaas_subscription_id = payment.get(
        "subscription"
    )

    subscription = get_subscription(
        db,
        asaas_subscription_id,
    )

    if subscription is None:
        return None

    product = db.get(
        Product,
        subscription.product_id,
    )

    if product is None:
        return None

    amount = Decimal(
        str(
            payment.get("value")
            or product.price
        )
    )

    charge = Charge(
        user_id=subscription.user_id,
        product_id=subscription.product_id,
        license_id=None,
        charge_number=generate_charge_number(db),
        description=(
            f"Assinatura mensal {product.name}"
        ),
        amount=amount,
        status="pending",
        payment_method=payment.get(
            "billingType"
        ),
        due_at=parse_due_at(payment),
        paid_at=None,
        cancelled_at=None,
        refunded_at=None,
        external_reference=str(payment_id),
        notes=(
            "Cobrança recorrente recebida "
            "pelo webhook Asaas."
        ),
        asaas_payment_id=str(payment_id),
        asaas_subscription_id=(
            str(asaas_subscription_id)
            if asaas_subscription_id
            else None
        ),
        invoice_url=payment.get(
            "invoiceUrl"
        ),
    )

    db.add(charge)
    db.flush()

    return charge


def find_existing_license(
    db: Session,
    charge: Charge,
) -> License | None:
    if charge.license_id:
        return db.get(
            License,
            charge.license_id,
        )

    previous_charge = db.scalar(
        select(Charge)
        .where(
            Charge.user_id == charge.user_id,
            Charge.product_id == charge.product_id,
            Charge.license_id.is_not(None),
        )
        .order_by(
            Charge.paid_at.desc().nullslast(),
            Charge.created_at.desc(),
        )
    )

    if (
        previous_charge is None
        or previous_charge.license_id is None
    ):
        return None

    return db.get(
        License,
        previous_charge.license_id,
    )


def issue_or_renew_license(
    db: Session,
    charge: Charge,
) -> License:
    product = db.get(
        Product,
        charge.product_id,
    )

    if product is None:
        raise RuntimeError(
            "Produto da cobrança não encontrado."
        )

    duration_days = (
        product.license_duration_days
        or 30
    )

    max_devices = (
        product.max_devices
        or 1
    )

    existing_license = find_existing_license(
        db,
        charge,
    )

    if existing_license is None:
        issuer = LicenseIssuer(db)

        result = issuer.issue(
            LicenseCreateRequest(
                user_id=charge.user_id,
                product_id=charge.product_id,
                duration_days=duration_days,
                max_devices=max_devices,
            )
        )

        license_record = db.get(
            License,
            result.id,
        )

        if license_record is None:
            raise RuntimeError(
                "Licença emitida não foi localizada."
            )

        charge.license_id = license_record.id

        db.add(charge)
        db.commit()
        db.refresh(charge)

        return license_record

    if existing_license.first_activated_at is None:
        existing_license.duration_days += (
            duration_days
        )
    else:
        base_date = max(
            existing_license.expires_at
            or utc_now(),
            utc_now(),
        )

        existing_license.expires_at = (
            base_date
            + timedelta(
                days=duration_days
            )
        )

    if existing_license.status != "revoked":
        existing_license.status = (
            "active"
            if existing_license.first_activated_at
            else "pending_activation"
        )
        existing_license.is_active = True

    charge.license_id = existing_license.id

    db.add(existing_license)
    db.add(charge)
    db.commit()

    return existing_license


def process_payment_event(
    db: Session,
    event_type: str,
    payment: dict[str, Any],
) -> dict[str, Any]:
    charge = get_or_create_charge(
        db,
        payment,
    )

    if charge is None:
        return {
            "ignored": True,
            "reason": (
                "Cobrança não pertence a uma "
                "assinatura local conhecida."
            ),
        }

    if event_type in PAID_EVENTS:
        already_paid = (
            charge.status == "paid"
            and charge.license_id is not None
        )

        charge.status = "paid"
        charge.paid_at = utc_now()

        db.add(charge)
        db.commit()
        db.refresh(charge)

        if not already_paid:
            license_record = (
                issue_or_renew_license(
                    db,
                    charge,
                )
            )

            return {
                "paid": True,
                "license_id": str(
                    license_record.id
                ),
            }

        return {
            "paid": True,
            "already_processed": True,
            "license_id": str(
                charge.license_id
            ),
        }

    if event_type == "PAYMENT_OVERDUE":
        charge.status = "overdue"
        db.add(charge)
        db.commit()

        return {
            "overdue": True,
        }

    if event_type in REFUND_EVENTS:
        charge.status = "refunded"
        charge.refunded_at = utc_now()

        if charge.license_id:
            license_record = db.get(
                License,
                charge.license_id,
            )

            if (
                license_record is not None
                and license_record.status
                != "revoked"
            ):
                license_record.status = "suspended"
                license_record.is_active = False
                db.add(license_record)

        db.add(charge)
        db.commit()

        return {
            "refunded": True,
        }

    if event_type in CANCEL_EVENTS:
        charge.status = "cancelled"
        charge.cancelled_at = utc_now()
        db.add(charge)
        db.commit()

        return {
            "cancelled": True,
        }

    return {
        "ignored": True,
        "reason": (
            f"Evento {event_type} não exige ação."
        ),
    }


def process_webhook(
    db: Session,
    payload: dict[str, Any],
) -> dict[str, Any]:
    event_id = str(
        payload.get("id") or ""
    ).strip()

    event_type = str(
        payload.get("event") or ""
    ).strip()

    if not event_id or not event_type:
        raise ValueError(
            "Payload de webhook inválido."
        )

    payment = payload.get("payment")
    payment_id = (
        str(payment.get("id"))
        if isinstance(payment, dict)
        and payment.get("id")
        else None
    )

    event_record = db.scalar(
        select(AsaasWebhookEvent).where(
            AsaasWebhookEvent.event_id == event_id
        )
    )

    if (
        event_record is not None
        and event_record.status == "processed"
    ):
        return {
            "success": True,
            "duplicate": True,
            "event_id": event_id,
        }

    if event_record is None:
        event_record = AsaasWebhookEvent(
            event_id=event_id,
            event_type=event_type,
            payment_id=payment_id,
            status="processing",
            error_message=None,
        )
        db.add(event_record)
        db.commit()
        db.refresh(event_record)

    # Eventos de assinatura e outros recursos não possuem
    # payment. Registramos e respondemos HTTP 200.
    if not isinstance(payment, dict):
        event_record.status = "processed"
        event_record.error_message = None
        db.add(event_record)
        db.commit()

        return {
            "success": True,
            "event_id": event_id,
            "event": event_type,
            "ignored": True,
            "reason": "Evento sem objeto payment.",
        }

    try:
        result = process_payment_event(
            db,
            event_type,
            payment,
        )

        event_record.status = "processed"
        event_record.error_message = None

        db.add(event_record)
        db.commit()

        return {
            "success": True,
            "event_id": event_id,
            "event": event_type,
            **result,
        }

    except Exception as exc:
        db.rollback()

        event_record = db.scalar(
            select(AsaasWebhookEvent).where(
                AsaasWebhookEvent.event_id
                == event_id
            )
        )

        if event_record is not None:
            event_record.status = "failed"
            event_record.error_message = str(
                exc
            )[:2000]

            db.add(event_record)
            db.commit()

        raise
