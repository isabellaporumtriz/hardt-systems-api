from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.argos.models import (
    ArgosJob,
    ArgosOperation,
)


ACTION_BUY_DOMAIN = "BUY_DOMAIN"

SUPPORTED_ACTIONS = {
    ACTION_BUY_DOMAIN,
}


def normalize_ascii(value: str) -> str:
    normalized = unicodedata.normalize(
        "NFKD",
        value,
    )

    return "".join(
        char
        for char in normalized
        if not unicodedata.combining(char)
    )


def make_client_slug(
    company_name: str,
) -> str:
    text = normalize_ascii(
        company_name,
    ).lower()

    text = re.sub(
        r"[^a-z0-9]+",
        "_",
        text,
    ).strip("_")

    return text[:160] or "empresa"


def make_domain_candidates(
    company_name: str,
) -> list[str]:
    text = normalize_ascii(
        company_name,
    ).lower()

    words = re.findall(
        r"[a-z0-9]+",
        text,
    )

    ignored = {
        "ltda",
        "me",
        "eireli",
        "sa",
        "s",
        "a",
    }

    words = [
        word
        for word in words
        if word not in ignored
    ]

    base = "".join(words)[:45]

    if not base:
        raise ValueError(
            "COMPANY_NAME_INVALID_FOR_DOMAIN"
        )

    candidates = [
        f"{base}.com",
        f"{base}brasil.com",
        f"{base}oficial.com",
    ]

    return list(
        dict.fromkeys(candidates)
    )


def unique_client_slug(
    db: Session,
    company_name: str,
) -> str:
    base = make_client_slug(
        company_name
    )

    candidate = base
    suffix = 2

    while db.scalar(
        select(
            ArgosOperation.id
        ).where(
            ArgosOperation.client_slug
            == candidate
        )
    ):
        candidate = (
            f"{base}_{suffix}"
        )
        suffix += 1

    return candidate


def create_operation(
    db: Session,
    *,
    company_name: str,
    created_by_user_id: UUID | None,
) -> ArgosOperation:
    normalized = " ".join(
        company_name.split()
    )

    operation = ArgosOperation(
        company_name=normalized,
        client_slug=unique_client_slug(
            db,
            normalized,
        ),
        status="active",
        current_step="CREATED",
        domain_candidates=(
            make_domain_candidates(
                normalized
            )
        ),
        last_message=(
            "Operação criada. "
            "Pronta para compra de domínio."
        ),
        created_by_user_id=(
            created_by_user_id
        ),
    )

    db.add(operation)
    db.commit()
    db.refresh(operation)

    return operation


def create_job(
    db: Session,
    *,
    operation: ArgosOperation,
    action: str,
) -> ArgosJob:
    normalized = str(
        action or ""
    ).strip().upper()

    if normalized not in SUPPORTED_ACTIONS:
        raise ValueError(
            f"UNSUPPORTED_ACTION: {normalized}"
        )

    active_job = db.scalar(
        select(
            ArgosJob
        ).where(
            ArgosJob.operation_id
            == operation.id,
            ArgosJob.action
            == normalized,
            ArgosJob.status.in_(
                [
                    "queued",
                    "running",
                ]
            ),
        )
    )

    if active_job:
        raise RuntimeError(
            "ACTION_ALREADY_PENDING"
        )

    if (
        normalized == ACTION_BUY_DOMAIN
        and operation.domain
    ):
        raise RuntimeError(
            "DOMAIN_ALREADY_COMPLETE"
        )

    payload = {
        "operation_id": str(
            operation.id
        ),
        "company_name": (
            operation.company_name
        ),
        "client_slug": (
            operation.client_slug
        ),
        "domain_candidates": list(
            operation.domain_candidates
            or []
        ),
    }

    job = ArgosJob(
        operation_id=operation.id,
        action=normalized,
        status="queued",
        payload=payload,
    )

    operation.last_message = (
        f"{normalized} adicionado à fila."
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


def claim_next_job(
    db: Session,
    *,
    worker_id: str,
) -> ArgosJob | None:
    job = db.scalar(
        select(
            ArgosJob
        )
        .where(
            ArgosJob.status
            == "queued"
        )
        .order_by(
            ArgosJob.created_at.asc()
        )
        .with_for_update(
            skip_locked=True
        )
        .limit(1)
    )

    if not job:
        return None

    job.status = "running"
    job.worker_id = worker_id
    job.claimed_at = datetime.now(
        timezone.utc
    )

    operation = db.get(
        ArgosOperation,
        job.operation_id,
    )

    if operation:
        operation.last_message = (
            f"{job.action} em execução "
            f"por {worker_id}."
        )

    db.commit()
    db.refresh(job)

    return job


def complete_job(
    db: Session,
    *,
    job: ArgosJob,
    worker_id: str,
    result: dict,
) -> ArgosJob:
    if job.status != "running":
        raise RuntimeError(
            "JOB_NOT_RUNNING"
        )

    if (
        job.worker_id
        and job.worker_id != worker_id
    ):
        raise RuntimeError(
            "JOB_WORKER_MISMATCH"
        )

    job.status = "succeeded"
    job.result = result
    job.error = None
    job.finished_at = datetime.now(
        timezone.utc
    )

    operation = db.get(
        ArgosOperation,
        job.operation_id,
    )

    if operation:
        if job.action == ACTION_BUY_DOMAIN:
            domain = str(
                result.get("domain")
                or ""
            ).strip()

            if not domain:
                raise RuntimeError(
                    "DOMAIN_MISSING_IN_RESULT"
                )

            operation.domain = domain
            operation.site_url = (
                result.get("site_url")
                or f"https://{domain}"
            )
            operation.current_step = (
                "DOMAIN_PURCHASED"
            )
            operation.last_message = (
                f"Domínio {domain} "
                "comprado/configurado."
            )

    db.commit()
    db.refresh(job)

    return job


def fail_job(
    db: Session,
    *,
    job: ArgosJob,
    worker_id: str,
    error: str,
) -> ArgosJob:
    if (
        job.worker_id
        and job.worker_id != worker_id
    ):
        raise RuntimeError(
            "JOB_WORKER_MISMATCH"
        )

    job.status = "failed"
    job.error = error
    job.finished_at = datetime.now(
        timezone.utc
    )

    operation = db.get(
        ArgosOperation,
        job.operation_id,
    )

    if operation:
        operation.last_message = (
            f"{job.action} falhou: "
            f"{error[:500]}"
        )

    db.commit()
    db.refresh(job)

    return job
