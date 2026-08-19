from __future__ import annotations

import re
import unicodedata

from datetime import datetime, timezone
from io import BytesIO
from uuid import UUID, uuid4

from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.argos.models import (
    ArgosIntake,
    ArgosOperation,
)
from app.argos.services import (
    make_domain_candidates,
    unique_client_slug,
)
from app.downloads.storage import (
    delete_private_object,
    upload_private_object,
)


MAX_CNPJ_PDF_BYTES = 10 * 1024 * 1024


class ArgosIntakeError(RuntimeError):
    pass


def _remove_accents(
    value: str,
) -> str:
    normalized = unicodedata.normalize(
        "NFKD",
        value,
    )

    return "".join(
        char
        for char in normalized
        if not unicodedata.combining(
            char
        )
    )


def _label_key(
    value: str,
) -> str:
    """
    Rótulos da Receita podem sair como:
      DATA
      DA T A
      EST ABELECIMENT O
      F ANT ASIA

    Para reconhecer todos, removemos
    acentos, espaços e pontuação.
    """

    normalized = _remove_accents(
        value
    ).upper()

    return re.sub(
        r"[^A-Z0-9]+",
        "",
        normalized,
    )


def _repair_spaced_part(
    value: str,
) -> str:
    """
    O Cartão CNPJ real da Receita pode
    representar uma palavra assim:

        M E S T R E

    enquanto a separação ENTRE palavras
    aparece com dois espaços:

        M E S T R E  D A  O B R A

    Este helper identifica segmentos
    predominantemente compostos por
    caracteres unitários e remove somente
    o espaçamento artificial interno.
    """

    value = value.strip()

    if not value:
        return ""

    tokens = [
        token
        for token in value.split(" ")
        if token
    ]

    meaningful = []

    for token in tokens:
        cleaned = re.sub(
            r"[^0-9A-Za-zÀ-ÿ]",
            "",
            token,
        )

        if cleaned:
            meaningful.append(
                cleaned
            )

    if len(meaningful) >= 2:
        single_count = sum(
            1
            for token in meaningful
            if len(token) == 1
        )

        ratio = (
            single_count
            / len(meaningful)
        )

        if ratio >= 0.60:
            return "".join(
                tokens
            )

    return re.sub(
        r"[ \t]+",
        " ",
        value,
    ).strip()


def _repair_extracted_line(
    line: str,
) -> str:
    """
    Regra observada no PDF real da Receita:

      1 espaço  -> separação artificial
                   entre caracteres

      2 espaços -> separação real
                   entre palavras

    Exemplos:

      M E S T R E  D A  O B R A
      -> MESTRE DA OBRA

      V I L A  E D U A R D O
      -> VILA EDUARDO

      A V  M O N S E N H O R
      -> AV MONSENHOR

    Linhas convencionais como:

      MESTRE DA OBRA

    continuam intactas.
    """

    # Converte variantes Unicode de espaço
    # para SPACE normal, preservando a
    # quantidade de separadores.
    line = (
        line
        .replace("\u00a0", " ")
        .replace("\u202f", " ")
        .replace("\u2007", " ")
    )

    line = line.strip()

    if not line:
        return ""

    # Dois ou mais espaços são a fronteira
    # real entre palavras no PDF observado.
    parts = re.split(
        r" {2,}",
        line,
    )

    repaired = [
        _repair_spaced_part(
            part
        )
        for part in parts
    ]

    repaired = [
        part
        for part in repaired
        if part
    ]

    result = " ".join(
        repaired
    )

    # Limpeza puramente tipográfica.
    result = re.sub(
        r"\s+([,.;:])",
        r"\1",
        result,
    )

    result = re.sub(
        r"([(/])\s+",
        r"\1",
        result,
    )

    result = re.sub(
        r"\s+([)/])",
        r"\1",
        result,
    )

    return result.strip()


