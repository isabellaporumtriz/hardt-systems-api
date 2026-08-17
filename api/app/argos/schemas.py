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
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


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
