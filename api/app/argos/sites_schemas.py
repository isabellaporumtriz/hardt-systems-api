from __future__ import annotations

from pydantic import BaseModel, Field


class ArgosSiteUploadFileRequest(
    BaseModel
):
    path: str = Field(
        min_length=1,
        max_length=500,
    )

    content_type: str = Field(
        min_length=1,
        max_length=120,
    )

    size_bytes: int = Field(
        ge=1,
        le=25 * 1024 * 1024,
    )


class ArgosSiteUploadManifestRequest(
    BaseModel
):
    worker_id: str = Field(
        min_length=1,
        max_length=180,
    )

    files: list[
        ArgosSiteUploadFileRequest
    ] = Field(
        min_length=1,
        max_length=250,
    )


class ArgosSiteUploadEntry(
    BaseModel
):
    path: str
    object_key: str
    put_url: str
    headers: dict[str, str]


class ArgosSiteUploadManifestResponse(
    BaseModel
):
    hostname: str
    expires_in_seconds: int
    uploads: list[
        ArgosSiteUploadEntry
    ]
