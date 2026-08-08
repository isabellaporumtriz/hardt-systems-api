from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.admin import repositories, services
from app.admin.schemas import (
    AdminDashboardResponse,
    AdminDeviceListItemResponse,
    AdminIdentityResponse,
    AdminLicenseDetailResponse,
    AdminLicenseDeviceResponse,
    AdminLicenseListItemResponse,
    AdminPasswordUpdateRequest,
    AdminPasswordUpdateResponse,
    AdminProfileUpdateRequest,
    AdminProfileUpdateResponse,
    AdminSettingsResponse,
    AdminSystemInformationResponse,
    DeviceRemovalResponse,
    LicenseActionResponse,
    LicenseRenewRequest,
)
from app.auth.dependencies import get_current_admin
from app.core.config import settings
from app.core.database import get_db
from app.users import repositories as user_repositories
from app.users.models import User
from app.users.schemas import UserResponse


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def build_license_item(
    db: Session,
    *,
    license_record,
    user,
    product,
) -> AdminLicenseListItemResponse:
    return AdminLicenseListItemResponse(
        id=license_record.id,
        license_number=license_record.license_number,
        key_preview=license_record.key_preview,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        status=license_record.status,
        duration_days=license_record.duration_days,
        max_devices=license_record.max_devices,
        active_devices=(
            repositories.count_active_devices_for_license(
                db,
                license_record.id,
            )
        ),
        issued_at=license_record.issued_at,
        first_activated_at=(
            license_record.first_activated_at
        ),
        expires_at=license_record.expires_at,
        is_active=license_record.is_active,
    )


def build_device_item(
    *,
    device,
    license_record,
    user,
    product,
) -> AdminDeviceListItemResponse:
    return AdminDeviceListItemResponse(
        id=device.id,
        license_id=license_record.id,
        license_number=license_record.license_number,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        product_id=product.id,
        product_name=product.name,
        product_slug=product.slug,
        device_identifier=device.device_identifier,
        name=device.name,
        operating_system=device.operating_system,
        activated_at=device.activated_at,
        last_validated_at=device.last_validated_at,
        is_active=device.is_active,
    )


def build_admin_settings(
    admin: User,
) -> AdminSettingsResponse:
    environment = (
        "development"
        if settings.debug
        else "production"
    )

    return AdminSettingsResponse(
        admin_id=admin.id,
        name=admin.name,
        email=admin.email,
        is_active=admin.is_active,
        is_admin=admin.is_admin,
        created_at=admin.created_at,
        updated_at=admin.updated_at,
        system=AdminSystemInformationResponse(
            app_name=settings.app_name,
            app_version=settings.app_version,
            environment=environment,
            debug=settings.debug,
            access_token_expire_minutes=(
                settings.access_token_expire_minutes
            ),
            api_status="online",
        ),
    )


@router.get(
    "/settings",
    response_model=AdminSettingsResponse,
)
def get_admin_settings(
    current_admin: User = Depends(get_current_admin),
) -> AdminSettingsResponse:
    return build_admin_settings(current_admin)


