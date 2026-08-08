from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.licenses.models import License


class LicenseRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        license_record: License,
    ) -> License:
        self.db.add(license_record)
        self.db.flush()
        self.db.refresh(license_record)

        return license_record

    def list_all(self) -> list[License]:
        result = self.db.scalars(
            select(License).order_by(
                License.issued_at.desc()
            )
        )

        return list(result.all())

    def get_by_id(
        self,
        license_id: UUID,
    ) -> License | None:
        return self.db.scalar(
            select(License).where(
                License.id == license_id
            )
        )

    def get_by_license_number(
        self,
        license_number: str,
    ) -> License | None:
        return self.db.scalar(
            select(License).where(
                License.license_number
                == license_number
            )
        )

    def get_by_key_hash(
        self,
        key_hash: str,
    ) -> License | None:
        return self.db.scalar(
            select(License).where(
                License.key_hash == key_hash
            )
        )

    def get_last_sequence(
        self,
    ) -> int | None:
        return self.db.scalar(
            select(
                func.max(
                    License.license_sequence
                )
            )
        )

    def save(
        self,
        license_record: License,
    ) -> License:
        self.db.add(license_record)
        self.db.flush()
        self.db.refresh(license_record)

        return license_record