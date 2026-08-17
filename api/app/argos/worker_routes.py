from __future__ import annotations

import secrets
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.argos.models import ArgosJob
from app.argos.schemas import (
    JobResponse,
    WorkerClaimRequest,
    WorkerClaimResponse,
    WorkerCompleteRequest,
    WorkerFailRequest,
)
from app.argos.services import (
    claim_next_job,
    complete_job,
    fail_job,
)
from app.core.config import settings
from app.core.database import get_db


router = APIRouter(
    prefix="/argos-worker",
    tags=["Argos Worker"],
)


def require_worker_token(
    x_argos_worker_token: str | None = Header(
        default=None,
        alias="X-Argos-Worker-Token",
    ),
) -> None:
    expected = str(
        settings.argos_worker_token
        or ""
    )

    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Argos worker não configurado.",
        )

    supplied = str(
        x_argos_worker_token
        or ""
    )

    if not secrets.compare_digest(
        expected,
        supplied,
    ):
        raise HTTPException(
            status_code=401,
            detail="Worker token inválido.",
        )


@router.post(
    "/claim",
    response_model=WorkerClaimResponse,
    dependencies=[
        Depends(
            require_worker_token
        )
    ],
)
def claim(
    payload: WorkerClaimRequest,
    db: Session = Depends(get_db),
):
    job = claim_next_job(
        db,
        worker_id=payload.worker_id,
    )

    return WorkerClaimResponse(
        job=job,
    )


@router.post(
    "/jobs/{job_id}/complete",
    response_model=JobResponse,
    dependencies=[
        Depends(
            require_worker_token
        )
    ],
)
def complete(
    job_id: UUID,
    payload: WorkerCompleteRequest,
    db: Session = Depends(get_db),
):
    job = db.get(
        ArgosJob,
        job_id,
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job não encontrado.",
        )

    try:
        return complete_job(
            db,
            job=job,
            worker_id=(
                payload.worker_id
            ),
            result=payload.result,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc


@router.post(
    "/jobs/{job_id}/fail",
    response_model=JobResponse,
    dependencies=[
        Depends(
            require_worker_token
        )
    ],
)
def fail(
    job_id: UUID,
    payload: WorkerFailRequest,
    db: Session = Depends(get_db),
):
    job = db.get(
        ArgosJob,
        job_id,
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job não encontrado.",
        )

    try:
        return fail_job(
            db,
            job=job,
            worker_id=(
                payload.worker_id
            ),
            error=payload.error,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc
