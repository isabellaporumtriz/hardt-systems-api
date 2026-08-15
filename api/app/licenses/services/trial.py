from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.licenses.models import License
from app.licenses.schemas import (
    LicenseCreateRequest,
    LicenseCreateResponse,
)
from app.licenses.services.issuer import (
    LicenseIssuer,
)
from app.products.models import Product
from app.users.models import User


HARDT_MEET_SLUG = "google-meet-robot"
HARDT_MEET_TRIAL_DAYS = 7


class TrialLicenseError(RuntimeError):
    pass


class TrialAlreadyUsedError(
    TrialLicenseError
):
    pass


class TrialProductUnavailableError(
    TrialLicenseError
):
    pass


def get_hardt_meet_product(
    db: Session,
) -> Product:
    product = db.scalar(
        select(Product).where(
            Product.slug == HARDT_MEET_SLUG,
            Product.is_active.is_(True),
        )
    )

    if product is None:
        raise TrialProductUnavailableError(
            "Hardt Meet não está disponível."
        )

    return product


def find_trial_history(
    db: Session,
    *,
    user_id,
    product_id,
) -> License | None:
    return db.scalar(
        select(License)
        .where(
            License.user_id == user_id,
            License.product_id == product_id,
            or_(
                License.is_trial.is_(True),
                License.trial_started_at.is_not(
                    None
                ),
            ),
        )
        .order_by(
            License.created_at.asc()
        )
    )


def find_any_product_license(
    db: Session,
    *,
    user_id,
    product_id,
) -> License | None:
    return db.scalar(
        select(License)
        .where(
            License.user_id == user_id,
            License.product_id == product_id,
        )
        .order_by(
            License.created_at.asc()
        )
    )


def issue_hardt_meet_trial(
    db: Session,
    *,
    user: User,
) -> LicenseCreateResponse:
    product = get_hardt_meet_product(db)

    trial_history = find_trial_history(
        db,
        user_id=user.id,
        product_id=product.id,
    )

    if trial_history is not None:
        raise TrialAlreadyUsedError(
            "O período gratuito do Hardt Meet "
            "já foi utilizado nesta conta."
        )

    # Se já existe qualquer licença comercial,
    # também não oferecemos trial posterior.
    existing_license = find_any_product_license(
        db,
        user_id=user.id,
        product_id=product.id,
    )

    if existing_license is not None:
        raise TrialAlreadyUsedError(
            "Esta conta já possui ou já possuiu "
            "acesso ao Hardt Meet."
        )

    issuer = LicenseIssuer(db)

    try:
        return issuer.issue(
            LicenseCreateRequest(
                user_id=user.id,
                product_id=product.id,
                duration_days=(
                    HARDT_MEET_TRIAL_DAYS
                ),
                max_devices=(
                    product.max_devices or 1
                ),
            ),
            is_trial=True,
        )

    except IntegrityError as exc:
        db.rollback()

        raise TrialAlreadyUsedError(
            "O período gratuito do Hardt Meet "
            "já foi utilizado nesta conta."
        ) from exc
