from fastapi import HTTPException
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.client import repositories
from app.core.crypto import (
    EncryptionError,
    decrypt_license_key,
)
from app.downloads import repositories as download_repositories
from app.downloads.storage import generate_download_url
from app.core.security import hash_password, verify_password
from app.client.schemas import (
    ClientChargeItemResponse,
    ClientChargeListResponse,
    ClientChargeSummaryResponse,
    ClientDashboardResponse,
    ClientDownloadAccessResponse,
    ClientDownloadItemResponse,
    ClientDownloadListResponse,
    ClientDownloadSummaryResponse,
    ClientDeviceItemResponse,
    ClientDeviceListResponse,
    ClientDeviceStatusResponse,
    ClientDeviceSummaryResponse,
    ClientFinanceSummaryResponse,
    ClientLicenseKeyResponse,
    ClientLicenseListResponse,
    ClientLicenseSummaryResponse,
    ClientPasswordUpdateRequest,
    ClientPasswordUpdateResponse,
    ClientProfileResponse,
    ClientProfileSummaryResponse,
    ClientProfileUpdateRequest,
    ClientProfileUpdateResponse,
    ClientRecentChargeResponse,
    ClientRecentLicenseResponse,
)
from app.users import repositories as user_repositories
from app.users.models import User


def utc_now() -> datetime:
    return datetime.now(
        timezone.utc,
    )


def sync_client_overdue_charges(
    db: Session,
    user_id,
) -> int:
    return repositories.mark_user_overdue_charges(
        db,
        user_id,
        now=utc_now(),
    )


def get_client_dashboard(
    db: Session,
    current_user: User,
    *,
    recent_limit: int = 5,
) -> ClientDashboardResponse:
    sync_client_overdue_charges(
        db,
        current_user.id,
    )

    total_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
        )
    )

    active_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="active",
        )
    )

    pending_activation_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="pending_activation",
        )
    )

    expired_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="expired",
        )
    )

    suspended_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="suspended",
        )
    )

    revoked_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="revoked",
        )
    )

    (
        active_devices,
        inactive_devices,
        total_device_limit,
    ) = repositories.get_user_device_summary(
        db,
        current_user.id,
    )

    pending_amount = (
        repositories.sum_user_charge_amount(
            db,
            current_user.id,
            status="pending",
        )
    )

    overdue_amount = (
        repositories.sum_user_charge_amount(
            db,
            current_user.id,
            status="overdue",
        )
    )

    pending_charges = (
        repositories.count_user_charges(
            db,
            current_user.id,
            status="pending",
        )
    )

    overdue_charges = (
        repositories.count_user_charges(
            db,
            current_user.id,
            status="overdue",
        )
    )

    next_charge = (
        repositories.get_next_user_charge(
            db,
            current_user.id,
        )
    )

    last_payment = (
        repositories.get_last_user_payment(
            db,
            current_user.id,
        )
    )

    recent_license_rows = (
        repositories.get_recent_user_licenses(
            db,
            current_user.id,
            limit=recent_limit,
        )
    )

    recent_licenses = [
        ClientRecentLicenseResponse(
            id=license_record.id,
            license_number=(
                license_record.license_number
            ),
            key_preview=(
                license_record.key_preview
            ),
            status=license_record.status,
            product_id=product.id,
            product_name=product.name,
            product_slug=product.slug,
            product_version=product.version,
            max_devices=(
                license_record.max_devices
            ),
            active_devices=active_devices_count,
            issued_at=license_record.issued_at,
            first_activated_at=(
                license_record.first_activated_at
            ),
            expires_at=(
                license_record.expires_at
            ),
            is_active=(
                license_record.is_active
            ),
        )
        for (
            license_record,
            product,
            active_devices_count,
        ) in recent_license_rows
    ]

    recent_charge_rows = (
        repositories.get_recent_user_charges(
            db,
            current_user.id,
            limit=recent_limit,
        )
    )

    recent_charges = [
        ClientRecentChargeResponse(
            id=charge.id,
            charge_number=(
                charge.charge_number
            ),
            description=charge.description,
            amount=charge.amount,
            status=charge.status,
            payment_method=(
                charge.payment_method
            ),
            due_at=charge.due_at,
            paid_at=charge.paid_at,
            created_at=charge.created_at,
            product_id=charge.product_id,
            product_name=(
                product.name
                if product is not None
                else None
            ),
            license_id=charge.license_id,
            license_number=(
                license_record.license_number
                if license_record is not None
                else None
            ),
        )
        for (
            charge,
            product,
            license_record,
        ) in recent_charge_rows
    ]

    return ClientDashboardResponse(
        customer=ClientProfileSummaryResponse(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
        ),
        licenses=ClientLicenseSummaryResponse(
            total=total_licenses,
            active=active_licenses,
            pending_activation=(
                pending_activation_licenses
            ),
            expired=expired_licenses,
            suspended=suspended_licenses,
            revoked=revoked_licenses,
        ),
        devices=ClientDeviceSummaryResponse(
            active=active_devices,
            inactive=inactive_devices,
            total=(
                active_devices
                + inactive_devices
            ),
            total_limit=total_device_limit,
        ),
        finance=ClientFinanceSummaryResponse(
            pending_amount=pending_amount,
            overdue_amount=overdue_amount,
            pending_charges=pending_charges,
            overdue_charges=overdue_charges,
            next_charge_id=(
                next_charge.id
                if next_charge is not None
                else None
            ),
            next_charge_number=(
                next_charge.charge_number
                if next_charge is not None
                else None
            ),
            next_due_at=(
                next_charge.due_at
                if next_charge is not None
                else None
            ),
            next_due_amount=(
                next_charge.amount
                if next_charge is not None
                else None
            ),
            last_payment_id=(
                last_payment.id
                if last_payment is not None
                else None
            ),
            last_payment_number=(
                last_payment.charge_number
                if last_payment is not None
                else None
            ),
            last_payment_amount=(
                last_payment.amount
                if last_payment is not None
                else None
            ),
            last_payment_at=(
                last_payment.paid_at
                if last_payment is not None
                else None
            ),
        ),
        recent_licenses=recent_licenses,
        recent_charges=recent_charges,
    )

