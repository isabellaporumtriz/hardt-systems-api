from __future__ import annotations

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.argos.models import (
    ArgosJob,
    ArgosOperation,
)
from app.argos.schemas import (
    JobCreateRequest,
    JobResponse,
    OperationCreateRequest,
    OperationResponse,
)
from app.argos.services import (
    create_job,
    create_operation,
)
from app.auth.dependencies import (
    get_current_admin,
)
from app.core.database import get_db
from app.users.models import User


router = APIRouter(
    prefix="/admin/argos",
    tags=["Admin Argos"],
)


@router.get(
    "/operations",
    response_model=list[
        OperationResponse
    ],
)
def list_operations(
    db: Session = Depends(get_db),
    _admin: User = Depends(
        get_current_admin
    ),
):
    return list(
        db.scalars(
            select(
                ArgosOperation
            ).order_by(
                ArgosOperation.created_at.desc()
            )
        )
    )


@router.post(
    "/operations",
    response_model=OperationResponse,
    status_code=status.HTTP_201_CREATED,
)
def new_operation(
    payload: OperationCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(
        get_current_admin
    ),
):
    try:
        return create_operation(
            db,
            company_name=(
                payload.company_name
            ),
            created_by_user_id=admin.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.get(
    "/operations/{operation_id}",
    response_model=OperationResponse,
)
def read_operation(
    operation_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(
        get_current_admin
    ),
):
    operation = db.get(
        ArgosOperation,
        operation_id,
    )

    if not operation:
        raise HTTPException(
            status_code=404,
            detail="Operação Argos não encontrada.",
        )

    return operation


@router.get(
    "/operations/{operation_id}/jobs",
    response_model=list[JobResponse],
)
def list_operation_jobs(
    operation_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(
        get_current_admin
    ),
):
    return list(
        db.scalars(
            select(
                ArgosJob
            )
            .where(
                ArgosJob.operation_id
                == operation_id
            )
            .order_by(
                ArgosJob.created_at.desc()
            )
        )
    )


@router.post(
    "/operations/{operation_id}/jobs",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def queue_operation_job(
    operation_id: UUID,
    payload: JobCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(
        get_current_admin
    ),
):
    operation = db.get(
        ArgosOperation,
        operation_id,
    )

    if not operation:
        raise HTTPException(
            status_code=404,
            detail="Operação Argos não encontrada.",
        )

    try:
        return create_job(
            db,
            operation=operation,
            action=payload.action,
            selected_domain=(
                payload.selected_domain
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc
