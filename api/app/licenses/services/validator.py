import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.devices.models import Device
from app.devices.repositories import DeviceRepository
from app.licenses.models import License
from app.licenses.repositories import LicenseRepository
from app.licenses.schemas import (
    LicenseValidationRequest,
    LicenseValidationResponse,
)


class LicenseValidationError(Exception):
    pass


class InvalidActivationTokenError(LicenseValidationError):
    pass


class DeviceInactiveError(LicenseValidationError):
    pass


class LicenseUnavailableError(LicenseValidationError):
    pass


class LicenseValidator:
    def __init__(self, db: Session):
        self.db = db
        self.device_repository = DeviceRepository(db)
        self.license_repository = LicenseRepository(db)

    @staticmethod
    def _hash_activation_token(token: str) -> str:
        normalized_token = token.strip()

        return hashlib.sha256(
            normalized_token.encode("utf-8")
        ).hexdigest()

    def _get_device(
        self,
        activation_token: str,
    ) -> Device:
        token_hash = self._hash_activation_token(
            activation_token
        )

        device = (
            self.device_repository.get_by_activation_token_hash(
                token_hash
            )
        )

        if device is None:
            raise InvalidActivationTokenError(
                "Token de ativação inválido."
            )

        return device

    def _get_license(
        self,
        device: Device,
    ) -> License:
        license_record = self.license_repository.get_by_id(
            device.license_id
        )

        if license_record is None:
            raise LicenseUnavailableError(
                "A licença vinculada ao dispositivo não foi encontrada."
            )

        return license_record

    @staticmethod
    def _validate_device(
        device: Device,
    ) -> None:
        if not device.is_active:
            raise DeviceInactiveError(
                "Este dispositivo está desativado."
            )

    def _validate_license(
        self,
        license_record: License,
        now: datetime,
    ) -> None:
        if not license_record.is_active:
            raise LicenseUnavailableError(
                "Esta licença está inativa."
            )

        if license_record.status == "suspended":
            raise LicenseUnavailableError(
                "Esta licença está suspensa."
            )

        if license_record.status == "revoked":
            raise LicenseUnavailableError(
                "Esta licença foi revogada."
            )

        if license_record.expires_at is None:
            raise LicenseUnavailableError(
                "Esta licença ainda não possui uma ativação válida."
            )

        if license_record.expires_at <= now:
            license_record.status = "expired"

            raise LicenseUnavailableError(
                "Esta licença está expirada."
            )

        if license_record.status != "active":
            raise LicenseUnavailableError(
                "Esta licença não está disponível para uso."
            )

    def validate(
        self,
        data: LicenseValidationRequest,
    ) -> LicenseValidationResponse:
        now = datetime.now(timezone.utc)

        device = self._get_device(
            data.activation_token
        )

        license_record = self._get_license(device)

        try:
            self._validate_device(device)
            self._validate_license(
                license_record,
                now,
            )

            device.last_validated_at = now

            self.db.commit()
            self.db.refresh(device)
            self.db.refresh(license_record)

        except LicenseValidationError:
            self.db.commit()
            raise

        except Exception:
            self.db.rollback()
            raise

        if license_record.expires_at is None:
            raise LicenseUnavailableError(
                "A licença não possui data de expiração."
            )

        return LicenseValidationResponse(
            valid=True,
            license_number=license_record.license_number,
            device_id=device.device_identifier,
            status=license_record.status,
            expires_at=license_record.expires_at,
            last_validated_at=device.last_validated_at or now,
        )
