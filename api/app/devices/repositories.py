from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.devices.models import Device


class DeviceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, device: Device) -> Device:
        self.db.add(device)
        self.db.flush()
        self.db.refresh(device)
        return device

    def get_by_license_and_identifier(
        self,
        license_id: UUID,
        device_identifier: str,
    ) -> Device | None:
        return self.db.scalar(
            select(Device).where(
                Device.license_id == license_id,
                Device.device_identifier == device_identifier,
            )
        )

    def get_by_activation_token_hash(
        self,
        activation_token_hash: str,
    ) -> Device | None:
        return self.db.scalar(
            select(Device).where(
                Device.activation_token_hash == activation_token_hash
            )
        )

    def count_active_by_license(
        self,
        license_id: UUID,
    ) -> int:
        count = self.db.scalar(
            select(func.count(Device.id)).where(
                Device.license_id == license_id,
                Device.is_active.is_(True),
            )
        )

        return int(count or 0)
