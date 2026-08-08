from __future__ import annotations

import secrets
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.asaas.webhook_service import (
    process_webhook,
)
from app.core.config import settings
from app.core.database import get_db


router = APIRouter(
    prefix="/webhooks/asaas",
    tags=["Asaas Webhook"],
)


@router.post(
    "",
    status_code=status.HTTP_200_OK,
)
def receive_asaas_webhook(
    payload: dict[str, Any],
    asaas_access_token: str | None = Header(
        default=None,
        alias="asaas-access-token",
    ),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    print("===== WEBHOOK ASAAS RECEBIDO =====")
    print(payload)
    print("===================================")

    expected_token = (
        settings.asaas_webhook_token
    )

    if (
        not asaas_access_token
        or not expected_token
        or not secrets.compare_digest(
            asaas_access_token,
            expected_token,
        )
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Token do webhook inválido.",
        )

    try:
        return process_webhook(
            db,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=str(exc),
        ) from exc
