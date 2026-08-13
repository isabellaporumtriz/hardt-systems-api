from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class EncryptionError(Exception):
    pass


def get_fernet() -> Fernet:
    try:
        return Fernet(
            settings.license_encryption_key.encode("utf-8")
        )
    except Exception as exc:
        raise EncryptionError(
            "A chave de criptografia das licenças é inválida."
        ) from exc


def encrypt_license_key(value: str) -> str:
    normalized = value.strip().upper()

    return get_fernet().encrypt(
        normalized.encode("utf-8")
    ).decode("utf-8")


def decrypt_license_key(value: str) -> str:
    try:
        return get_fernet().decrypt(
            value.encode("utf-8")
        ).decode("utf-8")
    except InvalidToken as exc:
        raise EncryptionError(
            "Não foi possível descriptografar a licença."
        ) from exc


def encrypt_sensitive_value(value: str) -> str:
    """
    Criptografa conteúdo sensível preservando exatamente
    caracteres, caixa e formatação recebidos.
    """
    if not isinstance(value, str):
        raise EncryptionError(
            "O valor sensível deve ser uma string."
        )

    return get_fernet().encrypt(
        value.encode("utf-8")
    ).decode("utf-8")


def decrypt_sensitive_value(value: str) -> str:
    """
    Descriptografa conteúdo sensível genérico.
    """
    try:
        return get_fernet().decrypt(
            value.encode("utf-8")
        ).decode("utf-8")
    except InvalidToken as exc:
        raise EncryptionError(
            "Não foi possível descriptografar o conteúdo."
        ) from exc

