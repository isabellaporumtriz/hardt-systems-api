from __future__ import annotations

import re
from datetime import datetime, timezone

from app.argos.models import ArgosOperation


LEGACY_PENDING = "pending"
LEGACY_CANDIDATE = "candidate"
LEGACY_NOT_FOUND = "not_found"
LEGACY_CONFIRMED = "confirmed"
LEGACY_REJECTED = "rejected"

LEGACY_BLOCKING_STATUSES = {
    LEGACY_PENDING,
    LEGACY_CANDIDATE,
}


def _string(
    value: object,
) -> str | None:
    normalized = str(
        value or ""
    ).strip()

    return normalized or None


def _valid_domain(
    value: object,
) -> str | None:
    domain = _string(
        value
    )

    if not domain:
        return None

    domain = domain.lower()

    if not re.fullmatch(
        r"[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?",
        domain,
    ):
        return None

    if "." not in domain:
        return None

    return domain


def record_legacy_reconciliation_result(
    operation: ArgosOperation,
    result: dict,
) -> None:
    matched = result.get(
        "matched"
    )

    if not isinstance(
        matched,
        bool,
    ):
        raise RuntimeError(
            "LEGACY_MATCHED_BOOLEAN_REQUIRED"
        )

    source = _string(
        result.get("source")
    )

    operation.legacy_source = (
        source
    )

    operation.legacy_evidence = (
        dict(result)
    )

    if not matched:
        operation.legacy_reconciliation_status = (
            LEGACY_NOT_FOUND
        )

        operation.current_step = (
            "COMPANY_DATA_CONFIRMED"
        )

        operation.last_message = (
            "Nenhum histórico legado "
            "compatível foi encontrado. "
            "Compra de domínio liberada."
        )

        return

    operation.legacy_reconciliation_status = (
        LEGACY_CANDIDATE
    )

    operation.current_step = (
        "LEGACY_RECONCILIATION_REVIEW"
    )

    operation.last_message = (
        "Histórico legado encontrado. "
        "Aguardando confirmação humana "
        "antes de reutilizar os artefatos."
    )


def decide_legacy_reconciliation(
    operation: ArgosOperation,
    *,
    decision: str,
) -> None:
    normalized = str(
        decision or ""
    ).strip().lower()

    if normalized not in {
        "confirm",
        "reject",
    }:
        raise ValueError(
            "LEGACY_DECISION_INVALID"
        )

    if (
        operation.legacy_reconciliation_status
        != LEGACY_CANDIDATE
    ):
        raise RuntimeError(
            "LEGACY_CANDIDATE_REQUIRED"
        )

    now = datetime.now(
        timezone.utc
    )

    if normalized == "reject":
        operation.legacy_reconciliation_status = (
            LEGACY_REJECTED
        )

        operation.legacy_reconciled_at = (
            now
        )

        operation.current_step = (
            "COMPANY_DATA_CONFIRMED"
        )

        operation.last_message = (
            "Histórico legado ignorado "
            "por decisão humana. "
            "Compra de domínio liberada."
        )

        return

    evidence = (
        operation.legacy_evidence
        or {}
    )

    applied_domain = None
    applied_site = None
    applied_business = None

    if (
        evidence.get("domain_proven")
        is True
    ):
        applied_domain = _valid_domain(
            evidence.get("domain")
        )

        if not applied_domain:
            raise RuntimeError(
                "LEGACY_DOMAIN_PROOF_INVALID"
            )

        operation.domain = (
            applied_domain
        )

        candidates = [
            str(item).strip().lower()
            for item in (
                operation.domain_candidates
                or []
            )
            if str(item).strip()
        ]

        if (
            applied_domain
            not in candidates
        ):
            operation.domain_candidates = (
                [applied_domain]
                + candidates
            )

    if (
        evidence.get("site_proven")
        is True
    ):
        applied_site = _string(
            evidence.get("site_url")
        )

        if not applied_site:
            raise RuntimeError(
                "LEGACY_SITE_PROOF_INVALID"
            )

        operation.site_url = (
            applied_site
        )

    if (
        evidence.get("business_id_proven")
        is True
    ):
        applied_business = _string(
            evidence.get(
                "business_id"
            )
        )

        if not applied_business:
            raise RuntimeError(
                "LEGACY_BUSINESS_ID_PROOF_INVALID"
            )

        operation.business_id = (
            applied_business
        )

    if applied_business:
        operation.current_step = (
            "BUSINESS_CREATED"
        )
    elif applied_site:
        operation.current_step = (
            "LANDING_CREATED"
        )
    elif applied_domain:
        operation.current_step = (
            "DOMAIN_PURCHASED"
        )
    else:
        operation.current_step = (
            "COMPANY_DATA_CONFIRMED"
        )

    operation.legacy_reconciliation_status = (
        LEGACY_CONFIRMED
    )

    operation.legacy_reconciled_at = (
        now
    )

    applied = []

    if applied_domain:
        applied.append(
            f"domínio {applied_domain}"
        )

    if applied_site:
        applied.append(
            "landing page"
        )

    if applied_business:
        applied.append(
            f"Business ID {applied_business}"
        )

    if applied:
        summary = ", ".join(
            applied
        )

        operation.last_message = (
            "Histórico legado confirmado: "
            f"{summary} reutilizado."
        )
    else:
        operation.last_message = (
            "Histórico legado confirmado, "
            "sem artefatos comprovados "
            "para reutilização automática."
        )
