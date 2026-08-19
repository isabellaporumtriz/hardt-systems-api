from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.argos.models import (
    ArgosMetaAssignment,
    ArgosMetaProfile,
    ArgosOperation,
)
from app.core.crypto import (
    decrypt_sensitive_value,
    encrypt_sensitive_value,
)


ACTIVE_ASSIGNMENT_STATUSES = {
    "reserved",
    "login_pending",
    "assigned",
}


class ArgosMetaPoolError(RuntimeError):
    pass


class ArgosMetaPoolExhausted(ArgosMetaPoolError):
    pass


class ArgosOperationNotFound(ArgosMetaPoolError):
    pass


def serialize_meta_payload(
    payload: dict[str, Any],
) -> str:
    if not isinstance(payload, dict):
        raise ArgosMetaPoolError(
            "META_PROFILE_PAYLOAD_INVALID"
        )

    raw = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return encrypt_sensitive_value(raw)


def deserialize_meta_payload(
    encrypted_payload: str,
) -> dict[str, Any]:
    raw = decrypt_sensitive_value(
        encrypted_payload
    )

    data = json.loads(raw)

    if not isinstance(data, dict):
        raise ArgosMetaPoolError(
            "META_PROFILE_PAYLOAD_INVALID"
        )

    return data


def add_meta_profile(
    db: Session,
    *,
    label: str,
    profile_ref: str,
    payload: dict[str, Any],
    allocation_order: int,
    facebook_id: str | None = None,
    capacity: int = 1,
    notes: str | None = None,
) -> ArgosMetaProfile:
    label = str(label or "").strip()
    profile_ref = str(profile_ref or "").strip()

    if not label:
        raise ArgosMetaPoolError(
            "META_PROFILE_LABEL_REQUIRED"
        )

    if not profile_ref:
        raise ArgosMetaPoolError(
            "META_PROFILE_REF_REQUIRED"
        )

    try:
        allocation_order = int(
            allocation_order
        )
    except (TypeError, ValueError) as exc:
        raise ArgosMetaPoolError(
            "META_PROFILE_ALLOCATION_ORDER_INVALID"
        ) from exc

    if allocation_order < 1:
        raise ArgosMetaPoolError(
            "META_PROFILE_ALLOCATION_ORDER_INVALID"
        )

    try:
        capacity = int(capacity)
    except (TypeError, ValueError) as exc:
        raise ArgosMetaPoolError(
            "META_PROFILE_CAPACITY_INVALID"
        ) from exc

    if capacity < 1:
        raise ArgosMetaPoolError(
            "META_PROFILE_CAPACITY_INVALID"
        )

    existing = db.scalar(
        select(ArgosMetaProfile).where(
            ArgosMetaProfile.profile_ref
            == profile_ref
        )
    )

    if existing is not None:
        raise ArgosMetaPoolError(
            "META_PROFILE_REF_ALREADY_EXISTS"
        )

    existing_order = db.scalar(
        select(ArgosMetaProfile).where(
            ArgosMetaProfile.allocation_order
            == allocation_order
        )
    )

    if existing_order is not None:
        raise ArgosMetaPoolError(
            "META_PROFILE_ALLOCATION_ORDER_ALREADY_EXISTS"
        )

    profile = ArgosMetaProfile(
        label=label,
        facebook_id=(
            str(facebook_id or "").strip()
            or None
        ),
        profile_ref=profile_ref,
        allocation_order=allocation_order,
        status="available",
        capacity=capacity,
        encrypted_payload=(
            serialize_meta_payload(payload)
        ),
        notes=(
            str(notes or "").strip()
            or None
        ),
    )

    db.add(profile)
    db.flush()

    return profile


def get_active_assignment(
    db: Session,
    *,
    operation_id: UUID,
) -> ArgosMetaAssignment | None:
    return db.scalar(
        select(ArgosMetaAssignment)
        .where(
            ArgosMetaAssignment.operation_id
            == operation_id,
            ArgosMetaAssignment.status.in_(
                ACTIVE_ASSIGNMENT_STATUSES
            ),
        )
        .order_by(
            ArgosMetaAssignment.created_at.asc()
        )
        .limit(1)
    )


def count_active_assignments(
    db: Session,
    *,
    meta_profile_id: UUID,
) -> int:
    value = db.scalar(
        select(
            func.count(
                ArgosMetaAssignment.id
            )
        ).where(
            ArgosMetaAssignment.meta_profile_id
            == meta_profile_id,
            ArgosMetaAssignment.status.in_(
                ACTIVE_ASSIGNMENT_STATUSES
            ),
        )
    )

    return int(value or 0)