KNOWN_LABELS = {
    "NÚMERO DE INSCRIÇÃO",
    "DATA DE ABERTURA",
    "NOME EMPRESARIAL",
    (
        "TÍTULO DO ESTABELECIMENTO "
        "(NOME DE FANTASIA)"
    ),
    "PORTE",
    (
        "CÓDIGO E DESCRIÇÃO DA "
        "ATIVIDADE ECONÔMICA PRINCIPAL"
    ),
    (
        "CÓDIGO E DESCRIÇÃO DAS "
        "ATIVIDADES ECONÔMICAS SECUNDÁRIAS"
    ),
    (
        "CÓDIGO E DESCRIÇÃO DA "
        "NATUREZA JURÍDICA"
    ),
    "LOGRADOURO",
    "NÚMERO",
    "COMPLEMENTO",
    "CEP",
    "BAIRRO/DISTRITO",
    "MUNICÍPIO",
    "UF",
    "ENDEREÇO ELETRÔNICO",
    "TELEFONE",
    (
        "ENTE FEDERATIVO "
        "RESPONSÁVEL (EFR)"
    ),
    "SITUAÇÃO CADASTRAL",
    (
        "DATA DA SITUAÇÃO "
        "CADASTRAL"
    ),
    (
        "MOTIVO DE SITUAÇÃO "
        "CADASTRAL"
    ),
    "SITUAÇÃO ESPECIAL",
    (
        "DATA DA SITUAÇÃO "
        "ESPECIAL"
    ),
}


KNOWN_LABEL_KEYS = {
    _label_key(
        label
    )
    for label in KNOWN_LABELS
}


def _clean_lines(
    text: str,
) -> list[str]:
    lines = []

    for raw_line in text.splitlines():
        repaired = (
            _repair_extracted_line(
                raw_line
            )
        )

        if repaired:
            lines.append(
                repaired
            )

    return lines


def _value_after_label(
    lines: list[str],
    *aliases: str,
) -> str:
    aliases_keys = {
        _label_key(
            alias
        )
        for alias in aliases
    }

    for index, line in enumerate(
        lines
    ):
        if (
            _label_key(line)
            not in aliases_keys
        ):
            continue

        for candidate in lines[
            index + 1:
        ]:
            candidate_key = (
                _label_key(
                    candidate
                )
            )

            if not candidate_key:
                continue

            # Chegamos ao próximo campo
            # sem encontrar valor.
            if (
                candidate_key
                in KNOWN_LABEL_KEYS
            ):
                return ""

            if candidate_key in {
                "MATRIZ",
                "FILIAL",
            }:
                continue

            # Campos vazios da Receita
            # normalmente aparecem assim:
            # ********
            visible = re.sub(
                r"[\s*\-_.]+",
                "",
                candidate,
            )

            if not visible:
                return ""

            return candidate.strip()

    return ""


def extract_pdf_text(
    content: bytes,
) -> str:
    if not content.startswith(
        b"%PDF"
    ):
        raise ArgosIntakeError(
            "CNPJ_FILE_NOT_PDF"
        )

    try:
        reader = PdfReader(
            BytesIO(content)
        )

        pages = []

        for page in reader.pages:
            pages.append(
                page.extract_text()
                or ""
            )

        text = "\n".join(
            pages
        ).strip()

    except Exception as exc:
        raise ArgosIntakeError(
            "CNPJ_PDF_READ_FAILED: "
            f"{type(exc).__name__}: "
            f"{exc}"
        ) from exc

    if not text:
        raise ArgosIntakeError(
            "CNPJ_PDF_TEXT_NOT_EXTRACTABLE"
        )

    return text


