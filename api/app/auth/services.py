from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.users.repositories import get_user_by_email


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
) -> str:
    normalized_email = email.lower().strip()

    user = get_user_by_email(db, normalized_email)

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo.",
        )

    return create_access_token(
        subject=str(user.id),
        extra_claims={
            "email": user.email,
            "is_admin": user.is_admin,
        },
    )