def reserve_first_available_profile(
    db: Session,
    *,
    operation_id: UUID,
) -> ArgosMetaAssignment:
    """
    Reserva atomicamente o primeiro perfil elegível.

    Não faz commit.
    O chamador controla a transação.
    """

    operation = db.scalar(
        select(ArgosOperation)
        .where(
            ArgosOperation.id
            == operation_id
        )
        .with_for_update()
    )

    if operation is None:
        raise ArgosOperationNotFound(
            "ARGOS_OPERATION_NOT_FOUND"
        )

    existing = get_active_assignment(
        db,
        operation_id=operation.id,
    )

    if existing is not None:
        return existing

    historical_ids = list(
        db.scalars(
            select(
                ArgosMetaAssignment.meta_profile_id
            ).where(
                ArgosMetaAssignment.operation_id
                == operation.id
            )
        ).all()
    )

    rejected_ids = list(historical_ids)

    while True:
        query = (
            select(ArgosMetaProfile)
            .where(
                ArgosMetaProfile.status
                == "available"
            )
            .order_by(
                ArgosMetaProfile.allocation_order.asc(),
                ArgosMetaProfile.created_at.asc(),
                ArgosMetaProfile.id.asc(),
            )
        )

        if rejected_ids:
            query = query.where(
                ~ArgosMetaProfile.id.in_(
                    rejected_ids
                )
            )

        profile = db.scalar(
            query
            .with_for_update(
                skip_locked=True
            )
            .limit(1)
        )

        if profile is None:
            raise ArgosMetaPoolExhausted(
                "ARGOS_META_PROFILE_POOL_EXHAUSTED"
            )

        active = count_active_assignments(
            db,
            meta_profile_id=profile.id,
        )

        if active >= profile.capacity:
            rejected_ids.append(
                profile.id
            )
            continue

        assignment = ArgosMetaAssignment(
            operation_id=operation.id,
            meta_profile_id=profile.id,
            status="reserved",
            reserved_at=datetime.now(
                timezone.utc
            ),
            login_completed_at=None,
            released_at=None,
            business_id=None,
            last_error=None,
        )

        db.add(assignment)
        db.flush()

        return assignment


def mark_login_pending(
    db: Session,
    *,
    assignment_id: UUID,
) -> ArgosMetaAssignment:
    assignment = db.get(
        ArgosMetaAssignment,
        assignment_id,
    )

    if assignment is None:
        raise ArgosMetaPoolError(
            "ARGOS_META_ASSIGNMENT_NOT_FOUND"
        )

    assignment.status = "login_pending"
    assignment.last_error = None

    db.flush()

    return assignment


def mark_login_completed(
    db: Session,
    *,
    assignment_id: UUID,
) -> ArgosMetaAssignment:
    assignment = db.get(
        ArgosMetaAssignment,
        assignment_id,
    )

    if assignment is None:
        raise ArgosMetaPoolError(
            "ARGOS_META_ASSIGNMENT_NOT_FOUND"
        )

    assignment.status = "assigned"
    assignment.login_completed_at = (
        datetime.now(timezone.utc)
    )
    assignment.last_error = None

    db.flush()

    return assignment


def mark_assignment_failed(
    db: Session,
    *,
    assignment_id: UUID,
    error: str,
) -> ArgosMetaAssignment:
    assignment = db.get(
        ArgosMetaAssignment,
        assignment_id,
    )

    if assignment is None:
        raise ArgosMetaPoolError(
            "ARGOS_META_ASSIGNMENT_NOT_FOUND"
        )

    assignment.status = "failed"
    assignment.last_error = (
        str(error or "")[:4000]
        or None
    )

    db.flush()

    return assignment


def get_meta_profile_payload(
    db: Session,
    *,
    profile_id: UUID,
) -> dict[str, Any]:
    profile = db.get(
        ArgosMetaProfile,
        profile_id,
    )

    if profile is None:
        raise ArgosMetaPoolError(
            "ARGOS_META_PROFILE_NOT_FOUND"
        )

    return deserialize_meta_payload(
        profile.encrypted_payload
    )


def safe_profile_dict(
    profile: ArgosMetaProfile,
) -> dict[str, Any]:
    suffix = None

    if profile.facebook_id:
        suffix = profile.facebook_id[-4:]

    return {
        "id": str(profile.id),
        "label": profile.label,
        "profile_ref": profile.profile_ref,
        "allocation_order": profile.allocation_order,
        "facebook_suffix": suffix,
        "status": profile.status,
        "capacity": profile.capacity,
    }
