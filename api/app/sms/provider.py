from __future__ import annotations

from decimal import Decimal
from typing import Any

import requests

from app.core.config import settings


BRAZIL_ID = 73

SERVICE_NAMES = {
    # Principais
    "wa": "WhatsApp",
    "tg": "Telegram",
    "ig": "Instagram",
    "fb": "Facebook",
    "go": "Google",
    "dr": "OpenAI",

    # Serviços conferidos na documentação SMS24h
    "ki": "99app",
    "sa": "Agibank",
    "hx": "AliExpress",
    "am": "Amazon",
    "bqr": "Asaas",
    "bbl": "Autodesk",
    "qv": "Badoo",
    "li": "Baidu",
    "vc": "Banqi",
    "abd": "BeBoo",
    "ie": "Bet365",
    "baj": "Bipa",
    "ht": "Bitso",
    "ua": "BlaBlaCar",
    "ann": "Bradesco",
    "sy": "Brahma",
    "avy": "BV",
    "aff": "C6 Bank",
    "re": "Coinbase",
    "om": "Corona",
    "ax": "CrefisaMais",
    "ccl": "Cruzeiro",
    "aje": "CupidMedia",
    "ahi": "Daki",
    "ds": "Discord",
    "xj": "Dotz",
    "efi": "Efí Bank",
    "arf": "Enjoei",
    "cau": "Ero Me",
    "apb": "eToro",
    "alc": "Facily",
    "asl": "Familhao",
    "any": "FastEarn",
    "aim": "Firebase",
    "arg": "Gappx",
    "aiu": "GetNinjas",
    "ccu": "Google Chat",
    "gmsg": "GoogleMessenger",
    "gf": "GoogleVoice",
    "afe": "GovBr",
    "yw": "Grindr",
    "alb": "Guiche Web",
    "ik": "GuruBets",
    "iq": "ICQ",
    "pd": "iFood",
    "anx": "InfinitePay",
    "btn": "Itau",
    "ad": "Iti",
    "kt": "KakaoTalk",
    "vp": "Kwai",
    "fh": "Lalamove",
    "me": "Line msg",
    "beh": "LUUP",
    "afq": "MagaLu",
    "fd": "Mamba",
    "bwv": "Manus",
    "uy": "Meliuz",
    "cq": "Mercado",
    "amv": "MeSeems",
    "aom": "Monzo",
    "bgj": "MoonPay",
    "axm": "Não Me Perturbe",
    "awg": "Natura Avon",
    "nv": "Naver",
    "aex": "Neon",
    "nf": "Netflix",
    "aey": "Next",
    "awh": "NgCash",
    "aaa": "Nubank",
    "ok": "Ok.ru",
    "aor": "OKX",
    "sn": "OLX",
    "auz": "Outlier",
    "ot": "Outros",
    "abg": "PagBank",
    "abf": "Parimatch",
    "aol": "Paysera",
}



class SMS24hProviderError(RuntimeError):
    pass


class SMS24hConfigurationError(
    SMS24hProviderError
):
    pass


class SMS24hResponseError(
    SMS24hProviderError
):
    pass


class SMS24hPurchaseUncertainError(
    SMS24hProviderError
):
    """
    Não é possível afirmar com segurança se o
    getNumber foi processado pelo provider.

    Nunca fazer retry automático.
    """
    pass


