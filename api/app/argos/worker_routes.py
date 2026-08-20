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

from app.argos.models import (
    ArgosJob,
    ArgosOperation,
)
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
from app.argos.services import (
    ACTION_CREATE_LANDING_PAGE,
)
from app.argos.sites_schemas import (
    ArgosSiteUploadEntry,
    ArgosSiteUploadManifestRequest,
    ArgosSiteUploadManifestResponse,
)
from app.argos.sites_storage import (
    ArgosSitesStorageError,
    generate_site_upload_url,
    normalize_site_path,
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



@router.post(
    "/jobs/{job_id}/sites/upload-manifest",
    response_model=(
        ArgosSiteUploadManifestResponse
    ),
    dependencies=[
        Depends(
            require_worker_token
        )
    ],
)
def create_site_upload_manifest(
    job_id: UUID,
    payload: ArgosSiteUploadManifestRequest,
    db: Session = Depends(get_db),
):
    job = db.get(
        ArgosJob,
        job_id,
    )

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job não encontrado.",
        )

    if (
        job.action
        != ACTION_CREATE_LANDING_PAGE
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "SITE_UPLOAD_JOB_ACTION_INVALID"
            ),
        )

    if job.status != "running":
        raise HTTPException(
            status_code=409,
            detail="SITE_UPLOAD_JOB_NOT_RUNNING",
        )

    expected_worker_id = str(
        job.worker_id or ""
    ).strip()

    supplied_worker_id = str(
        payload.worker_id or ""
    ).strip()

    if (
        not expected_worker_id
        or supplied_worker_id
        != expected_worker_id
    ):
        raise HTTPException(
            status_code=409,
            detail="SITE_UPLOAD_WORKER_MISMATCH",
        )

    operation = db.get(
        ArgosOperation,
        job.operation_id,
    )

    if operation is None:
        raise HTTPException(
            status_code=404,
            detail="Operação Argos não encontrada.",
        )

    hostname = str(
        operation.domain or ""
    ).strip().lower().rstrip(".")

    if not hostname:
        raise HTTPException(
            status_code=409,
            detail="SITE_UPLOAD_DOMAIN_REQUIRED",
        )

    total_size = sum(
        item.size_bytes
        for item in payload.files
    )

    if total_size > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="SITE_UPLOAD_TOTAL_TOO_LARGE",
        )

    normalized_files = []
    seen_paths = set()

    try:
        for item in payload.files:
            relative_path = (
                normalize_site_path(
                    item.path
                )
            )

            if relative_path in seen_paths:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "SITE_UPLOAD_DUPLICATE_PATH: "
                        + relative_path
                    ),
                )

            seen_paths.add(
                relative_path
            )

            normalized_files.append(
                (
                    relative_path,
                    item.content_type.strip(),
                )
            )

    except ArgosSitesStorageError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    if "index.html" not in seen_paths:
        raise HTTPException(
            status_code=400,
            detail=(
                "SITE_UPLOAD_INDEX_REQUIRED"
            ),
        )

    uploads = []

    try:
        for (
            relative_path,
            content_type,
        ) in normalized_files:

            cache_control = (
                "public, max-age=60"
                if relative_path.lower()
                .endswith(".html")
                else "public, max-age=86400"
            )

            (
                object_key,
                put_url,
            ) = generate_site_upload_url(
                hostname=hostname,
                relative_path=relative_path,
                content_type=content_type,
                job_id=str(
                    job.id
                ),
                operation_id=str(
                    operation.id
                ),
            )

            uploads.append(
                ArgosSiteUploadEntry(
                    path=relative_path,
                    object_key=object_key,
                    put_url=put_url,
                    headers={
                        "Content-Type":
                            content_type,
                        "Cache-Control":
                            cache_control,
                        "x-amz-meta-argos-job-id":
                            str(
                                job.id
                            ),
                        "x-amz-meta-argos-operation-id":
                            str(
                                operation.id
                            ),
                    },
                )
            )

    except ArgosSitesStorageError as exc:
        detail = str(exc)

        status_code = (
            503
            if detail.startswith(
                "ARGOS_SITES_R2_NOT_CONFIGURED"
            )
            else 400
        )

        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from exc

    return (
        ArgosSiteUploadManifestResponse(
            hostname=hostname,
            expires_in_seconds=(
                settings
                .argos_sites_r2_presigned_expire_seconds
            ),
            uploads=uploads,
        )
    )
