from __future__ import annotations

from pathlib import PurePosixPath

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


class ArgosSitesStorageError(
    RuntimeError
):
    pass


def get_argos_sites_r2_client():
    required = {
        "ARGOS_SITES_R2_ENDPOINT_URL":
            settings.argos_sites_r2_endpoint_url,
        "ARGOS_SITES_R2_ACCESS_KEY_ID":
            settings.argos_sites_r2_access_key_id,
        "ARGOS_SITES_R2_SECRET_ACCESS_KEY":
            settings.argos_sites_r2_secret_access_key,
        "ARGOS_SITES_R2_BUCKET":
            settings.argos_sites_r2_bucket,
    }

    missing = [
        key
        for key, value in required.items()
        if not str(value or "").strip()
    ]

    if missing:
        raise ArgosSitesStorageError(
            "ARGOS_SITES_R2_NOT_CONFIGURED: "
            + ",".join(missing)
        )

    return boto3.client(
        "s3",
        endpoint_url=(
            settings
            .argos_sites_r2_endpoint_url
        ),
        aws_access_key_id=(
            settings
            .argos_sites_r2_access_key_id
        ),
        aws_secret_access_key=(
            settings
            .argos_sites_r2_secret_access_key
        ),
        region_name="auto",
    )


def normalize_site_path(
    value: str,
) -> str:
    raw = str(value or "").strip()

    if not raw:
        raise ArgosSitesStorageError(
            "SITE_PATH_REQUIRED"
        )

    if "\\" in raw:
        raise ArgosSitesStorageError(
            "SITE_PATH_INVALID"
        )

    path = PurePosixPath(raw)

    if path.is_absolute():
        raise ArgosSitesStorageError(
            "SITE_PATH_INVALID"
        )

    parts = path.parts

    if (
        not parts
        or any(
            part in {
                "",
                ".",
                "..",
            }
            for part in parts
        )
    ):
        raise ArgosSitesStorageError(
            "SITE_PATH_INVALID"
        )

    return "/".join(parts)


def site_object_key(
    *,
    hostname: str,
    relative_path: str,
) -> str:
    hostname = (
        str(hostname or "")
        .strip()
        .lower()
        .rstrip(".")
    )

    if (
        not hostname
        or "/" in hostname
        or "\\" in hostname
        or " " in hostname
    ):
        raise ArgosSitesStorageError(
            "SITE_HOSTNAME_INVALID"
        )

    path = normalize_site_path(
        relative_path
    )

    return (
        "sites/"
        + hostname
        + "/"
        + path
    )


def generate_site_upload_url(
    *,
    hostname: str,
    relative_path: str,
    content_type: str,
    job_id: str,
    operation_id: str,
) -> tuple[str, str]:
    content_type = str(
        content_type or ""
    ).strip()

    if not content_type:
        raise ArgosSitesStorageError(
            "SITE_CONTENT_TYPE_REQUIRED"
        )

    job_id = str(
        job_id or ""
    ).strip()

    operation_id = str(
        operation_id or ""
    ).strip()

    if not job_id:
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_JOB_ID_REQUIRED"
        )

    if not operation_id:
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_OPERATION_ID_REQUIRED"
        )

    object_key = site_object_key(
        hostname=hostname,
        relative_path=relative_path,
    )

    client = (
        get_argos_sites_r2_client()
    )

    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket":
                settings.argos_sites_r2_bucket,
            "Key":
                object_key,
            "ContentType":
                content_type,
            "CacheControl":
                (
                    "public, max-age=60"
                    if relative_path.lower()
                    .endswith(".html")
                    else "public, max-age=86400"
                ),
            "Metadata": {
                "argos-job-id":
                    job_id,
                "argos-operation-id":
                    operation_id,
            },
        },
        ExpiresIn=(
            settings
            .argos_sites_r2_presigned_expire_seconds
        ),
    )

    return (
        object_key,
        url,
    )



def verify_site_index_upload(
    *,
    hostname: str,
    job_id: str,
    operation_id: str,
) -> dict:
    """
    Confirma no R2 que o index.html existe
    e pertence ao job/operation atuais.

    Não confia somente no resultado enviado
    pelo Agent.
    """

    job_id = str(
        job_id or ""
    ).strip()

    operation_id = str(
        operation_id or ""
    ).strip()

    if not job_id:
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_JOB_ID_REQUIRED"
        )

    if not operation_id:
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_OPERATION_ID_REQUIRED"
        )

    object_key = site_object_key(
        hostname=hostname,
        relative_path="index.html",
    )

    client = (
        get_argos_sites_r2_client()
    )

    try:
        response = client.head_object(
            Bucket=(
                settings
                .argos_sites_r2_bucket
            ),
            Key=object_key,
        )

    except ClientError as exc:
        code = str(
            exc.response
            .get("Error", {})
            .get("Code", "")
        )

        raise ArgosSitesStorageError(
            "SITE_UPLOAD_INDEX_NOT_VERIFIED: "
            + object_key
            + "; code="
            + code
        ) from exc

    content_length = int(
        response.get(
            "ContentLength"
        )
        or 0
    )

    if content_length <= 0:
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_INDEX_EMPTY"
        )

    metadata = (
        response.get("Metadata")
        or {}
    )

    stored_job_id = str(
        metadata.get(
            "argos-job-id"
        )
        or ""
    ).strip()

    stored_operation_id = str(
        metadata.get(
            "argos-operation-id"
        )
        or ""
    ).strip()

    if stored_job_id != job_id:
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_JOB_METADATA_MISMATCH"
        )

    if (
        stored_operation_id
        != operation_id
    ):
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_OPERATION_METADATA_MISMATCH"
        )

    content_type = str(
        response.get(
            "ContentType"
        )
        or ""
    ).strip().lower()

    if (
        content_type
        and not content_type.startswith(
            "text/html"
        )
    ):
        raise ArgosSitesStorageError(
            "SITE_UPLOAD_INDEX_CONTENT_TYPE_INVALID"
        )

    return {
        "verified": True,
        "object_key":
            object_key,
        "content_length":
            content_length,
        "content_type":
            content_type,
    }
