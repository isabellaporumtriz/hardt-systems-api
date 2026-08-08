from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


class AsaasError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        response_data: Any = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class AsaasClient:
    def __init__(self) -> None:
        self.base_url = (
            settings.asaas_base_url.rstrip("/")
        )
        self.api_key = settings.asaas_api_key

        if not self.api_key:
            raise AsaasError(
                "ASAAS_API_KEY não configurada."
            )

    def _headers(self) -> dict[str, str]:
        return {
            "accept": "application/json",
            "content-type": "application/json",
            "access_token": self.api_key,
        }

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = (
            f"{self.base_url}/"
            f"{path.lstrip('/')}"
        )

        try:
            async with httpx.AsyncClient(
                timeout=30,
            ) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self._headers(),
                    params=params,
                    json=json,
                )
        except httpx.HTTPError as exc:
            raise AsaasError(
                "Falha de comunicação com o Asaas."
            ) from exc

        try:
            data = response.json()
        except ValueError:
            data = {
                "raw": response.text,
            }

        if response.is_error:
            raise AsaasError(
                "A API do Asaas rejeitou a requisição.",
                status_code=response.status_code,
                response_data=data,
            )

        return data

    async def get(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self.request(
            "GET",
            path,
            params=params,
        )

    async def post(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self.request(
            "POST",
            path,
            json=json,
        )


asaas_client = AsaasClient()
