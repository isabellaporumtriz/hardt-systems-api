from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_client,
)
from app.client import services
from app.client.schemas import (
    ClientChargeListResponse,
    ClientDashboardResponse,
    ClientDownloadAccessResponse,
    ClientDownloadListResponse,
    ClientDeviceListResponse,
    ClientDeviceStatusResponse,
    ClientLicenseKeyResponse,
    ClientLicenseListResponse,
    ClientPasswordUpdateRequest,
    ClientPasswordUpdateResponse,
    ClientProfileResponse,
    ClientProfileUpdateRequest,
    ClientProfileUpdateResponse,
)
from app.core.database import get_db
from app.users.models import User


router = APIRouter(
    prefix="/client",
    tags=["Client Portal"],
)


@router.get(
    "/dashboard",
    response_model=ClientDashboardResponse,
)
def get_client_dashboard(
    recent_limit: int = Query(
        default=5,
        ge=1,
        le=20,
    ),
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientDashboardResponse:
    return services.get_client_dashboard(
        db,
        current_user,
        recent_limit=recent_limit,
    )

@router.get(
    "/licenses",
    response_model=ClientLicenseListResponse,
)
def get_client_licenses(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    status: str | None = Query(
        default=None,
        pattern=(
            "^(active|pending_activation|"
            "expired|suspended|revoked)$"
        ),
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientLicenseListResponse:
    return services.get_client_licenses(
        db,
        current_user,
        page=page,
        page_size=page_size,
        status=status,
        search=search,
    )


@router.get(
    "/devices",
    response_model=ClientDeviceListResponse,
)
def get_client_devices(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    is_active: bool | None = Query(
        default=None,
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientDeviceListResponse:
    return services.get_client_devices(
        db,
        current_user,
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
    )


@router.patch(
    "/devices/{device_id}/deactivate",
    response_model=ClientDeviceStatusResponse,
)
def deactivate_client_device(
    device_id: UUID,
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientDeviceStatusResponse:
    return services.deactivate_client_device(
        db,
        current_user,
        device_id,
    )


@router.get(
    "/downloads",
    response_model=ClientDownloadListResponse,
)
def get_client_downloads(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=12,
        ge=1,
        le=100,
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    platform: str | None = Query(
        default=None,
        min_length=1,
        max_length=40,
    ),
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientDownloadListResponse:
    return services.get_client_downloads(
        db,
        current_user,
        page=page,
        page_size=page_size,
        search=search,
        platform=platform,
    )


@router.get(
    "/downloads/{download_id}/access",
    response_model=ClientDownloadAccessResponse,
)
def get_client_download_access(
    download_id: UUID,
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientDownloadAccessResponse:
    return services.get_client_download_access(
        db,
        current_user,
        download_id,
    )



@router.get(
    "/charges",
    response_model=ClientChargeListResponse,
)
def get_client_charges(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    charge_status: str | None = Query(
        default=None,
        alias="status",
        pattern=(
            "^(pending|paid|overdue|"
            "cancelled|refunded)$"
        ),
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientChargeListResponse:
    return services.get_client_charges(
        db,
        current_user,
        page=page,
        page_size=page_size,
        charge_status=charge_status,
        search=search,
    )



@router.get(
    "/profile",
    response_model=ClientProfileResponse,
)
def get_client_profile(
    current_user: User = Depends(
        get_current_client,
    ),
) -> ClientProfileResponse:
    return services.get_client_profile(
        current_user,
    )


@router.patch(
    "/profile",
    response_model=ClientProfileUpdateResponse,
)
def update_client_profile(
    payload: ClientProfileUpdateRequest,
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientProfileUpdateResponse:
    return services.update_client_profile(
        db,
        current_user,
        payload,
    )


@router.patch(
    "/profile/password",
    response_model=ClientPasswordUpdateResponse,
)
def update_client_password(
    payload: ClientPasswordUpdateRequest,
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientPasswordUpdateResponse:
    return services.update_client_password(
        db,
        current_user,
        payload,
    )



@router.get(
    "/licenses/{license_id}/key",
    response_model=ClientLicenseKeyResponse,
)
def get_client_license_key(
    license_id: UUID,
    current_user: User = Depends(
        get_current_client,
    ),
    db: Session = Depends(get_db),
) -> ClientLicenseKeyResponse:
    return services.get_client_license_key(
        db,
        current_user,
        license_id,
    )
