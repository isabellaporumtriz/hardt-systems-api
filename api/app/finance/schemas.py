from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class ChargeCreateRequest(BaseModel):
    user_id: UUID

    product_id: UUID | None = None
    license_id: UUID | None = None

    description: str = Field(
        min_length=2,
        max_length=255,
    )

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    due_at: datetime

    payment_method: str | None = Field(
        default=None,
        max_length=50,
    )

    external_reference: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = None


class ChargeUpdateRequest(BaseModel):
    description: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    due_at: datetime | None = None

    payment_method: str | None = Field(
        default=None,
        max_length=50,
    )

    external_reference: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = None


class ChargeStatusUpdateRequest(BaseModel):
    status: str = Field(
        min_length=2,
        max_length=30,
    )

    payment_method: str | None = Field(
        default=None,
        max_length=50,
    )

    paid_at: datetime | None = None

    notes: str | None = None


class ChargeListItemResponse(BaseModel):
    id: UUID
    charge_number: str

    user_id: UUID
    user_name: str
    user_email: str

    product_id: UUID | None
    product_name: str | None
    product_slug: str | None

    license_id: UUID | None
    license_number: str | None

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

    created_at: datetime
    updated_at: datetime


class ChargeDetailResponse(
    ChargeListItemResponse
):
    pass


class ChargeCreateResponse(BaseModel):
    success: bool
    message: str
    charge: ChargeDetailResponse


class ChargeUpdateResponse(BaseModel):
    success: bool
    message: str
    charge: ChargeDetailResponse


class ChargeStatusUpdateResponse(BaseModel):
    success: bool
    message: str

    charge_id: UUID
    charge_number: str
    status: str

    paid_at: datetime | None
    cancelled_at: datetime | None
    refunded_at: datetime | None
    updated_at: datetime


class FinancialSummaryResponse(BaseModel):
    total_charges: int

    total_revenue: Decimal
    total_pending: Decimal
    total_overdue: Decimal
    total_cancelled: Decimal
    total_refunded: Decimal

    revenue_today: Decimal
    revenue_current_month: Decimal
    average_ticket: Decimal

    paid_charges: int
    pending_charges: int
    overdue_charges: int
    cancelled_charges: int
    refunded_charges: int

    payments_current_month: int
    paying_customers: int


class MonthlyRevenueItemResponse(BaseModel):
    month: str
    label: str
    revenue: Decimal
    payments: int


class UpcomingChargeItemResponse(BaseModel):
    id: UUID
    charge_number: str

    user_id: UUID
    user_name: str
    user_email: str

    product_id: UUID | None
    product_name: str | None

    license_id: UUID | None
    license_number: str | None

    description: str
    amount: Decimal
    status: str
    due_at: datetime

    days_until_due: int


class FinancialDashboardResponse(BaseModel):
    summary: FinancialSummaryResponse
    monthly_revenue: list[
        MonthlyRevenueItemResponse
    ]
    upcoming_charges: list[
        UpcomingChargeItemResponse
    ]
    recent_charges: list[
        ChargeListItemResponse
    ]


class ChargeModelResponse(BaseModel):
    id: UUID
    user_id: UUID
    product_id: UUID | None
    license_id: UUID | None

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

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )