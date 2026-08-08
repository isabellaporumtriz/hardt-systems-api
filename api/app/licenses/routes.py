from app.licenses.models import License

from datetime import datetime, timezone
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_admin,
)
from app.core.database import get_db
from app.licenses.repositories import (
    LicenseRepository,
)
from app.licenses.schemas import (
    LicenseActivationRequest,
    LicenseActivationResponse,
    LicenseCreateRequest,
    LicenseCreateResponse,
    LicenseResponse,
    LicenseStatusRequest,
    LicenseValidationRequest,
    LicenseValidationResponse,
)
from app.licenses.services.activation import (
    DeviceLimitError,
    LicenseActivationError,
    LicenseActivator,
    LicenseForbiddenError,
    LicenseNotFoundError,
)
from app.licenses.services.issuer import (
    LicenseIssuanceError,
    LicenseIssuer,
)
from app.licenses.services.validator import (
    DeviceInactiveError,
    InvalidActivationTokenError,
    LicenseUnavailableError,
    LicenseValidationError,
    LicenseValidator,
)


router = APIRouter(
    prefix="/licenses",
    tags=["Licenses"],
)


@router.get(
    "",
    response_model=list[LicenseResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar licenças",
)
def list_licenses(
    db: Session = Depends(get_db),
    _current_admin: object = Depends(
        get_current_admin
    ),
) -> list[License]:
    repository = LicenseRepository(db)

    return repository.list_all()


@router.get(
    "/{license_id}",
    response_model=LicenseResponse,
    status_code=status.HTTP_200_OK,
    summary="Buscar licença",
)
def get_license(
    license_id: UUID,
    db: Session = Depends(get_db),
    _current_admin: object = Depends(
        get_current_admin
    ),
) -> License:
    repository = LicenseRepository(db)

    license_record = repository.get_by_id(
        license_id
    )

    if license_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licença não encontrada.",
        )

    return license_record


@router.post(
    "",
    response_model=LicenseCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir uma nova licença",
    description=(
        "Emite uma licença para um usuário e "
        "produto. A validade começa apenas na "
        "primeira ativação. A chave completa é "
        "retornada somente nesta resposta."
    ),
)
def create_license(
    data: LicenseCreateRequest,
    db: Session = Depends(get_db),
    _current_admin: object = Depends(
        get_current_admin
    ),
) -> LicenseCreateResponse:
    issuer = LicenseIssuer(db)

    try:
        return issuer.issue(data)

    except LicenseIssuanceError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Não foi possível emitir "
                "a licença."
            ),
        ) from exc


@router.patch(
    "/{license_id}/status",
    response_model=LicenseResponse,
    status_code=status.HTTP_200_OK,
    summary="Alterar status da licença",
    description=(
        "Permite suspender, reativar ou "
        "revogar uma licença."
    ),
)
def update_license_status(
    license_id: UUID,
    data: LicenseStatusRequest,
    db: Session = Depends(get_db),
    _current_admin: object = Depends(
        get_current_admin
    ),
) -> License:
    repository = LicenseRepository(db)

    license_record = repository.get_by_id(
        license_id
    )

    if license_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licença não encontrada.",
        )

    if data.action == "suspend":
        if license_record.status == "revoked":
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Uma licença revogada não "
                    "pode ser suspensa."
                ),
            )

        license_record.status = "suspended"
        license_record.is_active = False

    elif data.action == "reactivate":
        if license_record.status == "revoked":
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Uma licença revogada não "
                    "pode ser reativada."
                ),
            )

        if (
            license_record.expires_at
            and license_record.expires_at
            <= datetime.now(timezone.utc)
        ):
            license_record.status = "expired"
            license_record.is_active = False

            db.commit()
            db.refresh(license_record)

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "A licença está expirada e "
                    "não pode ser reativada."
                ),
            )

        if license_record.first_activated_at:
            license_record.status = "active"
        else:
            license_record.status = (
                "pending_activation"
            )

        license_record.is_active = True

    elif data.action == "revoke":
        if license_record.status == "revoked":
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "A licença já está revogada."
                ),
            )

        license_record.status = "revoked"
        license_record.is_active = False

    try:
        repository.save(license_record)

        db.commit()
        db.refresh(license_record)

        return license_record

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Não foi possível alterar o "
                "status da licença."
            ),
        ) from exc


@router.post(
    "/activate",
    response_model=LicenseActivationResponse,
    status_code=status.HTTP_200_OK,
    summary="Ativar uma licença",
    description=(
        "Ativa uma licença em um dispositivo. "
        "Na primeira ativação, inicia a "
        "contagem da validade."
    ),
)
def activate_license(
    data: LicenseActivationRequest,
    db: Session = Depends(get_db),
) -> LicenseActivationResponse:
    activator = LicenseActivator(db)

    try:
        return activator.activate(data)

    except LicenseNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except LicenseForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except DeviceLimitError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(exc),
        ) from exc

    except LicenseActivationError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Não foi possível ativar "
                "a licença."
            ),
        ) from exc


@router.post(
    "/validate",
    response_model=LicenseValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validar uma licença",
    description=(
        "Valida o token de ativação do "
        "dispositivo e confirma se a licença "
        "continua disponível para uso."
    ),
)
def validate_license(
    data: LicenseValidationRequest,
    db: Session = Depends(get_db),
) -> LicenseValidationResponse:
    validator = LicenseValidator(db)

    try:
        return validator.validate(data)

    except InvalidActivationTokenError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=str(exc),
        ) from exc

    except DeviceInactiveError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=str(exc),
        ) from exc

    except LicenseUnavailableError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=str(exc),
        ) from exc

    except LicenseValidationError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Não foi possível validar "
                "a licença."
            ),
        ) from exc