import hashlib
import secrets
import string


LICENSE_PREFIX = "HARDT"
LICENSE_NUMBER_PREFIX = "LIC"


def generate_license_key() -> str:
    """
    Exemplo:
    HARDT-K7QX-9M2P-A8LF
    """

    alphabet = string.ascii_uppercase + string.digits

    groups = [
        "".join(secrets.choice(alphabet) for _ in range(4))
        for _ in range(4)
    ]

    return f"{LICENSE_PREFIX}-{'-'.join(groups)}"


def hash_license_key(key: str) -> str:
    """
    Retorna o SHA256 da chave.
    """

    return hashlib.sha256(key.encode()).hexdigest()


def generate_key_preview(key: str) -> str:
    """
    Exemplo:
    HARDT-****-****-A8LF
    """

    parts = key.split("-")

    return f"{parts[0]}-****-****-{parts[-1]}"


def generate_license_number(sequence: int) -> str:
    """
    Exemplo:
    LIC-000001
    """

    return f"{LICENSE_NUMBER_PREFIX}-{sequence:06d}"