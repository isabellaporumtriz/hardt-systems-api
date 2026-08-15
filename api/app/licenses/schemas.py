from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class LicenseCreateRequest(BaseModel):
    user_id: UUID
    product_id: UUID

    duration_days: int = Field(
        default=30,
        ge=1,
        le=3650,
    )

    max_devices: int = Field(
        default=1,
        ge=1,
        le=100,
    )


class LicenseCreateResponse(BaseModel):
    id: UUID
    license_number: str
    license_key: str
    key_preview: str
    status: str
    duration_days: int
    max_devices: int
    issued_at: datetime
    first_activated_at: datetime | None
    expires_at: datetime | None
    is_active: bool


class LicenseResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    user_id: UUID
    product_id: UUID

    license_sequence: int
    license_number: str
    key_preview: str

    status: str
    duration_days: int
    max_devices: int

    issued_at: datetime
    first_activated_at: datetime | None
    expires_at: datetime | None

    is_active: bool


class LicenseStatusRequest(BaseModel):
    action: Literal[
        "suspend",
        "reactivate",
        "revoke",
    ]


class LicenseActivationRequest(BaseModel):
    license_key: str = Field(
        min_length=10,
        max_length=100,
    )

    device_id: str = Field(
        min_length=3,
        max_length=255,
    )

    fingerprint: str = Field(
        min_length=3,
        max_length=500,
    )


class LicenseActivationResponse(BaseModel):
    valid: bool
    activation_token: str
    license_number: str
    expires_at: datetime


class LicenseValidationRequest(BaseModel):
    activation_token: str = Field(
        min_length=20,
        max_length=500,
    )


class LicenseValidationResponse(BaseModel):
    valid: bool
    license_number: str
    device_id: str
    status: str
    expires_at: datetime
    last_validated_at: datetime

class LicenseTrialResponse(BaseModel):
    id: UUID
    license_number: str
    license_key: str
    key_preview: str
    status: str
    trial_days: int
    first_activated_at: datetime | None
    expires_at: datetime | None
