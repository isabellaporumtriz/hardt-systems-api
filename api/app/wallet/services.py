from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.wallet.models import (
    Wallet,
    WalletTransaction,
)


class WalletError(RuntimeError):
    pass


class WalletNotFoundError(WalletError):
    pass


class InsufficientBalanceError(WalletError):
    pass


def get_wallet(
    db: Session,
    user_id: UUID,
) -> Wallet | None:
    return db.scalar(
        select(Wallet).where(
            Wallet.user_id == user_id,
        )
    )


def create_wallet(
    db: Session,
    user_id: UUID,
) -> Wallet:
    existing_wallet = get_wallet(
        db,
        user_id,
    )

    if existing_wallet is not None:
        return existing_wallet

    wallet = Wallet(
        user_id=user_id,
        balance=Decimal("0.0000"),
    )

    db.add(wallet)
    db.flush()

    return wallet


def get_wallet_for_update(
    db: Session,
    user_id: UUID,
) -> Wallet:
    wallet = db.scalar(
        select(Wallet)
        .where(
            Wallet.user_id == user_id,
        )
        .with_for_update()
    )

    if wallet is None:
        raise WalletNotFoundError(
            f"Carteira não encontrada para user_id={user_id}"
        )

    return wallet


def credit(
    db: Session,
    *,
    user_id: UUID,
    amount: Decimal,
    reference: str,
    description: str | None = None,
    product_code: str | None = None,
) -> Wallet:
    amount = Decimal(amount)

    if amount <= 0:
        raise WalletError(
            "Valor de crédito deve ser maior que zero."
        )

    wallet = get_wallet_for_update(
        db,
        user_id,
    )

    existing_transaction = db.scalar(
        select(WalletTransaction).where(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.type == "credit",
            WalletTransaction.reference == reference,
        )
    )

    if existing_transaction is not None:
        return wallet

    wallet.balance += amount

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        type="credit",
        amount=amount,
        reference=reference,
        description=description,
        product_code=product_code,
    )

    db.add(transaction)
    db.flush()

    return wallet


def debit(
    db: Session,
    *,
    user_id: UUID,
    amount: Decimal,
    reference: str,
    description: str | None = None,
    product_code: str | None = None,
) -> Wallet:
    amount = Decimal(amount)

    if amount <= 0:
        raise WalletError(
            "Valor de débito deve ser maior que zero."
        )

    wallet = get_wallet_for_update(
        db,
        user_id,
    )

    if wallet.balance < amount:
        raise InsufficientBalanceError(
            (
                "Saldo insuficiente. "
                f"Saldo={wallet.balance} | "
                f"Necessário={amount}"
            )
        )

    wallet.balance -= amount

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        type="debit",
        amount=-amount,
        reference=reference,
        description=description,
        product_code=product_code,
    )

    db.add(transaction)
    db.flush()

    return wallet


def get_topup_by_id(
    db: Session,
    topup_id: UUID,
) -> "WalletTopup | None":
    from app.wallet.models import WalletTopup

    return db.get(
        WalletTopup,
        topup_id,
    )


def get_topup_by_payment_id(
    db: Session,
    payment_id: str,
) -> "WalletTopup | None":
    from app.wallet.models import WalletTopup

    return db.scalar(
        select(WalletTopup).where(
            WalletTopup.provider_payment_id
            == payment_id,
        )
    )
