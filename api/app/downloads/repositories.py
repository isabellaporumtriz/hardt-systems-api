from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.downloads.models import DownloadRelease
from app.licenses.models import License
from app.products.models import Product


ALLOWED_DOWNLOAD_LICENSE_STATUSES = (
    "active",
    "pending_activation",
)


def list_client_downloads(
    db: Session,
    user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 12,
    search: str | None = None,
    platform: str | None = None,
) -> tuple[
    list[tuple[DownloadRelease, Product]],
    int,
]:
    filters = [
        DownloadRelease.is_active.is_(True),
        Product.is_active.is_(True),
        License.user_id == user_id,
        License.is_active.is_(True),
        License.status.in_(
            ALLOWED_DOWNLOAD_LICENSE_STATUSES
        ),
    ]

    normalized_search = (
        search.strip()
        if search is not None
        else ""
    )

    if normalized_search:
        search_value = f"%{normalized_search}%"

        filters.append(
            or_(
                Product.name.ilike(search_value),
                Product.description.ilike(search_value),
                DownloadRelease.version.ilike(search_value),
                DownloadRelease.platform.ilike(search_value),
                DownloadRelease.architecture.ilike(
                    search_value
                ),
                DownloadRelease.file_name.ilike(
                    search_value
                ),
            )
        )

    normalized_platform = (
        platform.strip()
        if platform is not None
        else ""
    )

    if normalized_platform:
        filters.append(
            DownloadRelease.platform.ilike(
                normalized_platform
            )
        )

    base_statement = (
        select(
            DownloadRelease,
            Product,
        )
        .join(
            Product,
            Product.id
            == DownloadRelease.product_id,
        )
        .join(
            License,
            License.product_id == Product.id,
        )
        .where(*filters)
        .distinct()
    )

    total_statement = (
        select(
            func.count(
                func.distinct(
                    DownloadRelease.id
                )
            )
        )
        .select_from(DownloadRelease)
        .join(
            Product,
            Product.id
            == DownloadRelease.product_id,
        )
        .join(
            License,
            License.product_id == Product.id,
        )
        .where(*filters)
    )

    total = int(
        db.scalar(total_statement)
        or 0
    )

    offset = (
        page - 1
    ) * page_size

    statement = (
        base_statement
        .order_by(
            DownloadRelease.published_at.desc(),
            Product.name.asc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    rows = list(
        db.execute(statement).all()
    )

    return rows, total


def get_client_download_by_id(
    db: Session,
    user_id: UUID,
    download_id: UUID,
) -> tuple[
    DownloadRelease,
    Product,
] | None:
    statement = (
        select(
            DownloadRelease,
            Product,
        )
        .join(
            Product,
            Product.id
            == DownloadRelease.product_id,
        )
        .join(
            License,
            License.product_id == Product.id,
        )
        .where(
            DownloadRelease.id == download_id,
            DownloadRelease.is_active.is_(True),
            Product.is_active.is_(True),
            License.user_id == user_id,
            License.is_active.is_(True),
            License.status.in_(
                ALLOWED_DOWNLOAD_LICENSE_STATUSES
            ),
        )
        .limit(1)
    )

    row = db.execute(statement).first()

    if row is None:
        return None

    return row[0], row[1]


def get_client_download_summary(
    db: Session,
    user_id: UUID,
) -> tuple[int, int, int]:
    statement = (
        select(
            DownloadRelease.platform,
            DownloadRelease.product_id,
        )
        .join(
            Product,
            Product.id
            == DownloadRelease.product_id,
        )
        .join(
            License,
            License.product_id == Product.id,
        )
        .where(
            DownloadRelease.is_active.is_(True),
            Product.is_active.is_(True),
            License.user_id == user_id,
            License.is_active.is_(True),
            License.status.in_(
                ALLOWED_DOWNLOAD_LICENSE_STATUSES
            ),
        )
        .distinct()
    )

    rows = list(
        db.execute(statement).all()
    )

    total = len(rows)

    products = len({
        product_id
        for _, product_id in rows
    })

    platforms = len({
        platform.lower()
        for platform, _ in rows
    })

    return total, products, platforms
