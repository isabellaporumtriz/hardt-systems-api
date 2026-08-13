from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.users.models import User
from app.wallet.models import WalletTransaction
from app.wallet.schemas import WalletTopupCreateRequest, WalletTopupResponse
from app.wallet.topup_service import (
    create_pix_topup,
    reconcile_wallet_topup,
)
from app.wallet.schemas import (
    WalletResponse,
    WalletTransactionResponse,
)
from app.wallet.services import (
    WalletNotFoundError,
    get_wallet,
)


router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"],
)


@router.get(
    "",
    response_model=WalletResponse,
)
def read_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletResponse:
    wallet = get_wallet(
        db,
        current_user.id,
    )

    if wallet is None:
        raise HTTPException(
            status_code=404,
            detail="Carteira não encontrada.",
        )

    return WalletResponse(
        id=wallet.id,
        balance=wallet.balance,
    )


@router.get(
    "/transactions",
    response_model=list[WalletTransactionResponse],
)
def list_wallet_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WalletTransactionResponse]:
    wallet = get_wallet(
        db,
        current_user.id,
    )

    if wallet is None:
        raise HTTPException(
            status_code=404,
            detail="Carteira não encontrada.",
        )

    transactions = db.scalars(
        select(WalletTransaction)
        .where(
            WalletTransaction.wallet_id
            == wallet.id,
        )
        .order_by(
            WalletTransaction.created_at.desc(),
        )
    ).all()

    return [
        WalletTransactionResponse(
            id=tx.id,
            type=tx.type,
            amount=tx.amount,
            reference=tx.reference,
            description=tx.description,
            product_code=tx.product_code,
            created_at=tx.created_at,
        )
        for tx in transactions
    ]


@router.post(
    "/topups",
    response_model=WalletTopupResponse,
)
async def create_wallet_topup(
    payload: WalletTopupCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletTopupResponse:
    wallet = get_wallet(
        db,
        current_user.id,
    )

    if wallet is None:
        raise HTTPException(
            status_code=404,
            detail="Carteira não encontrada.",
        )

    topup = await create_pix_topup(
        db,
        user=current_user,
        wallet=wallet,
        amount=payload.amount,
        cpf_cnpj=payload.cpf_cnpj,
        mobile_phone=payload.mobile_phone,
    )

    return WalletTopupResponse(
        id=topup.id,
        amount_brl=topup.amount_brl,
        status=topup.status,
        provider=topup.provider,
        provider_payment_id=(
            topup.provider_payment_id
        ),
        external_reference=(
            topup.external_reference
        ),
        pix_copy_paste=topup.pix_copy_paste,
        pix_qr_code=topup.pix_qr_code,
        paid_at=topup.paid_at,
        created_at=topup.created_at,
    )


@router.post(
    "/topups/{topup_id}/reconcile",
    response_model=WalletTopupResponse,
)
async def reconcile_topup(
    topup_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletTopupResponse:
    from uuid import UUID

    from app.wallet.models import WalletTopup

    try:
        parsed_topup_id = UUID(topup_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail="Recarga não encontrada.",
        ) from exc

    topup = db.scalar(
        select(WalletTopup).where(
            WalletTopup.id == parsed_topup_id,
            WalletTopup.user_id == current_user.id,
        )
    )

    if topup is None:
        raise HTTPException(
            status_code=404,
            detail="Recarga não encontrada.",
        )

    topup = await reconcile_wallet_topup(
        db,
        topup=topup,
        user=current_user,
    )

    return WalletTopupResponse(
        id=topup.id,
        amount_brl=topup.amount_brl,
        status=topup.status,
        provider=topup.provider,
        provider_payment_id=(
            topup.provider_payment_id
        ),
        external_reference=(
            topup.external_reference
        ),
        pix_copy_paste=topup.pix_copy_paste,
        pix_qr_code=topup.pix_qr_code,
        paid_at=topup.paid_at,
        created_at=topup.created_at,
    )
