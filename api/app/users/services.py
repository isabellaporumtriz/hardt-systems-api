from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.users import repositories
from app.users.models import User
from app.users.schemas import UserCreate
from app.wallet.services import create_wallet


def register_user(db: Session, data: UserCreate) -> User:
    email = data.email.lower().strip()

    existing_user = repositories.get_user_by_email(db, email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário cadastrado com este e-mail.",
        )

    try:
        user = repositories.create_user(
            db,
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(data.password),
        )

        create_wallet(
            db,
            user.id,
        )

        db.commit()
        db.refresh(user)

        return user

    except Exception:
        db.rollback()
        raise
