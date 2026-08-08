from __future__ import annotations

from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

from app.asaas.client import (
    AsaasError,
    asaas_client,
)

from app.core.config import settings


router = APIRouter(
    prefix="/asaas",
    tags=["Asaas"],
)


@router.get(
    "/health",
)
async def asaas_health() -> dict[str, object]:
    try:
        account = await asaas_client.get(
            "/myAccount/commercialInfo/",
        )
    except AsaasError as exc:
        raise HTTPException(
            status_code=(
                exc.status_code
                or status.HTTP_502_BAD_GATEWAY
            ),
            detail={
                "message": str(exc),
                "asaas": exc.response_data,
            },
        ) from exc

    return {
        "connected": True,
        "environment": settings.asaas_environment,
        "account": {
            "personType": account.get(
                "personType"
            ),
            "email": account.get("email"),
            "companyName": account.get(
                "companyName"
            ),
        },
    }