class SMS24hProvider:
    """
    Adapter server-side para SMS24h.

    A API key nunca é enviada ao frontend.
    """

    def __init__(self) -> None:
        self.api_url = (
            settings.sms24h_api_url.strip()
        )
        self.api_key = (
            settings.sms24h_api_key.strip()
        )

        if not self.api_url:
            raise SMS24hConfigurationError(
                "SMS24H_API_URL não configurada."
            )

        if not self.api_key:
            raise SMS24hConfigurationError(
                "SMS24H_API_KEY não configurada."
            )

    def _request(
        self,
        action: str,
        *,
        purchase_sensitive: bool = False,
        **params: Any,
    ) -> Any:
        query = {
            "api_key": self.api_key,
            "action": action,
            **{
                key: value
                for key, value in params.items()
                if value is not None
            },
        }

        try:
            response = requests.get(
                self.api_url,
                params=query,
                timeout=25,
            )
        except requests.RequestException as exc:
            if purchase_sensitive:
                raise SMS24hPurchaseUncertainError(
                    "Falha de comunicação durante "
                    "getNumber; não é possível saber "
                    "se a SMS24h alocou o número."
                ) from exc

            raise SMS24hProviderError(
                f"Falha de comunicação com SMS24h: {exc}"
            ) from exc

        text = response.text.strip()

        protocol_tokens = (
            "NO_NUMBERS",
            "NO_BALANCE",
            "WRONG_SERVICE",
            "NO_ACTIVATION",
            "EARLY_CANCEL_DENIED",
            "BAD_ACTION",
        )

        if response.status_code >= 400:
            if any(
                token in text
                for token in protocol_tokens
            ):
                return text

            if (
                purchase_sensitive
                and response.status_code >= 500
            ):
                raise SMS24hPurchaseUncertainError(
                    "SMS24h retornou erro de servidor "
                    "durante getNumber; estado da "
                    "compra é incerto."
                )

            raise SMS24hResponseError(
                f"SMS24h HTTP "
                f"{response.status_code}: {text}"
            )

        if not text:
            return None

        try:
            return response.json()
        except ValueError:
            return text

    def get_balance(self) -> Decimal:
        result = self._request(
            "getBalance"
        )

        if (
            not isinstance(result, str)
            or not result.startswith(
                "ACCESS_BALANCE:"
            )
        ):
            raise SMS24hResponseError(
                f"Resposta inesperada de saldo: "
                f"{result!r}"
            )

        return Decimal(
            result.split(":", 1)[1]
        )

    def get_prices(
        self,
        *,
        country: int = BRAZIL_ID,
        service: str | None = None,
    ) -> dict:
        result = self._request(
            "getPrices",
            country=country,
            service=service,
        )

        if not isinstance(result, dict):
            raise SMS24hResponseError(
                f"Resposta inesperada em "
                f"getPrices: {result!r}"
            )

        return result

    def buy_number(
        self,
        *,
        service: str,
        country: int = BRAZIL_ID,
        operator: str = "any",
    ) -> dict | str:
        result = self._request(
            "getNumber",
            purchase_sensitive=True,
            service=service,
            country=country,
            operator=operator,
        )

        if result in {
            "NO_NUMBERS",
            "NO_BALANCE",
            "WRONG_SERVICE",
        }:
            return result

        if not isinstance(result, str):
            raise SMS24hPurchaseUncertainError(
                "Resposta inesperada durante getNumber; "
                "estado da compra é incerto."
            )

        if not result.startswith(
            "ACCESS_NUMBER:"
        ):
            raise SMS24hPurchaseUncertainError(
                "Resposta não reconhecida durante "
                "getNumber; estado da compra é incerto."
            )

        parts = result.split(":", 2)

        if len(parts) != 3:
            raise SMS24hPurchaseUncertainError(
                "ACCESS_NUMBER malformado; estado "
                "da compra é incerto."
            )

        _, activation_id, phone_number = (
            parts
        )

        return {
            "activation_id": activation_id,
            "phone_number": phone_number,
        }

    def get_status(
        self,
        activation_id: str,
    ) -> str:
        result = self._request(
            "getStatus",
            id=activation_id,
        )

        if not isinstance(result, str):
            raise SMS24hResponseError(
                f"Resposta inesperada em "
                f"getStatus: {result!r}"
            )

        return result

    def set_status(
        self,
        *,
        activation_id: str,
        status: int,
    ) -> str:
        result = self._request(
            "setStatus",
            id=activation_id,
            status=status,
        )

        if not isinstance(result, str):
            raise SMS24hResponseError(
                f"Resposta inesperada em "
                f"setStatus: {result!r}"
            )

        return result

    def finish(
        self,
        activation_id: str,
    ) -> str:
        return self.set_status(
            activation_id=activation_id,
            status=6,
        )

    def cancel(
        self,
        activation_id: str,
    ) -> str:
        return self.set_status(
            activation_id=activation_id,
            status=8,
        )
