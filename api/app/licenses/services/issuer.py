from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.crypto import encrypt_license_key
from app.licenses.models import License
from app.licenses.repositories import LicenseRepository
from app.licenses.schemas import (
    LicenseCreateRequest,
    LicenseCreateResponse,
)
from app.licenses.services.generator import LicenseGenerator


class LicenseIssuanceError(Exception):
    pass


class LicenseIssuer:
    MAX_ATTEMPTS = 3

    def __init__(self, db: Session):
        self.db = db
        self.repository = LicenseRepository(db)
        self.generator = LicenseGenerator(db)

    def issue(
        self,
        data: LicenseCreateRequest,
        *,
        is_trial: bool = False,
    ) -> LicenseCreateResponse:
        for attempt in range(self.MAX_ATTEMPTS):
            sequence = self.generator.generate_sequence()
            license_number = self.generator.generate_number(sequence)
            license_key = self.generator.generate_key()
            key_hash = self.generator.generate_hash(license_key)
            key_preview = self.generator.generate_preview(license_key)

            license_record = License(
                user_id=data.user_id,
                product_id=data.product_id,
                license_sequence=sequence,
                license_number=license_number,
                key_hash=key_hash,
                key_preview=key_preview,
                encrypted_key=encrypt_license_key(
                    license_key
                ),
                status="pending_activation",
                duration_days=data.duration_days,
                max_devices=data.max_devices,
                issued_at=datetime.now(timezone.utc),
                first_activated_at=None,
                expires_at=None,
                is_active=True,
                is_trial=is_trial,
                trial_started_at=None,
            )

            try:
                created_license = self.repository.create(
                    license_record
                )
                self.db.commit()
                self.db.refresh(created_license)

                return LicenseCreateResponse(
                    id=created_license.id,
                    license_number=created_license.license_number,
                    license_key=license_key,
                    key_preview=created_license.key_preview,
                    status=created_license.status,
                    duration_days=created_license.duration_days,
                    max_devices=created_license.max_devices,
                    issued_at=created_license.issued_at,
                    first_activated_at=created_license.first_activated_at,
                    expires_at=created_license.expires_at,
                    is_active=created_license.is_active,
                )

            except IntegrityError as exc:
                self.db.rollback()

                if attempt == self.MAX_ATTEMPTS - 1:
                    raise LicenseIssuanceError(
                        "Não foi possível gerar uma sequência única para a licença."
                    ) from exc

            except Exception:
                self.db.rollback()
                raise

        raise LicenseIssuanceError(
            "Não foi possível emitir a licença."
        )
