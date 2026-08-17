from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
)
from app.core.database import get_db
from app.sms.models import SMSActivation
from app.sms.provider import (
    BRAZIL_ID,
    SMS24hProvider,
    SMS24hProviderError,
)
from app.sms.schemas import (
    SMSActivationPurchaseRequest,
    SMSActivationResponse,
    SMSCatalogResponse,
    SMSProviderHealthResponse,
    SMSQuoteResponse,
)
from app.sms.services import (
    SMSActivationConflictError,
    SMSActivationNotFoundError,
    SMSCancelTooEarlyError,
    SMSProductUnavailableError,
    SMSProviderPurchaseError,
    SMSServiceError,
    cancel_activation,
    finish_activation,
    get_catalog,
    get_quote,
    list_activations,
    purchase_activation,
    sync_activation,
)
from app.users.models import User
from app.wallet.services import (
    InsufficientBalanceError,
    WalletNotFoundError,
)


router = APIRouter(
    prefix="/sms",
    tags=["HardtSMS"],
)


def serialize_activation(
    activation: SMSActivation,
) -> SMSActivationResponse:
    return SMSActivationResponse(
        id=activation.id,
        purchase_id=activation.purchase_id,
        phone_number=activation.phone_number,
        country_code=activation.country_code,
        service_code=activation.service_code,
        operator=activation.operator,
        customer_price=activation.customer_price,
        status=activation.status,
        sms_code=activation.sms_code,
        expires_at=activation.expires_at,
        created_at=activation.created_at,
        finished_at=activation.finished_at,
    )


@router.get(
    "/catalog",
    response_model=SMSCatalogResponse,
)
def read_catalog(
    country: int = Query(
        BRAZIL_ID,
        ge=1,
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> SMSCatalogResponse:
    del current_user

    try:
        services = get_catalog(
            country
        )

        return SMSCatalogResponse(
            country=country,
            total=len(services),
            services=services,
        )

    except SMS24hProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.get(
    "/quote",
    response_model=SMSQuoteResponse,
)
def read_quote(
    service_code: str,
    country: int = Query(
        BRAZIL_ID,
        ge=1,
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> SMSQuoteResponse:
    del current_user

    try:
        quote = get_quote(
            country=country,
            service_code=service_code,
        )

        return SMSQuoteResponse(
            country=quote["country"],
            service_code=(
                quote["service_code"]
            ),
            service_name=(
                quote["service_name"]
            ),
            available=quote["available"],
            price_brl=quote["price_brl"],
        )

    except SMSServiceError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except SMS24hProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.get(
    "/provider-health",
    response_model=(
        SMSProviderHealthResponse
    ),
)
def provider_health(
    current_user: User = Depends(
        get_current_user
    ),
) -> SMSProviderHealthResponse:
    del current_user

    try:
        SMS24hProvider().get_balance()

        return SMSProviderHealthResponse(
            status="connected",
            currency="BRL",
        )

    except SMS24hProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.post(
    "/activations",
    response_model=SMSActivationResponse,
)
def create_activation(
    payload: SMSActivationPurchaseRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMSActivationResponse:
    try:
        activation = purchase_activation(
            db,
            user_id=current_user.id,
            country=payload.country,
            service_code=(
                payload.service_code
            ),
            idempotency_key=(
                payload.idempotency_key
            ),
        )

        db.commit()
        db.refresh(activation)

        return serialize_activation(
            activation
        )

    except InsufficientBalanceError as exc:
        db.rollback()

        raise HTTPException(
            status_code=402,
            detail="Saldo insuficiente.",
        ) from exc

    except WalletNotFoundError as exc:
        db.rollback()

        raise HTTPException(
            status_code=404,
            detail="Carteira não encontrada.",
        ) from exc

    except SMSProductUnavailableError as exc:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except SMSProviderPurchaseError as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except SMSActivationConflictError as exc:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except Exception:
        db.rollback()
        raise


@router.get(
    "/activations",
    response_model=list[
        SMSActivationResponse
    ],
)
def read_activations(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> list[SMSActivationResponse]:
    return [
        serialize_activation(item)
        for item in list_activations(
            db,
            user_id=current_user.id,
        )
    ]


@router.get(
    "/activations/{activation_id}",
    response_model=SMSActivationResponse,
)
def read_activation(
    activation_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMSActivationResponse:
    items = list_activations(
        db,
        user_id=current_user.id,
    )

    activation = next(
        (
            item
            for item in items
            if item.id == activation_id
        ),
        None,
    )

    if activation is None:
        raise HTTPException(
            status_code=404,
            detail="Ativação não encontrada.",
        )

    return serialize_activation(
        activation
    )


@router.get(
    "/activations/{activation_id}/status",
    response_model=SMSActivationResponse,
)
def read_activation_status(
    activation_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMSActivationResponse:
    try:
        activation = sync_activation(
            db,
            user_id=current_user.id,
            activation_id=activation_id,
        )

        db.commit()
        db.refresh(activation)

        return serialize_activation(
            activation
        )

    except SMSActivationNotFoundError as exc:
        db.rollback()

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except SMS24hProviderError as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.post(
    "/activations/{activation_id}/cancel",
    response_model=SMSActivationResponse,
)
def cancel_sms_activation(
    activation_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMSActivationResponse:
    try:
        activation = cancel_activation(
            db,
            user_id=current_user.id,
            activation_id=activation_id,
        )

        db.commit()
        db.refresh(activation)

        return serialize_activation(
            activation
        )

    except SMSActivationNotFoundError as exc:
        db.rollback()

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except SMSCancelTooEarlyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except SMSActivationConflictError as exc:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except SMS24hProviderError as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.post(
    "/activations/{activation_id}/finish",
    response_model=SMSActivationResponse,
)
def finish_sms_activation(
    activation_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> SMSActivationResponse:
    try:
        activation = finish_activation(
            db,
            user_id=current_user.id,
            activation_id=activation_id,
        )

        db.commit()
        db.refresh(activation)

        return serialize_activation(
            activation
        )

    except SMSActivationNotFoundError as exc:
        db.rollback()

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except SMSActivationConflictError as exc:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except SMS24hProviderError as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
