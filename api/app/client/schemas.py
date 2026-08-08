from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ClientProfileSummaryResponse(BaseModel):
    id: UUID
    name: str
    email: str


class ClientLicenseSummaryResponse(BaseModel):
    total: int
    active: int
    pending_activation: int
    expired: int
    suspended: int
    revoked: int


class ClientDeviceSummaryResponse(BaseModel):
    active: int
    inactive: int
    total: int
    total_limit: int


class ClientFinanceSummaryResponse(BaseModel):
    pending_amount: Decimal
    overdue_amount: Decimal
    pending_charges: int
    overdue_charges: int

    next_charge_id: UUID | None = None
    next_charge_number: str | None = None
    next_due_at: datetime | None = None
    next_due_amount: Decimal | None = None

    last_payment_id: UUID | None = None
    last_payment_number: str | None = None
    last_payment_amount: Decimal | None = None
    last_payment_at: datetime | None = None


class ClientRecentLicenseResponse(BaseModel):
    id: UUID
    license_number: str
    key_preview: str
    status: str
    product_id: UUID
    product_name: str
    product_slug: str
    product_version: str
    max_devices: int
    active_devices: int
    issued_at: datetime
    first_activated_at: datetime | None
    expires_at: datetime | None
    is_active: bool


class ClientRecentChargeResponse(BaseModel):
    id: UUID
    charge_number: str
    description: str
    amount: Decimal
    status: str
    payment_method: str | None
    due_at: datetime
    paid_at: datetime | None
    created_at: datetime

    product_id: UUID | None
    product_name: str | None

    license_id: UUID | None
    license_number: str | None


class ClientDashboardResponse(BaseModel):
    customer: ClientProfileSummaryResponse
    licenses: ClientLicenseSummaryResponse
    devices: ClientDeviceSummaryResponse
    finance: ClientFinanceSummaryResponse
    recent_licenses: list[ClientRecentLicenseResponse]
    recent_charges: list[ClientRecentChargeResponse]

class ClientLicenseListResponse(BaseModel):
    summary: ClientLicenseSummaryResponse
    items: list[ClientRecentLicenseResponse]

    total: int
    page: int
    page_size: int
    pages: int


class ClientDeviceItemResponse(BaseModel):
    id: UUID
    device_identifier: str
    name: str | None
    operating_system: str | None
    app_version: str | None
    ip_address: str | None
    last_ip_address: str | None
    activated_at: datetime
    last_validated_at: datetime | None
    is_active: bool

    license_id: UUID
    license_number: str
    license_status: str

    product_id: UUID
    product_name: str
    product_version: str


class ClientDeviceListResponse(BaseModel):
    summary: ClientDeviceSummaryResponse
    items: list[ClientDeviceItemResponse]

    total: int
    page: int
    page_size: int
    pages: int


class ClientDeviceStatusResponse(BaseModel):
    id: UUID
    is_active: bool
    message: str


class ClientDownloadSummaryResponse(BaseModel):
    total: int
    products: int
    platforms: int


class ClientDownloadItemResponse(BaseModel):
    id: UUID

    product_id: UUID
    product_name: str
    product_description: str | None

    version: str
    platform: str
    architecture: str | None

    file_name: str
    file_size_bytes: int | None
    checksum_sha256: str | None

    release_notes: str | None
    published_at: datetime


class ClientDownloadListResponse(BaseModel):
    summary: ClientDownloadSummaryResponse

    items: list[ClientDownloadItemResponse]

    total: int
    page: int
    page_size: int
    pages: int


class ClientDownloadAccessResponse(BaseModel):
    id: UUID
    file_name: str
    file_url: str



class ClientChargeSummaryResponse(BaseModel):
    total: int
    paid: int
    pending: int
    overdue: int
    cancelled: int
    refunded: int
    total_amount: Decimal


class ClientChargeItemResponse(BaseModel):
    id: UUID
    charge_number: str
    description: str
    amount: Decimal
    status: str
    payment_method: str | None

    due_at: datetime
    paid_at: datetime | None
    cancelled_at: datetime | None
    refunded_at: datetime | None

    external_reference: str | None
    notes: str | None

    product_id: UUID | None
    product_name: str | None

    license_id: UUID | None
    license_number: str | None

    created_at: datetime
    updated_at: datetime


class ClientChargeListResponse(BaseModel):
    summary: ClientChargeSummaryResponse
    items: list[ClientChargeItemResponse]

    total: int
    page: int
    page_size: int
    pages: int



class ClientProfileResponse(BaseModel):
    id: UUID
    name: str
    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ClientProfileUpdateRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
    )

    email: EmailStr


class ClientProfileUpdateResponse(BaseModel):
    success: bool
    message: str
    profile: ClientProfileResponse


class ClientPasswordUpdateRequest(BaseModel):
    current_password: str = Field(
        min_length=8,
        max_length=128,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


class ClientPasswordUpdateResponse(BaseModel):
    success: bool
    message: str



class ClientLicenseKeyResponse(BaseModel):
    license_id: UUID
    license_number: str
    license_key: str