def parse_cnpj_card_text(
    text: str,
) -> dict[str, str]:
    lines = _clean_lines(
        text
    )

    repaired_text = "\n".join(
        lines
    )

    cnpj_match = re.search(
        r"\b"
        r"\d{2}\.?\d{3}\.?\d{3}"
        r"/?\d{4}-?\d{2}"
        r"\b",
        repaired_text,
    )

    cnpj = (
        cnpj_match.group(0)
        if cnpj_match
        else ""
    )

    atividade = _value_after_label(
        lines,
        (
            "CÓDIGO E DESCRIÇÃO DA "
            "ATIVIDADE ECONÔMICA PRINCIPAL"
        ),
    )

    cnae_match = re.search(
        r"\b"
        r"\d{2}\.?\d{2}"
        r"-?\d"
        r"-?\d{2}"
        r"\b",
        atividade,
    )

    cnae = (
        cnae_match.group(0)
        if cnae_match
        else ""
    )

    atividade_descricao = atividade

    if cnae:
        atividade_descricao = (
            atividade.replace(
                cnae,
                "",
                1,
            )
            .lstrip(" -–—")
            .strip()
        )

    return {
        "cnpj": cnpj,
        "razao_social":
            _value_after_label(
                lines,
                "NOME EMPRESARIAL",
            ),
        "nome_fantasia":
            _value_after_label(
                lines,
                (
                    "TÍTULO DO ESTABELECIMENTO "
                    "(NOME DE FANTASIA)"
                ),
            ),
        "data_abertura":
            _value_after_label(
                lines,
                "DATA DE ABERTURA",
            ),
        "situacao_cadastral":
            _value_after_label(
                lines,
                "SITUAÇÃO CADASTRAL",
            ),
        "cnae_principal": cnae,
        "atividade_principal":
            atividade_descricao,
        "natureza_juridica":
            _value_after_label(
                lines,
                (
                    "CÓDIGO E DESCRIÇÃO "
                    "DA NATUREZA JURÍDICA"
                ),
            ),
        "logradouro":
            _value_after_label(
                lines,
                "LOGRADOURO",
            ),
        "numero":
            _value_after_label(
                lines,
                "NÚMERO",
            ),
        "complemento":
            _value_after_label(
                lines,
                "COMPLEMENTO",
            ),
        "bairro":
            _value_after_label(
                lines,
                "BAIRRO/DISTRITO",
            ),
        "cidade":
            _value_after_label(
                lines,
                "MUNICÍPIO",
            ),
        "estado":
            _value_after_label(
                lines,
                "UF",
            ),
        "cep":
            _value_after_label(
                lines,
                "CEP",
            ),
        "email":
            _value_after_label(
                lines,
                "ENDEREÇO ELETRÔNICO",
            ),
        "telefone":
            _value_after_label(
                lines,
                "TELEFONE",
            ),
    }


def _cnpj_digits(
    value: str,
) -> str:
    return re.sub(
        r"\D",
        "",
        value or "",
    )


def is_valid_cnpj(
    value: str,
) -> bool:
    digits = _cnpj_digits(
        value
    )

    if len(digits) != 14:
        return False

    if digits == digits[0] * 14:
        return False

    numbers = [
        int(char)
        for char in digits
    ]

    def calculate(
        base: list[int],
        weights: list[int],
    ) -> int:
        total = sum(
            number * weight
            for number, weight
            in zip(
                base,
                weights,
            )
        )

        remainder = total % 11

        if remainder < 2:
            return 0

        return 11 - remainder

    first = calculate(
        numbers[:12],
        [
            5, 4, 3, 2,
            9, 8, 7, 6,
            5, 4, 3, 2,
        ],
    )

    second = calculate(
        numbers[:13],
        [
            6, 5, 4, 3, 2,
            9, 8, 7, 6,
            5, 4, 3, 2,
        ],
    )

    return (
        first == numbers[12]
        and second == numbers[13]
    )


