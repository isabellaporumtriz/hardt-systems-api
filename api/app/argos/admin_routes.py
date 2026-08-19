from __future__ import annotations

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.argos.models import (
    ArgosCnpjBatch,
    ArgosIntake,
    ArgosJob,
    ArgosOperation,
)
from app.argos.schemas import (
    ArgosCnpjBatchDetailResponse,
    ArgosCnpjBatchResponse,
    CnpjIntakeConfirmRequest,
    CnpjIntakeResponse,
    JobCreateRequest,
    JobResponse,
    LegacyReconciliationDecisionRequest,
    OperationCreateRequest,
    OperationResponse,
)
from app.argos.services import (
    create_job,
    create_operation,
    ensure_legacy_reconciliation,
)
from app.argos.intake import (
    ArgosIntakeError,
    create_cnpj_intake,
    confirm_cnpj_intake,
)
from app.argos.cnpj_batch import (
    create_cnpj_batch,
    get_cnpj_batch_items,
)
from app.argos.legacy import (
    decide_legacy_reconciliation,
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


@router.post(
    "/cnpj-batches",
    response_model=ArgosCnpjBatchResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_cnpj_batch(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(
        get_current_admin
    ),
):
    content = await file.read()

    try:
        return create_cnpj_batch(
            db,
            original_filename=(
                file.filename
                or "cnpjs.xlsx"
            ),
            mime_type=(
                file.content_type
                or (
                    "application/"
                    "vnd.openxmlformats-"
                    "officedocument."
                    "spreadsheetml.sheet"
                )
            ),
            content=content,
            created_by_user_id=(
                admin.id
            ),
        )

    except ArgosIntakeError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@router.get(
    "/cnpj-batches/{batch_id}",
    response_model=(
        ArgosCnpjBatchDetailResponse
    ),
)
def read_cnpj_batch(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(
        get_current_admin
    ),
):
    batch = db.get(
        ArgosCnpjBatch,
        batch_id,
    )

    if not batch:
        raise HTTPException(
            status_code=404,
            detail=(
                "Lote de CNPJs "
                "não encontrado."
            ),
        )

    items = get_cnpj_batch_items(
        db,
        batch_id=batch_id,
    )

    summary = (
        ArgosCnpjBatchResponse
        .model_validate(batch)
        .model_dump()
    )

    return ArgosCnpjBatchDetailResponse(
        **summary,
        items=items,
    )


@router.post(
    "/intakes/cnpj-card",
    response_model=CnpjIntakeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_cnpj_card(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(
        get_current_admin
    ),
):
    content = await file.read()

    try:
        return create_cnpj_intake(
            db,
            original_filename=(
                file.filename
                or "cartao-cnpj.pdf"
            ),
            mime_type=(
                file.content_type
                or "application/pdf"
            ),
            content=content,
            created_by_user_id=(
                admin.id
            ),
        )

    except ArgosIntakeError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@router.get(
    "/intakes/{intake_id}",
    response_model=CnpjIntakeResponse,
)
def read_cnpj_intake(
    intake_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(
        get_current_admin
    ),
):
    intake = db.get(
        ArgosIntake,
        intake_id,
    )

    if not intake:
        raise HTTPException(
            status_code=404,
            detail=(
                "Intake Argos "
                "não encontrado."
            ),
        )

    return intake


@router.post(
    "/intakes/{intake_id}/confirm",
    response_model=OperationResponse,
    status_code=status.HTTP_201_CREATED,
)
def confirm_cnpj_card(
    intake_id: UUID,
    payload: CnpjIntakeConfirmRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(
        get_current_admin
    ),
):
    intake = db.get(
        ArgosIntake,
        intake_id,
    )

    if not intake:
        raise HTTPException(
            status_code=404,
            detail=(
                "Intake Argos "
                "não encontrado."
            ),
        )

    try:
        operation = confirm_cnpj_intake(
            db,
            intake=intake,
            company_data=(
                payload.company_data.model_dump()
            ),
            created_by_user_id=(
                admin.id
            ),
        )

        ensure_legacy_reconciliation(
            db,
            operation=operation,
        )

        db.refresh(
            operation
        )

        return operation

    except ArgosIntakeError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@router.post(
    "/operations/{operation_id}/legacy-reconciliation/decision",
    response_model=OperationResponse,
)
def decide_operation_legacy_reconciliation(
    operation_id: UUID,
    payload: LegacyReconciliationDecisionRequest,
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
            detail=(
                "Operação Argos "
                "não encontrada."
            ),
        )

    try:
        decide_legacy_reconciliation(
            operation,
            decision=payload.decision,
        )

        db.commit()
        db.refresh(
            operation
        )

        return operation

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
