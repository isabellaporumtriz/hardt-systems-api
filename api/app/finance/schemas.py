from datetime import date, datetime
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


class ManualFinancialEntryCreateRequest(BaseModel):
    entry_type: str = Field(
        pattern=r"^(income|expense)$",
    )

    business_unit: str = Field(
        pattern=r"^(hardt_api|hardt_studio|hardt_systems|corporate)$",
    )

    nature: str = Field(
        pattern=r"^(revenue|direct_cost|operating_expense|other)$",
    )

    category: str = Field(
        min_length=2,
        max_length=80,
    )

    product_id: UUID | None = None
    user_id: UUID | None = None

    counterparty: str | None = Field(
        default=None,
        max_length=160,
    )

    description: str = Field(
        min_length=2,
        max_length=255,
    )

    amount: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=2,
    )

    payment_method: str | None = Field(
        default=None,
        max_length=50,
    )

    status: str = Field(
        default="settled",
        pattern=r"^(pending|settled|cancelled)$",
    )

    occurred_at: datetime
    settled_at: datetime | None = None

    external_reference: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = Field(
        default=None,
        max_length=4000,
    )


class ManualFinancialEntryUpdateRequest(BaseModel):
    entry_type: str | None = Field(
        default=None,
        pattern=r"^(income|expense)$",
    )

    business_unit: str | None = Field(
        default=None,
        pattern=r"^(hardt_api|hardt_studio|hardt_systems|corporate)$",
    )

    nature: str | None = Field(
        default=None,
        pattern=r"^(revenue|direct_cost|operating_expense|other)$",
    )

    category: str | None = Field(
        default=None,
        min_length=2,
        max_length=80,
    )

    product_id: UUID | None = None
    user_id: UUID | None = None

    counterparty: str | None = Field(
        default=None,
        max_length=160,
    )

    description: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=14,
        decimal_places=2,
    )

    payment_method: str | None = Field(
        default=None,
        max_length=50,
    )

    status: str | None = Field(
        default=None,
        pattern=r"^(pending|settled|cancelled)$",
    )

    occurred_at: datetime | None = None
    settled_at: datetime | None = None

    external_reference: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = Field(
        default=None,
        max_length=4000,
    )


class ManualFinancialEntryResponse(BaseModel):
    id: UUID

    entry_type: str
    business_unit: str
    nature: str
    category: str

    product_id: UUID | None
    user_id: UUID | None

    counterparty: str | None
    description: str
    amount: Decimal
    payment_method: str | None

    status: str

    occurred_at: datetime
    settled_at: datetime | None

    external_reference: str | None
    notes: str | None

    created_by_user_id: UUID

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class FinancialManagementUnitResponse(BaseModel):
    business_unit: str

    charge_revenue: Decimal
    purchase_revenue: Decimal
    manual_revenue: Decimal
    total_revenue: Decimal

    sms_provider_cost: Decimal
    smm_provider_cost: Decimal
    manual_direct_cost: Decimal
    direct_costs: Decimal

    gross_profit: Decimal
    gross_margin_percent: Decimal

    operating_expenses: Decimal
    other_expenses: Decimal

    net_result: Decimal
    net_margin_percent: Decimal

    revenue_share_percent: Decimal


class FinancialManagementSummaryResponse(BaseModel):
    start_at: datetime | None
    end_at: datetime | None

    charge_revenue: Decimal
    purchase_revenue: Decimal
    manual_revenue: Decimal
    total_revenue: Decimal

    sms_provider_cost: Decimal
    smm_provider_cost: Decimal
    manual_direct_cost: Decimal
    direct_costs: Decimal

    gross_profit: Decimal
    gross_margin_percent: Decimal

    operating_expenses: Decimal
    other_expenses: Decimal

    net_result: Decimal
    net_margin_percent: Decimal

    units: list[
        FinancialManagementUnitResponse
    ]


class FinancialProductPerformanceItemResponse(BaseModel):
    product_id: UUID | None
    product_name: str
    product_slug: str | None
    business_unit: str

    charge_count: int
    purchase_count: int
    manual_income_count: int
    total_sales_count: int

    charge_revenue: Decimal
    purchase_revenue: Decimal
    manual_revenue: Decimal
    total_revenue: Decimal

    sms_provider_cost: Decimal
    smm_provider_cost: Decimal
    manual_direct_cost: Decimal
    direct_costs: Decimal

    gross_profit: Decimal
    gross_margin_percent: Decimal

    operating_expenses: Decimal
    other_expenses: Decimal

    net_result: Decimal
    net_margin_percent: Decimal

    revenue_share_percent: Decimal


class FinancialProductPerformanceSummaryResponse(BaseModel):
    start_at: datetime | None
    end_at: datetime | None

    total_revenue: Decimal
    direct_costs: Decimal
    gross_profit: Decimal
    operating_expenses: Decimal
    other_expenses: Decimal
    net_result: Decimal

    products: list[
        FinancialProductPerformanceItemResponse
    ]


class FinancialCashFlowUnitResponse(BaseModel):
    business_unit: str

    charge_inflows: Decimal
    manual_inflows: Decimal
    attributable_inflows: Decimal

    charge_refund_outflows: Decimal
    manual_outflows: Decimal
    attributable_outflows: Decimal

    net_attributable_cash_flow: Decimal


class FinancialCashFlowSummaryResponse(BaseModel):
    start_at: datetime | None
    end_at: datetime | None

    charge_inflow_count: int
    charge_inflows: Decimal

    wallet_topup_count: int
    wallet_topup_inflows: Decimal

    manual_inflow_count: int
    manual_inflows: Decimal

    total_inflows: Decimal

    charge_refund_count: int
    charge_refund_outflows: Decimal

    manual_outflow_count: int
    manual_outflows: Decimal

    total_outflows: Decimal

    net_cash_flow: Decimal

    unallocated_wallet_inflows: Decimal

    units: list[
        FinancialCashFlowUnitResponse
    ]


class FinancialTimeSeriesPointResponse(BaseModel):
    period_start: date

    charge_revenue: Decimal
    purchase_revenue: Decimal
    manual_revenue: Decimal
    total_revenue: Decimal

    sms_provider_cost: Decimal
    smm_provider_cost: Decimal
    manual_direct_cost: Decimal
    direct_costs: Decimal

    operating_expenses: Decimal
    other_expenses: Decimal

    gross_profit: Decimal
    net_result: Decimal

    charge_inflows: Decimal
    wallet_topup_inflows: Decimal
    manual_inflows: Decimal
    total_inflows: Decimal

    charge_refund_outflows: Decimal
    manual_outflows: Decimal
    total_outflows: Decimal

    net_cash_flow: Decimal


class FinancialTimeSeriesResponse(BaseModel):
    granularity: str
    timezone: str

    business_unit: str | None

    start_at: datetime | None
    end_at: datetime | None

    points: list[
        FinancialTimeSeriesPointResponse
    ]


class FinancialLedgerItemResponse(BaseModel):
    source_type: str
    source_id: UUID

    source_label: str

    business_unit: str | None

    product_id: UUID | None
    product_name: str | None

    direction: str
    impact: str

    description: str
    amount: Decimal

    status: str

    occurred_at: datetime

    is_manual: bool


class FinancialExclusionActionResponse(BaseModel):
    source_type: str
    source_id: UUID

    excluded: bool
