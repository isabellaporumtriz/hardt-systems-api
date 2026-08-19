from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.argos.legacy import (
    LEGACY_BLOCKING_STATUSES,
    record_legacy_reconciliation_result,
)
from app.argos.meta_pool import (
    mark_login_completed,
    mark_login_pending,
    reserve_first_available_profile,
)

from app.argos.models import (
    ArgosJob,
    ArgosMetaAssignment,
    ArgosMetaProfile,
    ArgosOperation,
)


ACTION_BUY_DOMAIN = "BUY_DOMAIN"

ACTION_ALLOCATE_SUBDOMAIN = (
    "ALLOCATE_SUBDOMAIN"
)

ACTION_CREATE_LANDING_PAGE = (
    "CREATE_LANDING_PAGE"
)

ACTION_RECONCILE_LEGACY = (
    "RECONCILE_LEGACY"
)

ACTION_LOGIN_META = (
    "LOGIN_META"
)

ACTION_META_DOMAIN = (
    "META_DOMAIN"
)

ACTION_BUSINESS_INFO = (
    "BUSINESS_INFO"
)

SUPPORTED_ACTIONS = {
    ACTION_BUY_DOMAIN,
    ACTION_ALLOCATE_SUBDOMAIN,
    ACTION_CREATE_LANDING_PAGE,
    ACTION_RECONCILE_LEGACY,
    ACTION_LOGIN_META,
    ACTION_META_DOMAIN,
    ACTION_BUSINESS_INFO,
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


POOL_ROOT_CANDIDATES = (
    "escalaforte.com",
    "empresaemescala.com",
    "escaladeempresa.com",
    "empresaforte.com",
    "empresagrande.com",
    "escalaforteempresa.com",
    "centraldeempresas.com",
    "centralempresarial.com",
    "redeempresarial.com",
    "baseempresarial.com",
    "empresaativa.com",
    "negocioemescala.com",
    "escalanegocios.com",
    "estruturaforte.com",
    "estruturadeempresa.com",
    "empresadeescala.com",
    "rededeempresas.com",
    "centraldeescala.com",
    "negocioforte.com",
    "baseforteempresa.com",
)


def root_domain_from_hostname(
    value: str | None,
) -> str | None:

    hostname = str(
        value or ""
    ).strip().lower().rstrip(".")

    if not hostname:
        return None

    for root in POOL_ROOT_CANDIDATES:

        if hostname == root:
            return root

        if hostname.endswith(
            "." + root
        ):
            return root

    return None


def make_pool_domain_candidates(
    db: Session,
) -> list[str]:

    used_roots: set[str] = set()

    domains = db.scalars(
        select(
            ArgosOperation.domain
        ).where(
            ArgosOperation.domain.is_not(
                None
            )
        )
    )

    for domain in domains:

        root = root_domain_from_hostname(
            domain
        )

        if root:
            used_roots.add(
                root
            )

    candidates = [
        root
        for root in POOL_ROOT_CANDIDATES
        if root not in used_roots
    ]

    if not candidates:
        raise RuntimeError(
            "DOMAIN_POOL_ROOT_CANDIDATES_EXHAUSTED"
        )

    return candidates[:3]


def make_domain_candidates(
    company_name: str,
) -> list[str]:

    # Compatibilidade com callers antigos.
    # O nome da empresa não influencia mais
    # os roots comprados pelo Argos.

    _ = company_name

    return list(
        POOL_ROOT_CANDIDATES[:3]
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
            make_pool_domain_candidates(
                db
            )
        ),
        last_message=(
            "Operação criada. "
            "Pronta para alocação de subdomínio."
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
    selected_domain: str | None = None,
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

    company_data = (
        operation.company_data
        or {}
    )

    cnpj = str(
        company_data.get("cnpj")
        or ""
    ).strip()

    meta_assignment = None
    meta_profile = None

    if (
        normalized
        == ACTION_RECONCILE_LEGACY
    ):
        if not cnpj:
            raise ValueError(
                "CNPJ_REQUIRED_FOR_LEGACY_RECONCILIATION"
            )

        operation.legacy_reconciliation_status = (
            "pending"
        )

        operation.current_step = (
            "LEGACY_RECONCILIATION_PENDING"
        )

    if (
        normalized
        in {
            ACTION_ALLOCATE_SUBDOMAIN,
            ACTION_BUY_DOMAIN,
        }
        and (
            operation.legacy_reconciliation_status
            in LEGACY_BLOCKING_STATUSES
        )
    ):
        raise RuntimeError(
            "LEGACY_RECONCILIATION_PENDING"
        )

    if (
        normalized
        in {
            ACTION_ALLOCATE_SUBDOMAIN,
            ACTION_BUY_DOMAIN,
        }
        and operation.domain
    ):
        raise RuntimeError(
            "DOMAIN_ALREADY_COMPLETE"
        )

    if (
        normalized
        == ACTION_CREATE_LANDING_PAGE
    ):
        if (
            operation
            .legacy_reconciliation_status
            in LEGACY_BLOCKING_STATUSES
        ):
            raise RuntimeError(
                "LEGACY_RECONCILIATION_PENDING"
            )

        if not operation.domain:
            raise RuntimeError(
                "DOMAIN_REQUIRED_BEFORE_LANDING_PAGE"
            )

        if operation.site_url:
            raise RuntimeError(
                "LANDING_PAGE_ALREADY_COMPLETE"
            )

    if (
        normalized
        == ACTION_LOGIN_META
    ):
        if (
            operation.current_step
            != "LANDING_CREATED"
        ):
            raise RuntimeError(
                "LANDING_PAGE_REQUIRED_BEFORE_META_LOGIN"
            )

        if not str(
            operation.site_url
            or ""
        ).strip():
            raise RuntimeError(
                "SITE_URL_REQUIRED_BEFORE_META_LOGIN"
            )

        meta_assignment = (
            reserve_first_available_profile(
                db,
                operation_id=operation.id,
            )
        )

        if (
            meta_assignment.status
            == "assigned"
        ):
            raise RuntimeError(
                "META_LOGIN_ALREADY_COMPLETE"
            )

        meta_profile = db.get(
            ArgosMetaProfile,
            meta_assignment.meta_profile_id,
        )

        if meta_profile is None:
            raise RuntimeError(
                "META_PROFILE_NOT_FOUND"
            )

    if (
        normalized
        == ACTION_META_DOMAIN
    ):
        if (
            operation.current_step
            != "BUSINESS_CREATED"
        ):
            raise RuntimeError(
                "BUSINESS_REQUIRED_BEFORE_META_DOMAIN"
            )

        domain = str(
            operation.domain
            or ""
        ).strip().lower()

        if not domain:
            raise RuntimeError(
                "DOMAIN_REQUIRED_BEFORE_META_DOMAIN"
            )

        business_id = str(
            operation.business_id
            or ""
        ).strip()

        if not business_id:
            raise RuntimeError(
                "BUSINESS_ID_REQUIRED_BEFORE_META_DOMAIN"
            )

        if not str(
            operation.site_url
            or ""
        ).strip():
            raise RuntimeError(
                "SITE_URL_REQUIRED_BEFORE_META_DOMAIN"
            )

        meta_assignment = db.scalar(
            select(
                ArgosMetaAssignment
            )
            .where(
                ArgosMetaAssignment.operation_id
                == operation.id,
                ArgosMetaAssignment.status
                == "assigned",
            )
            .order_by(
                ArgosMetaAssignment
                .login_completed_at
                .desc()
            )
            .limit(1)
        )

        if meta_assignment is None:
            raise RuntimeError(
                "META_ASSIGNMENT_REQUIRED_BEFORE_META_DOMAIN"
            )

        meta_profile = db.get(
            ArgosMetaProfile,
            meta_assignment.meta_profile_id,
        )

        if meta_profile is None:
            raise RuntimeError(
                "META_PROFILE_NOT_FOUND"
            )

        profile_ref = str(
            meta_profile.profile_ref
            or ""
        ).strip()

        if not profile_ref:
            raise RuntimeError(
                "META_PROFILE_REF_MISSING"
            )

        landing_job = db.scalar(
            select(
                ArgosJob
            )
            .where(
                ArgosJob.operation_id
                == operation.id,
                ArgosJob.action
                == ACTION_CREATE_LANDING_PAGE,
                ArgosJob.status
                == "succeeded",
            )
            .order_by(
                ArgosJob.finished_at.desc()
            )
            .limit(1)
        )

        if landing_job is None:
            raise RuntimeError(
                "LANDING_JOB_REQUIRED_BEFORE_META_DOMAIN"
            )

        landing_result = (
            landing_job.result
            or {}
        )

        site_dir = str(
            landing_result.get(
                "site_dir"
            )
            or ""
        ).strip()

        pages_project = str(
            landing_result.get(
                "pages_project"
            )
            or ""
        ).strip()

        if (
            not site_dir
            or not pages_project
        ):
            raise RuntimeError(
                "LANDING_DEPLOYMENT_CONTEXT_MISSING"
            )

    if (
        normalized
        == ACTION_BUSINESS_INFO
    ):
        if (
            operation.current_step
            not in {
                "META_DOMAIN_VERIFIED",
                "DOMAIN_VERIFIED",
            }
        ):
            raise RuntimeError(
                "META_DOMAIN_REQUIRED_BEFORE_BUSINESS_INFO"
            )

        business_id = str(
            operation.business_id
            or ""
        ).strip()

        if not business_id:
            raise RuntimeError(
                "BUSINESS_ID_REQUIRED_BEFORE_BUSINESS_INFO"
            )

        meta_assignment = db.scalar(
            select(
                ArgosMetaAssignment
            )
            .where(
                ArgosMetaAssignment.operation_id
                == operation.id,
                ArgosMetaAssignment.status
                == "assigned",
            )
            .order_by(
                ArgosMetaAssignment
                .login_completed_at
                .desc()
            )
            .limit(1)
        )

        if meta_assignment is None:
            raise RuntimeError(
                "META_ASSIGNMENT_REQUIRED_BEFORE_BUSINESS_INFO"
            )

        meta_profile = db.get(
            ArgosMetaProfile,
            meta_assignment.meta_profile_id,
        )

        if meta_profile is None:
            raise RuntimeError(
                "META_PROFILE_NOT_FOUND"
            )

        profile_ref = str(
            meta_profile.profile_ref
            or ""
        ).strip()

        if not profile_ref:
            raise RuntimeError(
                "META_PROFILE_REF_MISSING"
            )

    if normalized in {
        ACTION_ALLOCATE_SUBDOMAIN,
        ACTION_BUY_DOMAIN,
    }:
        operation.domain_candidates = (
            make_pool_domain_candidates(
                db
            )
        )

    candidates = [
        str(candidate).strip().lower()
        for candidate in (
            operation.domain_candidates
            or []
        )
        if str(candidate).strip()
    ]

    selected = str(
        selected_domain or ""
    ).strip().lower()

    if normalized == ACTION_BUY_DOMAIN:
        if not selected:
            raise ValueError(
                "SELECTED_DOMAIN_REQUIRED"
            )

        if selected not in candidates:
            raise ValueError(
                "SELECTED_DOMAIN_NOT_ALLOWED"
            )

        job_candidates = [
            selected
        ]
    else:
        job_candidates = candidates

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
        "selected_domain": (
            selected or None
        ),
        "domain_candidates":
            job_candidates,

        "cnpj": (
            cnpj
            or None
        ),

        "razao_social": (
            str(
                company_data.get(
                    "razao_social"
                )
                or ""
            ).strip()
            or None
        ),

        "nome_fantasia": (
            str(
                company_data.get(
                    "nome_fantasia"
                )
                or ""
            ).strip()
            or None
        ),

        "company_data": (
            dict(company_data)
        ),

        "domain": (
            operation.domain
        ),

        "site_url": (
            operation.site_url
        ),

        "institutional_email": (
            (
                "contato@"
                + operation.domain
            )
            if operation.domain
            else None
        ),

        "meta_assignment_id": (
            str(meta_assignment.id)
            if meta_assignment
            else None
        ),

        "profile_ref": (
            meta_profile.profile_ref
            if meta_profile
            else None
        ),

        "meta_profile_label": (
            meta_profile.label
            if meta_profile
            else None
        ),

        "meta_allocation_order": (
            meta_profile.allocation_order
            if meta_profile
            else None
        ),
    }

    if (
        normalized
        == ACTION_META_DOMAIN
    ):
        payload.update(
            {
                "profile_ref":
                    profile_ref,
                "meta_assignment_id": str(
                    meta_assignment.id
                ),
                "business_id":
                    business_id,
                "domain":
                    domain,
                "site_url": str(
                    operation.site_url
                    or ""
                ).strip(),
                "site_dir":
                    site_dir,
                "pages_project":
                    pages_project,
            }
        )

    if (
        normalized
        == ACTION_BUSINESS_INFO
    ):
        payload.update(
            {
                "profile_ref":
                    profile_ref,
                "meta_assignment_id": str(
                    meta_assignment.id
                ),
                "business_id":
                    business_id,
            }
        )

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


def ensure_legacy_reconciliation(
    db: Session,
    *,
    operation: ArgosOperation,
) -> ArgosJob | None:
    company_data = (
        operation.company_data
        or {}
    )

    cnpj = str(
        company_data.get("cnpj")
        or ""
    ).strip()

    if not cnpj:
        return None

    if (
        operation.legacy_reconciliation_status
        in {
            "candidate",
            "not_found",
            "confirmed",
            "rejected",
        }
    ):
        return None

    active = db.scalar(
        select(
            ArgosJob
        ).where(
            ArgosJob.operation_id
            == operation.id,
            ArgosJob.action
            == ACTION_RECONCILE_LEGACY,
            ArgosJob.status.in_(
                [
                    "queued",
                    "running",
                ]
            ),
        )
    )

    if active:
        return active

    return create_job(
        db,
        operation=operation,
        action=(
            ACTION_RECONCILE_LEGACY
        ),
    )


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

    if (
        job.action
        == ACTION_LOGIN_META
    ):
        payload = (
            job.payload
            or {}
        )

        raw_assignment_id = str(
            payload.get(
                "meta_assignment_id"
            )
            or ""
        ).strip()

        if not raw_assignment_id:
            raise RuntimeError(
                "META_ASSIGNMENT_ID_MISSING_ON_CLAIM"
            )

        try:
            assignment_id = UUID(
                raw_assignment_id
            )
        except ValueError as exc:
            raise RuntimeError(
                "META_ASSIGNMENT_ID_INVALID_ON_CLAIM"
            ) from exc

        assignment = db.get(
            ArgosMetaAssignment,
            assignment_id,
        )

        if assignment is None:
            raise RuntimeError(
                "META_ASSIGNMENT_NOT_FOUND_ON_CLAIM"
            )

        if (
            assignment.operation_id
            != job.operation_id
        ):
            raise RuntimeError(
                "META_ASSIGNMENT_OPERATION_MISMATCH_ON_CLAIM"
            )

        if (
            assignment.status
            == "reserved"
        ):
            mark_login_pending(
                db,
                assignment_id=assignment.id,
            )

        elif (
            assignment.status
            == "login_pending"
        ):
            # Retry do MESMO perfil.
            assignment.last_error = None

        else:
            raise RuntimeError(
                "META_ASSIGNMENT_INVALID_STATUS_ON_CLAIM: "
                + str(
                    assignment.status
                )
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
        if job.action in {
            ACTION_ALLOCATE_SUBDOMAIN,
            ACTION_BUY_DOMAIN,
        }:
            domain = str(
                result.get("domain")
                or ""
            ).strip().lower()

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
                "DOMAIN_ALLOCATED"
            )

            root_domain = str(
                result.get("root_domain")
                or ""
            ).strip().lower()

            slot = result.get(
                "slot"
            )

            capacity = result.get(
                "capacity"
            )

            if (
                job.action
                == ACTION_BUY_DOMAIN
            ):
                message = (
                    "Novo domínio raiz "
                    "provisionado e subdomínio "
                    f"{domain} alocado."
                )
            else:
                message = (
                    f"Subdomínio {domain} "
                    "alocado em root existente."
                )

            if root_domain:
                message += (
                    f" Root: {root_domain}."
                )

            if (
                slot is not None
                and capacity is not None
            ):
                message += (
                    f" Slot {slot}/{capacity}."
                )

            operation.last_message = (
                message
            )

        elif (
            job.action
            == ACTION_CREATE_LANDING_PAGE
        ):
            result_domain = str(
                result.get("domain")
                or ""
            ).strip().lower()

            expected_domain = str(
                operation.domain
                or ""
            ).strip().lower()

            if (
                result_domain
                and expected_domain
                and result_domain
                != expected_domain
            ):
                raise RuntimeError(
                    "LANDING_PAGE_DOMAIN_MISMATCH"
                )

            site_url = str(
                result.get("site_url")
                or ""
            ).strip()

            if not site_url:
                raise RuntimeError(
                    "LANDING_PAGE_URL_MISSING_IN_RESULT"
                )

            operation.site_url = (
                site_url
            )

            operation.current_step = (
                "LANDING_CREATED"
            )

            operation.last_message = (
                "Landing page criada "
                "e validada em "
                f"{site_url}."
            )

        elif (
            job.action
            == ACTION_RECONCILE_LEGACY
        ):
            record_legacy_reconciliation_result(
                operation,
                result,
            )


        elif (
            job.action
            == ACTION_LOGIN_META
        ):
            result_status = str(
                result.get("status")
                or ""
            ).strip().lower()

            if (
                result_status
                != "succeeded"
            ):
                raise RuntimeError(
                    "META_LOGIN_RESULT_NOT_SUCCEEDED"
                )

            if (
                result.get(
                    "authenticated"
                )
                is not True
            ):
                raise RuntimeError(
                    "META_LOGIN_NOT_VERIFIED"
                )

            payload = (
                job.payload
                or {}
            )

            expected_ref = str(
                payload.get(
                    "profile_ref"
                )
                or ""
            ).strip()

            returned_ref = str(
                result.get(
                    "profile_ref"
                )
                or ""
            ).strip()

            if not expected_ref:
                raise RuntimeError(
                    "META_PROFILE_REF_MISSING_IN_JOB"
                )

            if (
                returned_ref
                != expected_ref
            ):
                raise RuntimeError(
                    "META_PROFILE_REF_MISMATCH"
                )

            raw_assignment_id = str(
                payload.get(
                    "meta_assignment_id"
                )
                or ""
            ).strip()

            if not raw_assignment_id:
                raise RuntimeError(
                    "META_ASSIGNMENT_ID_MISSING_ON_COMPLETE"
                )

            try:
                assignment_id = UUID(
                    raw_assignment_id
                )
            except ValueError as exc:
                raise RuntimeError(
                    "META_ASSIGNMENT_ID_INVALID_ON_COMPLETE"
                ) from exc

            assignment = db.get(
                ArgosMetaAssignment,
                assignment_id,
            )

            if assignment is None:
                raise RuntimeError(
                    "META_ASSIGNMENT_NOT_FOUND_ON_COMPLETE"
                )

            if (
                assignment.operation_id
                != job.operation_id
            ):
                raise RuntimeError(
                    "META_ASSIGNMENT_OPERATION_MISMATCH_ON_COMPLETE"
                )

            if (
                assignment.status
                != "login_pending"
            ):
                raise RuntimeError(
                    "META_ASSIGNMENT_NOT_LOGIN_PENDING"
                )

            profile = db.get(
                ArgosMetaProfile,
                assignment.meta_profile_id,
            )

            if profile is None:
                raise RuntimeError(
                    "META_PROFILE_NOT_FOUND_ON_COMPLETE"
                )

            if (
                profile.profile_ref
                != expected_ref
            ):
                raise RuntimeError(
                    "META_ASSIGNMENT_PROFILE_REF_MISMATCH"
                )

            mark_login_completed(
                db,
                assignment_id=assignment.id,
            )

            operation.current_step = (
                "META_LOGGED_IN"
            )

            profile_label = str(
                payload.get(
                    "meta_profile_label"
                )
                or expected_ref
            ).strip()

            operation.last_message = (
                "Login Meta concluído "
                f"com {profile_label}."
            )

        elif (
            job.action
            == ACTION_META_DOMAIN
        ):
            result_status = str(
                result.get("status")
                or ""
            ).strip().lower()

            if (
                result_status
                != "succeeded"
            ):
                raise RuntimeError(
                    "META_DOMAIN_RESULT_NOT_SUCCEEDED"
                )

            if (
                result.get("verified")
                is not True
            ):
                raise RuntimeError(
                    "META_DOMAIN_NOT_VERIFIED"
                )

            payload = (
                job.payload
                or {}
            )

            expected_domain = str(
                payload.get("domain")
                or operation.domain
                or ""
            ).strip().lower()

            returned_domain = str(
                result.get("domain")
                or ""
            ).strip().lower()

            if not expected_domain:
                raise RuntimeError(
                    "META_DOMAIN_EXPECTED_DOMAIN_MISSING"
                )

            if (
                returned_domain
                != expected_domain
            ):
                raise RuntimeError(
                    "META_DOMAIN_DOMAIN_MISMATCH"
                )

            expected_business_id = str(
                payload.get("business_id")
                or operation.business_id
                or ""
            ).strip()

            returned_business_id = str(
                result.get("business_id")
                or ""
            ).strip()

            if not expected_business_id:
                raise RuntimeError(
                    "META_DOMAIN_EXPECTED_BUSINESS_ID_MISSING"
                )

            if (
                returned_business_id
                != expected_business_id
            ):
                raise RuntimeError(
                    "META_DOMAIN_BUSINESS_ID_MISMATCH"
                )

            expected_ref = str(
                payload.get("profile_ref")
                or ""
            ).strip()

            returned_ref = str(
                result.get("profile_ref")
                or ""
            ).strip()

            if not expected_ref:
                raise RuntimeError(
                    "META_DOMAIN_PROFILE_REF_MISSING_IN_JOB"
                )

            if (
                returned_ref
                != expected_ref
            ):
                raise RuntimeError(
                    "META_DOMAIN_PROFILE_REF_MISMATCH"
                )

            operation.current_step = (
                "META_DOMAIN_VERIFIED"
            )

            operation.last_message = (
                f"Domínio {expected_domain} "
                "conectado e verificado na Meta."
            )

        elif (
            job.action
            == ACTION_BUSINESS_INFO
        ):
            result_status = str(
                result.get("status")
                or ""
            ).strip().lower()

            if (
                result_status
                != "succeeded"
            ):
                raise RuntimeError(
                    "BUSINESS_INFO_RESULT_NOT_SUCCEEDED"
                )

            if (
                result.get(
                    "business_info_complete"
                )
                is not True
            ):
                raise RuntimeError(
                    "BUSINESS_INFO_NOT_CONFIRMED"
                )

            payload = (
                job.payload
                or {}
            )

            expected_business_id = str(
                payload.get("business_id")
                or operation.business_id
                or ""
            ).strip()

            returned_business_id = str(
                result.get("business_id")
                or ""
            ).strip()

            if (
                not expected_business_id
                or returned_business_id
                != expected_business_id
            ):
                raise RuntimeError(
                    "BUSINESS_INFO_BUSINESS_ID_MISMATCH"
                )

            expected_ref = str(
                payload.get("profile_ref")
                or ""
            ).strip()

            returned_ref = str(
                result.get("profile_ref")
                or ""
            ).strip()

            if (
                not expected_ref
                or returned_ref
                != expected_ref
            ):
                raise RuntimeError(
                    "BUSINESS_INFO_PROFILE_REF_MISMATCH"
                )

            operation.current_step = (
                "BUSINESS_INFO_COMPLETE"
            )

            operation.last_message = (
                "Business Info preenchido "
                "e confirmado na Meta."
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

    is_dry_run = str(
        error or ""
    ).startswith(
        "DRY_RUN_CONFIRMED"
    )

    job.status = (
        "dry_run"
        if is_dry_run
        else "failed"
    )
    job.error = error
    job.finished_at = datetime.now(
        timezone.utc
    )

    if (
        job.action
        == ACTION_LOGIN_META
        and not is_dry_run
    ):
        payload = (
            job.payload
            or {}
        )

        raw_assignment_id = str(
            payload.get(
                "meta_assignment_id"
            )
            or ""
        ).strip()

        if not raw_assignment_id:
            raise RuntimeError(
                "META_ASSIGNMENT_ID_MISSING_ON_FAIL"
            )

        try:
            assignment_id = UUID(
                raw_assignment_id
            )
        except ValueError as exc:
            raise RuntimeError(
                "META_ASSIGNMENT_ID_INVALID_ON_FAIL"
            ) from exc

        assignment = db.get(
            ArgosMetaAssignment,
            assignment_id,
        )

        if assignment is None:
            raise RuntimeError(
                "META_ASSIGNMENT_NOT_FOUND_ON_FAIL"
            )

        if (
            assignment.operation_id
            != job.operation_id
        ):
            raise RuntimeError(
                "META_ASSIGNMENT_OPERATION_MISMATCH_ON_FAIL"
            )

        if assignment.status in {
            "reserved",
            "login_pending",
        }:
            # A falha do LOGIN_META não libera
            # nem descarta o perfil.
            #
            # O próximo job da mesma operação
            # reutiliza este assignment.
            assignment.last_error = str(
                error
                or ""
            )[:5000]

        elif (
            assignment.status
            == "assigned"
        ):
            # Nunca rebaixa um login que já foi
            # confirmado anteriormente.
            pass

        else:
            raise RuntimeError(
                "META_ASSIGNMENT_INVALID_STATUS_ON_FAIL: "
                + str(
                    assignment.status
                )
            )

    operation = db.get(
        ArgosOperation,
        job.operation_id,
    )

    if operation:
        if is_dry_run:
            operation.last_message = (
                "Teste concluído: Argos Agent "
                "recebeu e validou o comando; "
                "nenhuma ação externa foi executada."
            )
        else:
            operation.last_message = (
                f"{job.action} falhou: "
                f"{error[:500]}"
            )

    db.commit()
    db.refresh(job)

    return job
