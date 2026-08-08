import boto3

from app.core.config import settings


def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def generate_download_url(
    object_key: str,
    *,
    file_name: str,
) -> str:
    client = get_r2_client()

    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": object_key,
            "ResponseContentDisposition": (
                f'attachment; filename="{file_name}"'
            ),
        },
        ExpiresIn=settings.r2_presigned_expire_seconds,
    )
