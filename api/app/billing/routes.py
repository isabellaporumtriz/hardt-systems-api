from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
)
from app.billing.schemas import (
    MonthlyCheckoutRequest,
    MonthlyCheckoutResponse,
    OneTimeCheckoutRequest,
    OneTimeCheckoutResponse,
)
from app.billing.services import (
    create_monthly_checkout,
    create_one_time_checkout,
)
from app.core.database import get_db
from app.users.models import User


router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
)


@router.post(
    "/checkout",
    response_model=OneTimeCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def one_time_checkout(
    payload: OneTimeCheckoutRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> OneTimeCheckoutResponse:
    return await create_one_time_checkout(
        db,
        current_user,
        payload,
    )



@router.post(
    "/monthly-checkout",
    response_model=MonthlyCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def monthly_checkout(
    payload: MonthlyCheckoutRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
) -> MonthlyCheckoutResponse:
    return await create_monthly_checkout(
        db,
        current_user,
        payload,
    )
