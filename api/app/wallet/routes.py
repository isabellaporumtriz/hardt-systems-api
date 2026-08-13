from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.users.models import User
from app.wallet.models import WalletTransaction
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
