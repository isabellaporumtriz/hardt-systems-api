import hashlib
import secrets

from sqlalchemy.orm import Session

from app.licenses.repositories import LicenseRepository


class LicenseGenerator:
    def __init__(self, db: Session):
        self.repository = LicenseRepository(db)

    def generate_sequence(self) -> int:
        last_sequence = self.repository.get_last_sequence()
        return 1 if last_sequence is None else last_sequence + 1

    @staticmethod
    def generate_number(sequence: int) -> str:
        return f"LIC-{sequence:06d}"

    @staticmethod
    def generate_key() -> str:
        groups = [
            secrets.token_hex(2).upper()
            for _ in range(4)
        ]
        return "HARDT-" + "-".join(groups)

    @staticmethod
    def generate_hash(license_key: str) -> str:
        normalized_key = license_key.strip().upper()

        return hashlib.sha256(
            normalized_key.encode("utf-8")
        ).hexdigest()

    @staticmethod
    def generate_preview(license_key: str) -> str:
        parts = license_key.split("-")

        if len(parts) != 5:
            raise ValueError("Formato de chave de licença inválido.")

        return f"{parts[0]}-****-****-****-{parts[-1]}"
