from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.asaas.client import (
    AsaasError,
    asaas_client,
)
from app.users.models import User
from app.wallet.models import (
    Wallet,
    WalletTopup,
)


MIN_TOPUP = Decimal("5.00")
MAX_TOPUP = Decimal("10000.00")


async def create_pix_topup(
    db: Session,
    *,
    user: User,
    wallet: Wallet,
    amount: Decimal,
) -> WalletTopup:
    amount = Decimal(amount).quantize(
        Decimal("0.01")
    )

    if amount < MIN_TOPUP:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"O valor mínimo para adicionar saldo "
                f"é R$ {MIN_TOPUP:.2f}."
            ),
        )

    if amount > MAX_TOPUP:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"O valor máximo por recarga "
                f"é R$ {MAX_TOPUP:.2f}."
            ),
        )

    if not user.asaas_customer_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Seu cadastro de pagamento ainda não "
                "está configurado."
            ),
        )

    external_reference = (
        f"wallet-topup:{uuid4()}"
    )

    topup = WalletTopup(
        user_id=user.id,
        wallet_id=wallet.id,
        amount_brl=amount,
        status="pending",
        provider="asaas",
        provider_payment_id=None,
        external_reference=external_reference,
        pix_copy_paste=None,
        pix_qr_code=None,
        paid_at=None,
    )

    db.add(topup)
    db.flush()

    try:
        payment = await asaas_client.post(
            "/payments",
            json={
                "customer": user.asaas_customer_id,
                "billingType": "PIX",
                "value": float(amount),
                "dueDate": date.today().isoformat(),
                "description": (
                    f"Adicionar saldo Hardt - "
                    f"R$ {amount:.2f}"
                ),
                "externalReference": external_reference,
            },
        )

        payment_id = payment.get("id")

        if not payment_id:
            raise RuntimeError(
                "Asaas não retornou o ID da cobrança."
            )

        pix = await asaas_client.get(
            f"/payments/{payment_id}/pixQrCode"
        )

        pix_payload = pix.get("payload")
        pix_image = pix.get("encodedImage")

        if not pix_payload:
            raise RuntimeError(
                "Asaas não retornou o Pix Copia e Cola."
            )

        topup.provider_payment_id = str(
            payment_id
        )

        topup.pix_copy_paste = str(
            pix_payload
        )

        topup.pix_qr_code = (
            str(pix_image)
            if pix_image
            else None
        )

        db.add(topup)
        db.commit()
        db.refresh(topup)

        return topup

    except AsaasError as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                exc.status_code
                or status.HTTP_502_BAD_GATEWAY
            ),
            detail={
                "message": (
                    "Não foi possível gerar o Pix "
                    "para adicionar saldo."
                ),
                "asaas": exc.response_data,
            },
        ) from exc

    except Exception:
        db.rollback()
        raise


def process_wallet_topup_payment(
    db: Session,
    *,
    event_type: str,
    payment: dict,
) -> dict | None:
    """
    Processa exclusivamente pagamentos criados para recarga da Wallet.

    Retorna None quando o pagamento não pertence ao fluxo Wallet,
    permitindo que o webhook continue no fluxo normal de billing.
    """
    from datetime import datetime, timezone

    from sqlalchemy import select

    from app.wallet.models import WalletTopup
    from app.wallet.services import credit

    external_reference = str(
        payment.get("externalReference") or ""
    ).strip()

    if not external_reference.startswith(
        "wallet-topup:"
    ):
        return None

    topup = db.scalar(
        select(WalletTopup).where(
            WalletTopup.external_reference
            == external_reference
        )
    )

    if topup is None:
        raise RuntimeError(
            "WalletTopup não encontrado para "
            f"externalReference={external_reference}"
        )

    payment_id = str(
        payment.get("id") or ""
    ).strip()

    if not payment_id:
        raise RuntimeError(
            "Pagamento Asaas sem payment.id."
        )

    if (
        topup.provider_payment_id
        and topup.provider_payment_id
        != payment_id
    ):
        raise RuntimeError(
            "payment.id do Asaas não corresponde "
            "ao WalletTopup registrado."
        )

    if event_type not in {
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
    }:
        return {
            "wallet_topup": True,
            "ignored": True,
            "reason": (
                f"Evento {event_type} não credita Wallet."
            ),
        }

    if topup.status == "paid":
        return {
            "wallet_topup": True,
            "paid": True,
            "already_processed": True,
            "topup_id": str(topup.id),
        }

    credit(
        db,
        user_id=topup.user_id,
        amount=topup.amount_brl,
        reference=(
            f"wallet-topup:{topup.id}"
        ),
        description=(
            "Recarga de saldo via Pix"
        ),
        product_code=None,
    )

    topup.provider_payment_id = payment_id
    topup.status = "paid"
    topup.paid_at = datetime.now(timezone.utc)

    db.add(topup)
    db.commit()
    db.refresh(topup)

    return {
        "wallet_topup": True,
        "paid": True,
        "topup_id": str(topup.id),
    }
