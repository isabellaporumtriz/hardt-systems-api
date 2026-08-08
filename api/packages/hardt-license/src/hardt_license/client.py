from datetime import datetime
from typing import Any

import httpx

from hardt_license.device import (
    get_device_fingerprint,
    get_device_id,
    get_device_name,
    get_operating_system,
)
from hardt_license.storage import TokenStorage


class HardtLicenseError(Exception):
    pass


class HardtConnectionError(HardtLicenseError):
    pass


class HardtActivationError(HardtLicenseError):
    pass


class HardtValidationError(HardtLicenseError):
    pass


class LicenseClient:
    def __init__(
        self,
        api_url: str,
        product_slug: str,
        timeout: float = 15.0,
    ):
        self.api_url = api_url.rstrip("/")
        self.product_slug = product_slug
        self.timeout = timeout
        self.storage = TokenStorage(product_slug)

    def _post(
        self,
        endpoint: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        url = f"{self.api_url}{endpoint}"

        try:
            response = httpx.post(
                url,
                json=payload,
                timeout=self.timeout,
            )
        except httpx.RequestError as exc:
            raise HardtConnectionError(
                "Não foi possível conectar à Hardt Systems."
            ) from exc

        try:
            response_data = response.json()
        except ValueError:
            response_data = {}

        if response.is_error:
            detail = response_data.get(
                "detail",
                "A Hardt Systems recusou a solicitação.",
            )

            raise HardtLicenseError(str(detail))

        return response_data

    def activate(
        self,
        license_key: str,
    ) -> dict[str, Any]:
        payload = {
            "license_key": license_key.strip(),
            "device_id": get_device_id(),
            "fingerprint": get_device_fingerprint(),
        }

        try:
            result = self._post(
                "/api/v1/licenses/activate",
                payload,
            )
        except HardtLicenseError as exc:
            raise HardtActivationError(str(exc)) from exc

        activation_token = result.get("activation_token")

        if not activation_token:
            raise HardtActivationError(
                "A API não retornou um token de ativação."
            )

        self.storage.save(activation_token)

        return result

    def validate(self) -> dict[str, Any]:
        activation_token = self.storage.load()

        if not activation_token:
            raise HardtValidationError(
                "Este computador ainda não possui uma ativação salva."
            )

        try:
            result = self._post(
                "/api/v1/licenses/validate",
                {
                    "activation_token": activation_token,
                },
            )
        except HardtLicenseError as exc:
            raise HardtValidationError(str(exc)) from exc

        if result.get("valid") is not True:
            raise HardtValidationError(
                "A licença não está válida."
            )

        return result

    def is_activated(self) -> bool:
        return self.storage.load() is not None

    def remove_local_activation(self) -> None:
        self.storage.delete()

    def get_device_information(self) -> dict[str, str]:
        return {
            "device_id": get_device_id(),
            "device_name": get_device_name(),
            "operating_system": get_operating_system(),
            "fingerprint": get_device_fingerprint(),
        }

    @staticmethod
    def parse_expiration(
        validation_result: dict[str, Any],
    ) -> datetime | None:
        expires_at = validation_result.get("expires_at")

        if not expires_at:
            return None

        return datetime.fromisoformat(expires_at)
