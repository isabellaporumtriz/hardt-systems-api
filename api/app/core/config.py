from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    asaas_environment: str = "sandbox"
    asaas_base_url: str = "https://api-sandbox.asaas.com/v3"
    asaas_api_key: str = ""
    asaas_webhook_token: str = ""
    app_name: str = "Hardt Systems API"
    app_version: str = "1.0.0"
    debug: bool = True

    database_url: str

    secret_key: str
    license_encryption_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