def get_client_licenses(
    db: Session,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    search: str | None = None,
) -> ClientLicenseListResponse:
    total_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
        )
    )

    active_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="active",
        )
    )

    pending_activation_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="pending_activation",
        )
    )

    expired_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="expired",
        )
    )

    suspended_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="suspended",
        )
    )

    revoked_licenses = (
        repositories.count_user_licenses(
            db,
            current_user.id,
            status="revoked",
        )
    )

    (
        license_rows,
        filtered_total,
    ) = repositories.list_user_licenses(
        db,
        current_user.id,
        page=page,
        page_size=page_size,
        status=status,
        search=search,
    )

    items = [
        ClientRecentLicenseResponse(
            id=license_record.id,
            license_number=(
                license_record.license_number
            ),
            key_preview=(
                license_record.key_preview
            ),
            status=license_record.status,
            product_id=product.id,
            product_name=product.name,
            product_slug=product.slug,
            product_version=product.version,
            max_devices=(
                license_record.max_devices
            ),
            active_devices=(
                active_devices_count
            ),
            issued_at=(
                license_record.issued_at
            ),
            first_activated_at=(
                license_record.first_activated_at
            ),
            expires_at=(
                license_record.expires_at
            ),
            is_active=(
                license_record.is_active
            ),
        )
        for (
            license_record,
            product,
            active_devices_count,
        ) in license_rows
    ]

    pages = (
        (
            filtered_total
            + page_size
            - 1
        )
        // page_size
    )

    return ClientLicenseListResponse(
        summary=ClientLicenseSummaryResponse(
            total=total_licenses,
            active=active_licenses,
            pending_activation=(
                pending_activation_licenses
            ),
            expired=expired_licenses,
            suspended=suspended_licenses,
            revoked=revoked_licenses,
        ),
        items=items,
        total=filtered_total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def get_client_devices(
    db: Session,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 10,
    is_active: bool | None = None,
    search: str | None = None,
) -> ClientDeviceListResponse:
    (
        active_devices,
        inactive_devices,
        total_device_limit,
    ) = repositories.get_user_device_summary(
        db,
        current_user.id,
    )

    (
        device_rows,
        filtered_total,
    ) = repositories.list_user_devices(
        db,
        current_user.id,
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
    )

    items = [
        ClientDeviceItemResponse(
            id=device.id,
            device_identifier=(
                device.device_identifier
            ),
            name=device.name,
            operating_system=(
                device.operating_system
            ),
            app_version=(
                device.app_version
            ),
            ip_address=(
                device.ip_address
            ),
            last_ip_address=(
                device.last_ip_address
            ),
            activated_at=(
                device.activated_at
            ),
            last_validated_at=(
                device.last_validated_at
            ),
            is_active=device.is_active,
            license_id=license_record.id,
            license_number=(
                license_record.license_number
            ),
            license_status=(
                license_record.status
            ),
            product_id=product.id,
            product_name=product.name,
            product_version=product.version,
        )
        for (
            device,
            license_record,
            product,
        ) in device_rows
    ]

    pages = (
        (
            filtered_total
            + page_size
            - 1
        )
        // page_size
    )

    return ClientDeviceListResponse(
        summary=ClientDeviceSummaryResponse(
            active=active_devices,
            inactive=inactive_devices,
            total=(
                active_devices
                + inactive_devices
            ),
            total_limit=total_device_limit,
        ),
        items=items,
        total=filtered_total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def deactivate_client_device(
    db: Session,
    current_user: User,
    device_id,
) -> ClientDeviceStatusResponse:
    device = (
        repositories.get_user_device_by_id(
            db,
            current_user.id,
            device_id,
        )
    )

    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo não encontrado.",
        )

    if not device.is_active:
        return ClientDeviceStatusResponse(
            id=device.id,
            is_active=False,
            message=(
                "O dispositivo já está desativado."
            ),
        )

    device = (
        repositories.deactivate_user_device(
            db,
            device,
        )
    )

    return ClientDeviceStatusResponse(
        id=device.id,
        is_active=device.is_active,
        message=(
            "Dispositivo desativado com sucesso."
        ),
    )


def get_client_downloads(
    db: Session,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 12,
    search: str | None = None,
    platform: str | None = None,
) -> ClientDownloadListResponse:
    (
        rows,
        filtered_total,
    ) = download_repositories.list_client_downloads(
        db,
        current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        platform=platform,
    )

    (
        total_downloads,
        total_products,
        total_platforms,
    ) = download_repositories.get_client_download_summary(
        db,
        current_user.id,
    )

    items = [
        ClientDownloadItemResponse(
            id=release.id,
            product_id=product.id,
            product_name=product.name,
            product_description=product.description,
            version=release.version,
            platform=release.platform,
            architecture=release.architecture,
            file_name=release.file_name,
            file_size_bytes=release.file_size_bytes,
            checksum_sha256=release.checksum_sha256,
            release_notes=release.release_notes,
            published_at=release.published_at,
        )
        for release, product in rows
    ]

    pages = (
        (
            filtered_total
            + page_size
            - 1
        )
        // page_size
    )

    return ClientDownloadListResponse(
        summary=ClientDownloadSummaryResponse(
            total=total_downloads,
            products=total_products,
            platforms=total_platforms,
        ),
        items=items,
        total=filtered_total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def get_client_download_access(
    db: Session,
    current_user: User,
    download_id,
) -> ClientDownloadAccessResponse:
    result = (
        download_repositories
        .get_client_download_by_id(
            db,
            current_user.id,
            download_id,
        )
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Download não encontrado ou "
                "licença sem autorização."
            ),
        )

    release, _product = result

    download_url = generate_download_url(
        release.file_url,
        file_name=release.file_name,
    )

    return ClientDownloadAccessResponse(
        id=release.id,
        file_name=release.file_name,
        file_url=download_url,
    )



def get_client_charges(
    db: Session,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 10,
    charge_status: str | None = None,
    search: str | None = None,
) -> ClientChargeListResponse:
    allowed_statuses = {
        "pending",
        "paid",
        "overdue",
        "cancelled",
        "refunded",
    }

    if (
        charge_status is not None
        and charge_status not in allowed_statuses
    ):
        raise HTTPException(
            status_code=422,
            detail="Status de cobrança inválido.",
        )

    sync_client_overdue_charges(
        db,
        current_user.id,
    )

    (
        charge_rows,
        filtered_total,
    ) = repositories.list_user_charges(
        db,
        current_user.id,
        page=page,
        page_size=page_size,
        status=charge_status,
        search=search,
    )

    (
        total_charges,
        paid_charges,
        pending_charges,
        overdue_charges,
        cancelled_charges,
        refunded_charges,
        total_amount,
    ) = repositories.get_user_charge_summary(
        db,
        current_user.id,
    )

    items = [
        ClientChargeItemResponse(
            id=charge.id,
            charge_number=charge.charge_number,
            description=charge.description,
            amount=charge.amount,
            status=charge.status,
            payment_method=charge.payment_method,
            due_at=charge.due_at,
            paid_at=charge.paid_at,
            cancelled_at=charge.cancelled_at,
            refunded_at=charge.refunded_at,
            external_reference=charge.external_reference,
            notes=charge.notes,
            product_id=charge.product_id,
            product_name=(
                product.name
                if product is not None
                else None
            ),
            license_id=charge.license_id,
            license_number=(
                license_record.license_number
                if license_record is not None
                else None
            ),
            created_at=charge.created_at,
            updated_at=charge.updated_at,
        )
        for (
            charge,
            product,
            license_record,
        ) in charge_rows
    ]

    pages = (
        (
            filtered_total
            + page_size
            - 1
        )
        // page_size
    )

    return ClientChargeListResponse(
        summary=ClientChargeSummaryResponse(
            total=total_charges,
            paid=paid_charges,
            pending=pending_charges,
            overdue=overdue_charges,
            cancelled=cancelled_charges,
            refunded=refunded_charges,
            total_amount=total_amount,
        ),
        items=items,
        total=filtered_total,
        page=page,
        page_size=page_size,
        pages=pages,
    )



def build_client_profile_response(
    current_user: User,
) -> ClientProfileResponse:
    return ClientProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


def get_client_profile(
    current_user: User,
) -> ClientProfileResponse:
    return build_client_profile_response(
        current_user,
    )


def update_client_profile(
    db: Session,
    current_user: User,
    payload: ClientProfileUpdateRequest,
) -> ClientProfileUpdateResponse:
    normalized_name = payload.name.strip()
    normalized_email = (
        str(payload.email)
        .strip()
        .lower()
    )

    existing_user = (
        user_repositories.get_user_by_email(
            db,
            normalized_email,
        )
    )

    if (
        existing_user is not None
        and existing_user.id != current_user.id
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Já existe um usuário cadastrado "
                "com este e-mail."
            ),
        )

    current_user.name = normalized_name
    current_user.email = normalized_email

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return ClientProfileUpdateResponse(
        success=True,
        message="Perfil atualizado com sucesso.",
        profile=build_client_profile_response(
            current_user,
        ),
    )


