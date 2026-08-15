from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from app.auth.dependencies import (
    get_current_user,
)
from app.smm.provider import (
    JAPProvider,
    JAPProviderError,
)
from app.smm.schemas import (
    SMMCatalogResponse,
    SMMPricePreviewResponse,
)
from app.smm.services import (
    get_catalog,
    preview_price,
)
from app.users.models import User
from app.products.models import Product


router = APIRouter(
    prefix="/smm",
    tags=["SMM"],
)


@router.get(
    "/catalog",
    response_model=SMMCatalogResponse,
)
def read_catalog(
    current_user: User = Depends(
        get_current_user
    ),
) -> SMMCatalogResponse:
    del current_user

    try:
        return get_catalog()
    except JAPProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.get(
    "/price-preview",
    response_model=SMMPricePreviewResponse,
)
def read_price_preview(
    service_id: int = Query(
        ge=1,
    ),
    quantity: int = Query(
        ge=1,
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> SMMPricePreviewResponse:
    del current_user

    try:
        return preview_price(
            provider_service_id=service_id,
            quantity=quantity,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except JAPProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.get(
    "/provider-health",
)
def provider_health(
    current_user: User = Depends(
        get_current_user
    ),
):
    del current_user

    try:
        balance = JAPProvider().get_balance()
    except JAPProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # Não devolvemos saldo ao cliente.
    return {
        "status": "connected",
        "currency": balance.get(
            "currency"
        ),
    }


from sqlalchemy.orm import Session

from app.core.database import get_db
from app.smm.schemas import (
    SMMPurchaseRequest,
    SMMPurchaseResponse,
    SMMQuoteRequest,
    SMMQuoteResponse,
)
from app.smm.services import (
    SMMError,
    create_local_smm_purchase,
    create_quote,
    submit_smm_order,
)
from app.wallet.services import (
    InsufficientBalanceError,
    WalletNotFoundError,
)


@router.post(
    "/quote",
    response_model=SMMQuoteResponse,
)
def quote_smm(
    payload: SMMQuoteRequest,
    current_user: User = Depends(
        get_current_user
    ),
) -> SMMQuoteResponse:
    del current_user

    try:
        return create_quote(
            service_id=payload.service_id,
            quantity=payload.quantity,
        )

    except SMMError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except JAPProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.post(
    "/purchases",
    response_model=SMMPurchaseResponse,
)
def purchase_smm(
    payload: SMMPurchaseRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMMPurchaseResponse:

    try:
        purchase, order = (
            create_local_smm_purchase(
                db,
                user_id=current_user.id,
                service_id=payload.service_id,
                quantity=payload.quantity,
                target_url=payload.target_url,
                idempotency_key=(
                    payload.idempotency_key
                ),
            )
        )

        if (
            order.provider_status
            == "not_submitted"
            and order.provider_order_id
            is None
        ):
            order = submit_smm_order(
                db,
                order_id=order.id,
                user_id=current_user.id,
            )

        product = db.get(
            Product,
            purchase.product_id,
        )

        return SMMPurchaseResponse(
            purchase_id=str(
                purchase.id
            ),
            smm_order_id=str(
                order.id
            ),
            product_name=(
                product.name
                if product
                else "Hardt SMM"
            ),
            service_name=(
                order.service_name
            ),
            category=(
                order.category or ""
            ),
            quantity=(
                order.quantity
            ),
            target_url=(
                order.target_url
            ),
            amount_brl=(
                order.amount_brl
            ),
            status=(
                purchase.status
            ),
            provider_status=(
                order.provider_status
            ),
        )

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

    except SMMError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except JAPProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


from uuid import UUID

from app.smm.models import SMMOrder
from app.smm.schemas import (
    SMMProviderActionResponse,
)
from app.smm.services import (
    SMMSubmissionUnknownError,
    submit_smm_order,
    sync_smm_order,
)


def _provider_action_response(
    order: SMMOrder,
) -> SMMProviderActionResponse:
    return SMMProviderActionResponse(
        smm_order_id=str(order.id),
        purchase_id=str(
            order.purchase_id
        ),
        provider_order_id=(
            order.provider_order_id
        ),
        provider_status=(
            order.provider_status
        ),
        start_count=order.start_count,
        remains=order.remains,
        provider_error=(
            order.provider_error
        ),
    )


@router.post(
    "/orders/{order_id}/submit",
    response_model=(
        SMMProviderActionResponse
    ),
)
def submit_order_to_provider(
    order_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMMProviderActionResponse:

    try:
        order = submit_smm_order(
            db,
            order_id=order_id,
            user_id=current_user.id,
        )

        return _provider_action_response(
            order
        )

    except SMMSubmissionUnknownError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except SMMError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.post(
    "/orders/{order_id}/sync",
    response_model=(
        SMMProviderActionResponse
    ),
)
def sync_order_from_provider(
    order_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMMProviderActionResponse:

    try:
        order = sync_smm_order(
            db,
            order_id=order_id,
            user_id=current_user.id,
        )

        return _provider_action_response(
            order
        )

    except SMMError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except JAPProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