@router.patch(
    "/settings/profile",
    response_model=AdminProfileUpdateResponse,
)
def update_admin_profile(
    payload: AdminProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminProfileUpdateResponse:
    updated_admin = services.update_admin_profile(
        db,
        admin_id=current_admin.id,
        name=payload.name,
        email=str(payload.email),
    )

    return AdminProfileUpdateResponse(
        success=True,
        message="Perfil atualizado com sucesso.",
        admin_id=updated_admin.id,
        name=updated_admin.name,
        email=updated_admin.email,
        updated_at=updated_admin.updated_at,
    )


@router.patch(
    "/settings/password",
    response_model=AdminPasswordUpdateResponse,
)
def update_admin_password(
    payload: AdminPasswordUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminPasswordUpdateResponse:
    services.update_admin_password(
        db,
        admin_id=current_admin.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
        confirm_password=payload.confirm_password,
    )

    return AdminPasswordUpdateResponse(
        success=True,
        message="Senha atualizada com sucesso.",
    )


@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse,
)
def admin_dashboard(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminDashboardResponse:
    return AdminDashboardResponse(
        admin=AdminIdentityResponse(
            id=current_admin.id,
            name=current_admin.name,
            email=current_admin.email,
        ),
        total_users=repositories.count_users(db),
        total_products=repositories.count_products(db),
        total_licenses=repositories.count_licenses(db),
        total_devices=repositories.count_devices(db),
        active_devices=repositories.count_devices(
            db,
            active_only=True,
        ),
        pending_activation_licenses=(
            repositories.count_licenses(
                db,
                status="pending_activation",
            )
        ),
        active_licenses=repositories.count_licenses(
            db,
            status="active",
        ),
        expired_licenses=repositories.count_licenses(
            db,
            status="expired",
        ),
        suspended_licenses=repositories.count_licenses(
            db,
            status="suspended",
        ),
        revoked_licenses=repositories.count_licenses(
            db,
            status="revoked",
        ),
    )


@router.get(
    "/users",
    response_model=list[UserResponse],
)
def list_all_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[User]:
    return user_repositories.list_users(db)


@router.get(
    "/licenses",
    response_model=list[AdminLicenseListItemResponse],
)
def list_all_licenses(
    status_filter: str | None = Query(
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
    current_admin: User = Depends(get_current_admin),
) -> list[AdminLicenseListItemResponse]:
    results = repositories.list_licenses(
        db,
        status=status_filter,
        search=search,
        offset=offset,
        limit=limit,
    )

    return [
        build_license_item(
            db,
            license_record=license_record,
            user=user,
            product=product,
        )
        for license_record, user, product in results
    ]


@router.get(
    "/licenses/{license_id}",
    response_model=AdminLicenseDetailResponse,
)
def get_license_details(
    license_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminLicenseDetailResponse:
    result = repositories.get_license_details(
        db,
        license_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licença não encontrada.",
        )

    license_record, user, product = result

    item = build_license_item(
        db,
        license_record=license_record,
        user=user,
        product=product,
    )

    devices = repositories.list_license_devices(
        db,
        license_id,
    )

    return AdminLicenseDetailResponse(
        **item.model_dump(),
        devices=[
            AdminLicenseDeviceResponse.model_validate(
                device
            )
            for device in devices
        ],
    )


@router.post(
    "/licenses/{license_id}/renew",
    response_model=LicenseActionResponse,
)
def renew_license(
    license_id: UUID,
    payload: LicenseRenewRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> LicenseActionResponse:
    license_record = services.renew_license(
        db,
        license_id=license_id,
        additional_days=payload.additional_days,
    )

    return LicenseActionResponse(
        success=True,
        message=(
            f"Licença renovada por "
            f"{payload.additional_days} dias."
        ),
        license_id=license_record.id,
        license_number=license_record.license_number,
        status=license_record.status,
        expires_at=license_record.expires_at,
    )


@router.post(
    "/licenses/{license_id}/suspend",
    response_model=LicenseActionResponse,
)
def suspend_license(
    license_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> LicenseActionResponse:
    license_record = services.suspend_license(
        db,
        license_id=license_id,
    )

    return LicenseActionResponse(
        success=True,
        message="Licença suspensa.",
        license_id=license_record.id,
        license_number=license_record.license_number,
        status=license_record.status,
        expires_at=license_record.expires_at,
    )


@router.post(
    "/licenses/{license_id}/restore",
    response_model=LicenseActionResponse,
)
def restore_license(
    license_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> LicenseActionResponse:
    license_record = services.restore_license(
        db,
        license_id=license_id,
    )

    return LicenseActionResponse(
        success=True,
        message="Licença restaurada.",
        license_id=license_record.id,
        license_number=license_record.license_number,
        status=license_record.status,
        expires_at=license_record.expires_at,
    )


@router.post(
    "/licenses/{license_id}/revoke",
    response_model=LicenseActionResponse,
)
def revoke_license(
    license_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> LicenseActionResponse:
    license_record = services.revoke_license(
        db,
        license_id=license_id,
    )

    return LicenseActionResponse(
        success=True,
        message="Licença revogada permanentemente.",
        license_id=license_record.id,
        license_number=license_record.license_number,
        status=license_record.status,
        expires_at=license_record.expires_at,
    )


@router.get(
    "/devices",
    response_model=list[AdminDeviceListItemResponse],
)
def list_all_devices(
    active_only: bool = Query(
        default=False,
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
    current_admin: User = Depends(get_current_admin),
) -> list[AdminDeviceListItemResponse]:
    results = repositories.list_devices(
        db,
        active_only=active_only,
        search=search,
        offset=offset,
        limit=limit,
    )

    return [
        build_device_item(
            device=device,
            license_record=license_record,
            user=user,
            product=product,
        )
        for device, license_record, user, product in results
    ]


@router.delete(
    "/devices/{device_id}",
    response_model=DeviceRemovalResponse,
)
def delete_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> DeviceRemovalResponse:
    device = services.remove_device(
        db,
        device_id=device_id,
    )

    return DeviceRemovalResponse(
        success=True,
        message="Dispositivo desvinculado da licença.",
        device_id=device.id,
        license_id=device.license_id,
    )