def update_client_password(
    db: Session,
    current_user: User,
    payload: ClientPasswordUpdateRequest,
) -> ClientPasswordUpdateResponse:
    if not verify_password(
        payload.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=422,
            detail="A senha atual está incorreta.",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=422,
            detail=(
                "A nova senha deve ser diferente "
                "da senha atual."
            ),
        )

    current_user.password_hash = hash_password(
        payload.new_password,
    )

    db.add(current_user)
    db.commit()

    return ClientPasswordUpdateResponse(
        success=True,
        message="Senha alterada com sucesso.",
    )



def get_client_license_key(
    db: Session,
    current_user: User,
    license_id,
) -> ClientLicenseKeyResponse:
    from app.licenses.models import License

    license_record = (
        db.query(License)
        .filter(
            License.id == license_id,
            License.user_id == current_user.id,
        )
        .first()
    )

    if license_record is None:
        raise HTTPException(
            status_code=404,
            detail="Licença não encontrada.",
        )

    if not license_record.encrypted_key:
        raise HTTPException(
            status_code=409,
            detail=(
                "A chave completa não está disponível "
                "para esta licença."
            ),
        )

    try:
        license_key = decrypt_license_key(
            license_record.encrypted_key
        )
    except EncryptionError as exc:
        raise HTTPException(
            status_code=500,
            detail="Não foi possível consultar a chave.",
        ) from exc

    return ClientLicenseKeyResponse(
        license_id=license_record.id,
        license_number=license_record.license_number,
        license_key=license_key,
    )
