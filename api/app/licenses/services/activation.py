import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.devices.models import Device
from app.devices.repositories import DeviceRepository
from app.licenses.models import License
from app.licenses.repositories import LicenseRepository
from app.licenses.schemas import (
    LicenseActivationRequest,
    LicenseActivationResponse,
)
from app.licenses.services.generator import LicenseGenerator


class LicenseActivationError(Exception):
    pass


class LicenseNotFoundError(LicenseActivationError):
    pass


class LicenseForbiddenError(LicenseActivationError):
    pass


class DeviceLimitError(LicenseActivationError):
    pass


class LicenseActivator:
    def __init__(self, db: Session):
        self.db = db
        self.license_repository = LicenseRepository(db)
        self.device_repository = DeviceRepository(db)

    @staticmethod
    def _generate_activation_token() -> str:
        return secrets.token_urlsafe(48)

    @staticmethod
    def _hash_activation_token(token: str) -> str:
        return hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()

    def _get_license(
        self,
        license_key: str,
    ) -> License:
        key_hash = LicenseGenerator.generate_hash(license_key)

        license_record = self.license_repository.get_by_key_hash(
            key_hash
        )

        if license_record is None:
            raise LicenseNotFoundError(
                "Chave de licença inválida."
            )

        return license_record

    @staticmethod
    def _validate_license(
        license_record: License,
        now: datetime,
    ) -> None:
        if not license_record.is_active:
            raise LicenseForbiddenError(
                "Esta licença está inativa."
            )

        if license_record.status in {
            "suspended",
            "revoked",
            "expired",
        }:
            raise LicenseForbiddenError(
                f"Esta licença está {license_record.status}."
            )

        if (
            license_record.expires_at is not None
            and license_record.expires_at <= now
        ):
            raise LicenseForbiddenError(
                "Esta licença está expirada."
            )

    def activate(
        self,
        data: LicenseActivationRequest,
    ) -> LicenseActivationResponse:
        now = datetime.now(timezone.utc)

        license_record = self._get_license(
            data.license_key
        )

        self._validate_license(
            license_record,
            now,
        )

        existing_device = (
            self.device_repository.get_by_license_and_identifier(
                license_record.id,
                data.device_id,
            )
        )

        activation_token = self._generate_activation_token()
        activation_token_hash = self._hash_activation_token(
            activation_token
        )

        if license_record.first_activated_at is None:
            license_record.first_activated_at = now
            license_record.expires_at = now + timedelta(
                days=license_record.duration_days
            )
            license_record.status = "active"

        if existing_device is not None:
            existing_device.fingerprint = {
                "value": data.fingerprint
            }
            existing_device.activation_token_hash = (
                activation_token_hash
            )
            existing_device.last_validated_at = now
            existing_device.is_active = True

        else:
            active_devices = (
                self.device_repository.count_active_by_license(
                    license_record.id
                )
            )

            if active_devices >= license_record.max_devices:
                self.db.rollback()

                raise DeviceLimitError(
                    "O limite de dispositivos desta licença foi atingido."
                )

            device = Device(
                license_id=license_record.id,
                device_identifier=data.device_id,
                name=None,
                operating_system=None,
                fingerprint={
                    "value": data.fingerprint
                },
                activation_token_hash=activation_token_hash,
                activated_at=now,
                last_validated_at=now,
                is_active=True,
            )

            self.device_repository.create(device)

        try:
            self.db.commit()

        except IntegrityError as exc:
            self.db.rollback()

            raise LicenseActivationError(
                "Não foi possível registrar o dispositivo."
            ) from exc

        except Exception:
            self.db.rollback()
            raise

        if license_record.expires_at is None:
            raise LicenseActivationError(
                "A licença não possui uma data de expiração válida."
            )

        return LicenseActivationResponse(
            valid=True,
            activation_token=activation_token,
            license_number=license_record.license_number,
            expires_at=license_record.expires_at,
        )
