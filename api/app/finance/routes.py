from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.billing.schemas import (
    AdminMonthlyCheckoutRequest,
    AdminMonthlyCheckoutResponse,
)
from app.billing.services import (
    create_admin_monthly_checkout,
)
from app.core.database import get_db
from app.finance import services
from app.finance import product_analytics
from app.finance import cash_flow
from app.finance import time_series
from app.users.models import User
from app.finance.schemas import (
    ChargeCreateRequest,
    ChargeCreateResponse,
    ChargeDetailResponse,
    ChargeListItemResponse,
    ChargeStatusUpdateRequest,
    ChargeStatusUpdateResponse,
    ChargeUpdateRequest,
    ChargeUpdateResponse,
    FinancialDashboardResponse,
    FinancialSummaryResponse,
    ManualFinancialEntryCreateRequest,
    ManualFinancialEntryResponse,
    ManualFinancialEntryUpdateRequest,
    FinancialManagementSummaryResponse,
    FinancialProductPerformanceSummaryResponse,
    FinancialCashFlowSummaryResponse,
    FinancialTimeSeriesResponse,
)


from app.finance import financial_ledger
from app.finance.schemas import (
    FinancialExclusionActionResponse,
    FinancialLedgerItemResponse,
)

router = APIRouter(
    prefix="/admin/finance",
    tags=["Admin Finance"],
    dependencies=[
        Depends(get_current_admin),
    ],
)


@router.get(
    "/dashboard",
    response_model=FinancialDashboardResponse,
)
def get_financial_dashboard(
    recent_limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
    db: Session = Depends(get_db),
) -> FinancialDashboardResponse:
    return services.get_financial_dashboard(
        db,
        recent_limit=recent_limit,
    )


@router.get(
    "/summary",
    response_model=FinancialSummaryResponse,
)
def get_financial_summary(
    db: Session = Depends(get_db),
) -> FinancialSummaryResponse:
    return services.get_financial_summary(
        db,
    )


