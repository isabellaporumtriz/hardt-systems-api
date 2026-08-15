from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

import requests

from app.core.config import settings


class JAPProviderError(RuntimeError):
    pass


class JAPConfigurationError(JAPProviderError):
    pass


class JAPResponseError(JAPProviderError):
    pass


class JAPProvider:
    """
    Adapter server-side para JustAnotherPanel.

    A API key nunca deve chegar ao frontend.
    """

    def __init__(self) -> None:
        self.api_url = settings.jap_api_url.strip()
        self.api_key = settings.jap_api_key.strip()

        if not self.api_url:
            raise JAPConfigurationError(
                "JAP_API_URL não configurada."
            )

        if not self.api_key:
            raise JAPConfigurationError(
                "JAP_API_KEY não configurada."
            )

    def _request(
        self,
        action: str,
        **payload: Any,
    ) -> Any:
        data = {
            "key": self.api_key,
            "action": action,
            **payload,
        }

        try:
            response = requests.post(
                self.api_url,
                data=data,
                timeout=45,
            )
        except requests.RequestException as exc:
            raise JAPProviderError(
                f"Falha de comunicação com JAP: {exc}"
            ) from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise JAPResponseError(
                "JAP retornou resposta inválida."
            ) from exc

        if response.status_code >= 400:
            raise JAPResponseError(
                f"JAP HTTP {response.status_code}: {body}"
            )

        if (
            isinstance(body, dict)
            and body.get("error")
        ):
            raise JAPResponseError(
                str(body["error"])
            )

        return body

    def get_balance(self) -> dict[str, Any]:
        body = self._request("balance")

        if not isinstance(body, dict):
            raise JAPResponseError(
                "Formato inesperado no balance."
            )

        return body

    def get_services(
        self,
    ) -> list[dict[str, Any]]:
        body = self._request("services")

        if not isinstance(body, list):
            raise JAPResponseError(
                "Formato inesperado no catálogo."
            )

        return body


def decimal_from_jap(
    value: object,
) -> Decimal:
    try:
        return Decimal(str(value))
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise JAPResponseError(
            f"Valor monetário JAP inválido: {value}"
        ) from exc


def hardt_rate_usd(
    provider_rate_usd: object,
) -> Decimal:
    """
    Tarifa de venda Hardt por 1.000 unidades.

    Regra:
        Hardt = JAP × JAP_MARKUP_MULTIPLIER

    Atualmente:
        multiplicador = 2.0
    """

    provider_rate = decimal_from_jap(
        provider_rate_usd
    )

    multiplier = Decimal(
        str(settings.jap_markup_multiplier)
    )

    return (
        provider_rate * multiplier
    ).quantize(
        Decimal("0.000001")
    )


def calculate_hardt_price_usd(
    *,
    provider_rate_usd: object,
    quantity: int,
) -> Decimal:
    """
    Calcula preço total Hardt em USD.

    JAP trabalha com rate por 1.000 unidades.

    total =
        (rate / 1000)
        * quantity
        * markup
    """

    if quantity <= 0:
        raise ValueError(
            "Quantidade deve ser maior que zero."
        )

    sell_rate = hardt_rate_usd(
        provider_rate_usd
    )

    return (
        sell_rate
        * Decimal(quantity)
        / Decimal("1000")
    ).quantize(
        Decimal("0.000001")
    )


def _provider_order_id_from_response(
    body: object,
) -> str:
    if not isinstance(body, dict):
        raise JAPResponseError(
            "Formato inesperado ao criar pedido JAP."
        )

    value = body.get("order")

    if value in (
        None,
        "",
    ):
        raise JAPResponseError(
            f"JAP não retornou order id: {body}"
        )

    return str(value)


def _provider_status_from_response(
    body: object,
) -> dict[str, Any]:
    if not isinstance(body, dict):
        raise JAPResponseError(
            "Formato inesperado no status JAP."
        )

    return body


def _jap_add_order(
    provider: JAPProvider,
    *,
    service_id: int,
    link: str,
    quantity: int,
) -> str:
    """
    Cria UM pedido real na JAP.

    IMPORTANTE:
    A JAP não recebe nossa idempotency_key.
    O controle contra duplicidade precisa ocorrer
    antes desta função, na camada Hardt.
    """

    body = provider._request(
        "add",
        service=service_id,
        link=link,
        quantity=quantity,
    )

    return _provider_order_id_from_response(
        body
    )


def _jap_get_order_status(
    provider: JAPProvider,
    *,
    order_id: str,
) -> dict[str, Any]:
    body = provider._request(
        "status",
        order=order_id,
    )

    return _provider_status_from_response(
        body
    )


# Métodos públicos do adapter sem reescrever
# a implementação existente.
JAPProvider.add_order = _jap_add_order
JAPProvider.get_order_status = (
    _jap_get_order_status
)


class JAPOrderRejectedError(
    JAPProviderError
):
    """
    Provider respondeu explicitamente com erro.

    Podemos considerar que o pedido não foi aceito.
    """
    pass


class JAPOrderUncertainError(
    JAPProviderError
):
    """
    Não conseguimos determinar com segurança se a JAP
    recebeu ou não o pedido.

    Nunca fazer retry automático.
    """
    pass


def _safe_jap_add_order(
    provider: JAPProvider,
    *,
    service_id: int,
    link: str,
    quantity: int,
) -> str:
    data = {
        "key": provider.api_key,
        "action": "add",
        "service": service_id,
        "link": link,
        "quantity": quantity,
    }

    try:
        response = requests.post(
            provider.api_url,
            data=data,
            timeout=45,
        )
    except requests.RequestException as exc:
        raise JAPOrderUncertainError(
            f"Falha de comunicação durante add: {exc}"
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise JAPOrderUncertainError(
            "JAP respondeu ao add com conteúdo inválido."
        ) from exc

    if response.status_code >= 400:
        raise JAPOrderRejectedError(
            f"JAP HTTP {response.status_code}: {body}"
        )

    if (
        isinstance(body, dict)
        and body.get("error")
    ):
        raise JAPOrderRejectedError(
            str(body["error"])
        )

    if not isinstance(body, dict):
        raise JAPOrderUncertainError(
            f"Resposta inesperada no add: {body}"
        )

    provider_order_id = body.get(
        "order"
    )

    if provider_order_id in (
        None,
        "",
    ):
        raise JAPOrderUncertainError(
            f"Resposta sem order ID: {body}"
        )

    return str(provider_order_id)


JAPProvider.add_order = _safe_jap_add_order
