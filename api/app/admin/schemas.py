from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class AdminIdentityResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr


class AdminDashboardResponse(BaseModel):
    admin: AdminIdentityResponse

    total_users: int
    total_products: int
    total_licenses: int
    total_devices: int
    active_devices: int

    pending_activation_licenses: int
    active_licenses: int
    expired_licenses: int
    suspended_licenses: int
    revoked_licenses: int


class AdminLicenseDeviceResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    device_identifier: str
    name: str | None
    operating_system: str | None
    activated_at: datetime
    last_validated_at: datetime | None
    is_active: bool


class AdminLicenseListItemResponse(BaseModel):
    id: UUID
    license_number: str
    key_preview: str

    user_id: UUID
    user_name: str
    user_email: EmailStr

    product_id: UUID
    product_name: str
    product_slug: str

    status: str
    duration_days: int
    max_devices: int
    active_devices: int

    issued_at: datetime
    first_activated_at: datetime | None
    expires_at: datetime | None
    is_active: bool


class AdminLicenseDetailResponse(
    AdminLicenseListItemResponse
):
    devices: list[AdminLicenseDeviceResponse]


class AdminDeviceListItemResponse(BaseModel):
    id: UUID

    license_id: UUID
    license_number: str

    user_id: UUID
    user_name: str
    user_email: EmailStr

    product_id: UUID
    product_name: str
    product_slug: str

    device_identifier: str
    name: str | None
    operating_system: str | None

    activated_at: datetime
    last_validated_at: datetime | None

    is_active: bool


class LicenseRenewRequest(BaseModel):
    additional_days: int = Field(
        default=30,
        ge=1,
        le=3650,
    )


class LicenseActionResponse(BaseModel):
    success: bool
    message: str
    license_id: UUID
    license_number: str
    status: str
    expires_at: datetime | None


class DeviceRemovalResponse(BaseModel):
    success: bool
    message: str
    device_id: UUID
    license_id: UUID


class AdminSystemInformationResponse(BaseModel):
    app_name: str
    app_version: str
    environment: str
    debug: bool
    access_token_expire_minutes: int
    api_status: str


class AdminSettingsResponse(BaseModel):
    admin_id: UUID
    name: str
    email: EmailStr
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    system: AdminSystemInformationResponse


class AdminProfileUpdateRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
    )

    email: EmailStr


class AdminProfileUpdateResponse(BaseModel):
    success: bool
    message: str

    admin_id: UUID
    name: str
    email: EmailStr
    updated_at: datetime


class AdminPasswordUpdateRequest(BaseModel):
    current_password: str = Field(
        min_length=8,
        max_length=128,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        min_length=8,
        max_length=128,
    )


class AdminPasswordUpdateResponse(BaseModel):
    success: bool
    message: str