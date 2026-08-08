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