def create_cnpj_intake(
    db: Session,
    *,
    original_filename: str,
    mime_type: str,
    content: bytes,
    created_by_user_id: UUID | None,
) -> ArgosIntake:
    filename = str(
        original_filename
        or "cartao-cnpj.pdf"
    ).strip()

    content_type = str(
        mime_type
        or ""
    ).strip().lower()

    if (
        content_type
        not in {
            "application/pdf",
            "application/x-pdf",
        }
        and not filename.lower().endswith(
            ".pdf"
        )
    ):
        raise ArgosIntakeError(
            "CNPJ_FILE_MUST_BE_PDF"
        )

    if not content:
        raise ArgosIntakeError(
            "CNPJ_FILE_EMPTY"
        )

    if len(content) > MAX_CNPJ_PDF_BYTES:
        raise ArgosIntakeError(
            "CNPJ_FILE_TOO_LARGE"
        )

    text = extract_pdf_text(
        content
    )

    parsed = parse_cnpj_card_text(
        text
    )

    intake_id = uuid4()

    object_key = (
        "argos/intakes/"
        f"{intake_id}/"
        "cnpj-card.pdf"
    )

    upload_private_object(
        object_key,
        content=content,
        content_type="application/pdf",
    )

    intake = ArgosIntake(
        id=intake_id,
        document_type="CNPJ_CARD",
        status="parsed",
        original_filename=(
            filename[:255]
        ),
        object_key=object_key,
        mime_type="application/pdf",
        size_bytes=len(
            content
        ),
        extracted_text=text,
        extracted_data=parsed,
        parse_error=None,
        created_by_user_id=(
            created_by_user_id
        ),
    )

    try:
        db.add(
            intake
        )
        db.commit()
        db.refresh(
            intake
        )

    except Exception:
        db.rollback()

        try:
            delete_private_object(
                object_key
            )
        except Exception:
            pass

        raise

    return intake


def confirm_cnpj_intake(
    db: Session,
    *,
    intake: ArgosIntake,
    company_data: dict,
    created_by_user_id: UUID | None,
) -> ArgosOperation:
    if intake.operation_id:
        existing = db.get(
            ArgosOperation,
            intake.operation_id,
        )

        if existing:
            return existing

    if intake.status != "parsed":
        raise ArgosIntakeError(
            "CNPJ_INTAKE_NOT_READY"
        )

    normalized = {
        str(key): str(
            value or ""
        ).strip()
        for key, value
        in company_data.items()
    }

    cnpj = normalized.get(
        "cnpj",
        "",
    )

    razao_social = normalized.get(
        "razao_social",
        "",
    )

    nome_fantasia = normalized.get(
        "nome_fantasia",
        "",
    )

    if not is_valid_cnpj(
        cnpj
    ):
        raise ArgosIntakeError(
            "CNPJ_INVALID"
        )

    if len(razao_social) < 2:
        raise ArgosIntakeError(
            "RAZAO_SOCIAL_REQUIRED"
        )

    # Regra CNPJ-first:
    # domínio e nome da operação nascem
    # do nome fantasia CONFIRMADO.
    if len(nome_fantasia) < 2:
        raise ArgosIntakeError(
            "NOME_FANTASIA_REQUIRED"
        )

    now = datetime.now(
        timezone.utc
    )

    operation = ArgosOperation(
        company_name=(
            nome_fantasia
        ),
        client_slug=(
            unique_client_slug(
                db,
                nome_fantasia,
            )
        ),
        status="active",
        current_step=(
            "COMPANY_DATA_CONFIRMED"
        ),
        domain_candidates=(
            make_domain_candidates(
                nome_fantasia
            )
        ),
        company_data=normalized,
        company_data_confirmed_at=now,
        last_message=(
            "Dados do Cartão CNPJ "
            "confirmados. "
            "Pronta para seleção "
            "de domínio."
        ),
        created_by_user_id=(
            created_by_user_id
        ),
    )

    db.add(
        operation
    )

    db.flush()

    intake.status = "confirmed"
    intake.operation_id = operation.id
    intake.confirmed_at = now

    db.commit()

    db.refresh(
        operation
    )

    return operation
