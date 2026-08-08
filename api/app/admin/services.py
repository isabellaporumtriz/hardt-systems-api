from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.admin import repositories
from app.core.security import (
    hash_password,
    verify_password,
)
from app.devices.models import Device
from app.licenses.models import License
from app.users.models import User


def get_license_or_404(
    db: Session,
    license_id: UUID,
) -> License:
    result = repositories.get_license_details(
        db,
        license_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licença não encontrada.",
        )

    license_record, _, _ = result
    return license_record


def get_admin_or_404(
    db: Session,
    admin_id: UUID,
) -> User:
    admin = repositories.get_admin_by_id(
        db,
        admin_id,
    )

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador não encontrado.",
        )

    return admin


def renew_license(
    db: Session,
    *,
    license_id: UUID,
    additional_days: int,
) -> License:
    license_record = get_license_or_404(
        db,
        license_id,
    )

    now = datetime.now(timezone.utc)

    license_record.duration_days += additional_days

    if license_record.first_activated_at is not None:
        renewal_base = now

        if (
            license_record.expires_at is not None
            and license_record.expires_at > now
        ):
            renewal_base = license_record.expires_at

        license_record.expires_at = (
            renewal_base
            + timedelta(days=additional_days)
        )

        license_record.status = "active"
    else:
        license_record.status = "pending_activation"

    license_record.is_active = True

    db.add(license_record)
    db.commit()
    db.refresh(license_record)

    return license_record


def suspend_license(
    db: Session,
    *,
    license_id: UUID,
) -> License:
    license_record = get_license_or_404(
        db,
        license_id,
    )

    if license_record.status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Uma licença revogada não pode ser suspensa."
            ),
        )

    license_record.status = "suspended"
    license_record.is_active = False

    db.add(license_record)
    db.commit()
    db.refresh(license_record)

    return license_record


def restore_license(
    db: Session,
    *,
    license_id: UUID,
) -> License:
    license_record = get_license_or_404(
        db,
        license_id,
    )

    now = datetime.now(timezone.utc)

    if (
        license_record.expires_at is not None
        and license_record.expires_at <= now
    ):
        license_record.status = "expired"
        license_record.is_active = False

        db.add(license_record)
        db.commit()
        db.refresh(license_record)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A licença está expirada. "
                "Renove-a antes de restaurar."
            ),
        )

    if license_record.first_activated_at is None:
        license_record.status = "pending_activation"
    else:
        license_record.status = "active"

    license_record.is_active = True

    db.add(license_record)
    db.commit()
    db.refresh(license_record)

    return license_record


def revoke_license(
    db: Session,
    *,
    license_id: UUID,
) -> License:
    license_record = get_license_or_404(
        db,
        license_id,
    )

    license_record.status = "revoked"
    license_record.is_active = False

    devices = repositories.list_license_devices(
        db,
        license_id,
    )

    for device in devices:
        device.is_active = False
        db.add(device)

    db.add(license_record)
    db.commit()
    db.refresh(license_record)

    return license_record


def remove_device(
    db: Session,
    *,
    device_id: UUID,
) -> Device:
    device = repositories.get_device_by_id(
        db,
        device_id,
    )

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo não encontrado.",
        )

    db.delete(device)
    db.commit()

    return device


def update_admin_profile(
    db: Session,
    *,
    admin_id: UUID,
    name: str,
    email: str,
) -> User:
    admin = get_admin_or_404(
        db,
        admin_id,
    )

    normalized_name = name.strip()
    normalized_email = email.strip().lower()

    if len(normalized_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O nome deve possuir pelo menos 2 caracteres.",
        )

    existing_user = (
        repositories.get_user_by_email_excluding_id(
            db,
            email=normalized_email,
            user_id=admin.id,
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Este e-mail já está sendo usado "
                "por outro usuário."
            ),
        )

    return repositories.update_admin_profile(
        db,
        admin=admin,
        name=normalized_name,
        email=normalized_email,
    )


def update_admin_password(
    db: Session,
    *,
    admin_id: UUID,
    current_password: str,
    new_password: str,
    confirm_password: str,
) -> None:
    admin = get_admin_or_404(
        db,
        admin_id,
    )

    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "A confirmação da nova senha "
                "não corresponde."
            ),
        )

    if not verify_password(
        current_password,
        admin.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha atual está incorreta.",
        )

    if current_password == new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A nova senha deve ser diferente "
                "da senha atual."
            ),
        )

    new_password_hash = hash_password(
        new_password,
    )

    repositories.update_admin_password(
        db,
        admin=admin,
        password_hash=new_password_hash,
    )