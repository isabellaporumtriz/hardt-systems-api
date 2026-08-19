from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OperationCreateRequest(BaseModel):

    company_name: str = Field(
        min_length=2,
        max_length=180,
    )


class OperationResponse(BaseModel):

    id: UUID

    company_name: str
    client_slug: str

    status: str
    current_step: str

    domain_candidates: list[str]

    domain: str | None
    site_url: str | None
    business_id: str | None

    last_message: str | None

    company_data: dict | None

    company_data_confirmed_at: (
        datetime | None
    )

    legacy_reconciliation_status: (
        str | None
    )

    legacy_source: str | None
    legacy_evidence: dict | None

    legacy_reconciled_at: (
        datetime | None
    )

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class CnpjCompanyData(BaseModel):

    cnpj: str = ""

    razao_social: str = ""
    nome_fantasia: str = ""

    data_abertura: str = ""
    situacao_cadastral: str = ""

    cnae_principal: str = ""
    atividade_principal: str = ""

    natureza_juridica: str = ""

    logradouro: str = ""
    numero: str = ""
    complemento: str = ""

    bairro: str = ""
    cidade: str = ""
    estado: str = ""
    cep: str = ""

    email: str = ""
    telefone: str = ""


class CnpjIntakeResponse(BaseModel):

    id: UUID

    document_type: str
    status: str

    original_filename: str

    mime_type: str
    size_bytes: int

    extracted_data: dict | None
    parse_error: str | None

    operation_id: UUID | None

    confirmed_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class CnpjIntakeConfirmRequest(
    BaseModel
):

    company_data: CnpjCompanyData


class ArgosCnpjBatchItemResponse(BaseModel):

    id: UUID
    batch_id: UUID

    row_number: int

    cnpj_original: str
    cnpj_normalized: str | None

    status: str
    error: str | None

    operation_id: UUID | None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ArgosCnpjBatchResponse(BaseModel):

    id: UUID

    status: str

    original_filename: str
    mime_type: str
    size_bytes: int

    total_rows: int
    valid_count: int
    duplicate_count: int
    invalid_count: int

    created_by_user_id: UUID | None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ArgosCnpjBatchDetailResponse(
    ArgosCnpjBatchResponse
):

    items: list[
        ArgosCnpjBatchItemResponse
    ]



class LegacyReconciliationDecisionRequest(
    BaseModel
):

    decision: str = Field(
        min_length=6,
        max_length=7,
    )


class JobCreateRequest(BaseModel):

    action: str

    selected_domain: str | None = Field(
        default=None,
        min_length=1,
        max_length=253,
    )


class JobResponse(BaseModel):

    id: UUID
    operation_id: UUID

    action: str
    status: str

    payload: dict
    result: dict | None

    error: str | None

    worker_id: str | None

    claimed_at: datetime | None
    finished_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class WorkerClaimRequest(BaseModel):

    worker_id: str = Field(
        min_length=2,
        max_length=180,
    )


class WorkerClaimResponse(BaseModel):

    job: JobResponse | None


class WorkerCompleteRequest(BaseModel):

    worker_id: str
    result: dict


class WorkerFailRequest(BaseModel):

    worker_id: str

    error: str = Field(
        min_length=1,
        max_length=5000,
    )