@router.get(
    "/charges",
    response_model=list[ChargeListItemResponse],
)
def list_charges(
    charge_status: str | None = Query(
        default=None,
        alias="status",
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=255,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    db: Session = Depends(get_db),
) -> list[ChargeListItemResponse]:
    return services.list_charges(
        db,
        charge_status=charge_status,
        search=search,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/charges",
    response_model=ChargeCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_charge(
    payload: ChargeCreateRequest,
    db: Session = Depends(get_db),
) -> ChargeCreateResponse:
    charge = services.create_charge(
        db,
        payload,
    )

    return ChargeCreateResponse(
        success=True,
        message="Cobrança criada com sucesso.",
        charge=charge,
    )


@router.get(
    "/charges/{charge_id}",
    response_model=ChargeDetailResponse,
)
def get_charge(
    charge_id: UUID,
    db: Session = Depends(get_db),
) -> ChargeDetailResponse:
    return services.get_charge_details(
        db,
        charge_id,
    )


@router.patch(
    "/charges/{charge_id}",
    response_model=ChargeUpdateResponse,
)
def update_charge(
    charge_id: UUID,
    payload: ChargeUpdateRequest,
    db: Session = Depends(get_db),
) -> ChargeUpdateResponse:
    charge = services.update_charge(
        db,
        charge_id,
        payload,
    )

    return ChargeUpdateResponse(
        success=True,
        message="Cobrança atualizada com sucesso.",
        charge=charge,
    )


@router.patch(
    "/charges/{charge_id}/status",
    response_model=ChargeStatusUpdateResponse,
)
def update_charge_status(
    charge_id: UUID,
    payload: ChargeStatusUpdateRequest,
    db: Session = Depends(get_db),
) -> ChargeStatusUpdateResponse:
    return services.update_charge_status(
        db,
        charge_id,
        payload,
    )

@router.post(
    "/asaas/monthly-checkout",
    response_model=AdminMonthlyCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_asaas_monthly_checkout(
    payload: AdminMonthlyCheckoutRequest,
    db: Session = Depends(get_db),
) -> AdminMonthlyCheckoutResponse:
    return await create_admin_monthly_checkout(
        db,
        payload,
    )


@router.get(
    "/manual-entries",
    response_model=list[
        ManualFinancialEntryResponse
    ],
)
def list_manual_financial_entries(
    entry_type: str | None = Query(
        default=None,
        pattern=r"^(income|expense)$",
    ),
    business_unit: str | None = Query(
        default=None,
        pattern=(
            r"^(hardt_api|hardt_studio|"
            r"hardt_systems|corporate)$"
        ),
    ),
    nature: str | None = Query(
        default=None,
        pattern=(
            r"^(revenue|direct_cost|"
            r"operating_expense|other)$"
        ),
    ),
    entry_status: str | None = Query(
        default=None,
        alias="status",
        pattern=r"^(pending|settled|cancelled)$",
    ),
    product_id: UUID | None = Query(
        default=None,
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=255,
    ),
    start_at: datetime | None = Query(
        default=None,
    ),
    end_at: datetime | None = Query(
        default=None,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    db: Session = Depends(get_db),
) -> list[ManualFinancialEntryResponse]:
    return services.list_manual_financial_entries(
        db,
        entry_type=entry_type,
        business_unit=business_unit,
        nature=nature,
        entry_status=entry_status,
        product_id=product_id,
        search=search,
        start_at=start_at,
        end_at=end_at,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/manual-entries",
    response_model=ManualFinancialEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_manual_financial_entry(
    payload: ManualFinancialEntryCreateRequest,
    current_admin: User = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
) -> ManualFinancialEntryResponse:
    return services.create_manual_financial_entry(
        db,
        payload,
        created_by_user_id=current_admin.id,
    )


@router.get(
    "/manual-entries/{entry_id}",
    response_model=ManualFinancialEntryResponse,
)
def get_manual_financial_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
) -> ManualFinancialEntryResponse:
    return services.get_manual_financial_entry_or_404(
        db,
        entry_id,
    )


@router.patch(
    "/manual-entries/{entry_id}",
    response_model=ManualFinancialEntryResponse,
)
def update_manual_financial_entry(
    entry_id: UUID,
    payload: ManualFinancialEntryUpdateRequest,
    db: Session = Depends(get_db),
) -> ManualFinancialEntryResponse:
    return services.update_manual_financial_entry(
        db,
        entry_id,
        payload,
    )


@router.post(
    "/manual-entries/{entry_id}/cancel",
    response_model=ManualFinancialEntryResponse,
)
def cancel_manual_financial_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
) -> ManualFinancialEntryResponse:
    return services.cancel_manual_financial_entry(
        db,
        entry_id,
    )


@router.get(
    "/management-summary",
    response_model=FinancialManagementSummaryResponse,
)
def get_financial_management_summary(
    start_at: datetime | None = Query(
        default=None,
    ),
    end_at: datetime | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
) -> FinancialManagementSummaryResponse:
    return services.get_financial_management_summary(
        db,
        start_at=start_at,
        end_at=end_at,
    )


@router.get(
    "/product-performance",
    response_model=FinancialProductPerformanceSummaryResponse,
)
def get_product_financial_performance(
    start_at: datetime | None = Query(
        default=None,
    ),
    end_at: datetime | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
) -> FinancialProductPerformanceSummaryResponse:
    return product_analytics.get_product_financial_performance(
        db,
        start_at=start_at,
        end_at=end_at,
    )


@router.get(
    "/cash-flow",
    response_model=FinancialCashFlowSummaryResponse,
)
def get_financial_cash_flow(
    start_at: datetime | None = Query(
        default=None,
    ),
    end_at: datetime | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
) -> FinancialCashFlowSummaryResponse:
    return cash_flow.get_financial_cash_flow(
        db,
        start_at=start_at,
        end_at=end_at,
    )


@router.get(
    "/time-series",
    response_model=FinancialTimeSeriesResponse,
)
def get_financial_time_series(
    granularity: str = Query(
        default="day",
        pattern=r"^(day|month)$",
    ),
    business_unit: str | None = Query(
        default=None,
        pattern=(
            r"^(hardt_api|hardt_studio|"
            r"hardt_systems|corporate)$"
        ),
    ),
    start_at: datetime | None = Query(
        default=None,
    ),
    end_at: datetime | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
) -> FinancialTimeSeriesResponse:
    return time_series.get_financial_time_series(
        db,
        granularity=granularity,
        business_unit=business_unit,
        start_at=start_at,
        end_at=end_at,
    )


@router.get(
    "/ledger",
    response_model=list[
        FinancialLedgerItemResponse
    ],
)
def get_financial_ledger(
    business_unit: str | None = Query(
        default=None,
        pattern=(
            r"^(hardt_api|hardt_studio|"
            r"hardt_systems|corporate)$"
        ),
    ),
    start_at: datetime | None = Query(
        default=None,
    ),
    end_at: datetime | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
) -> list[FinancialLedgerItemResponse]:
    return financial_ledger.list_financial_ledger(
        db,
        business_unit=business_unit,
        start_at=start_at,
        end_at=end_at,
    )


@router.post(
    "/ledger/{source_type}/{source_id}/exclude",
    response_model=FinancialExclusionActionResponse,
)
def exclude_financial_ledger_source(
    source_type: str,
    source_id: UUID,
    current_admin: User = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
) -> FinancialExclusionActionResponse:
    return financial_ledger.exclude_financial_source(
        db,
        source_type=source_type,
        source_id=source_id,
        excluded_by_user_id=current_admin.id,
    )
