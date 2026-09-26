from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / backend/.env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "janverify-api"
    environment: str = "development"
    log_level: str = "INFO"

    api_base_url: str = "http://localhost:8000"
    database_url: str = (
        "postgresql+psycopg://janverify:janverify_dev_password@localhost:5432/janverify"
    )
    cors_origins: str = "http://localhost:5173"
    jwt_secret: str = "change-me"
    llm_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()