from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Primary LLM Configuration
    primary_llm_provider: str = Field(
        default="openai",
        alias="PRIMARY_LLM_PROVIDER",
    )
    primary_llm_api_key: str = Field(default="", alias="PRIMARY_LLM_API_KEY")
    primary_llm_base_url: str = Field(
        default="http://www.zettacore.cyou/v1",
        alias="PRIMARY_LLM_BASE_URL",
    )
    primary_llm_model: str = Field(
        default="glm-5",
        alias="PRIMARY_LLM_MODEL",
    )

    # Backup LLM Configuration
    backup_llm_provider: str = Field(
        default="openai",
        alias="BACKUP_LLM_PROVIDER",
    )
    backup_llm_api_key: str = Field(default="", alias="BACKUP_LLM_API_KEY")
    backup_llm_base_url: str = Field(
        default="http://www.zettacore.cyou/v1",
        alias="BACKUP_LLM_BASE_URL",
    )
    backup_llm_model: str = Field(
        default="",
        alias="BACKUP_LLM_MODEL",
    )

    # Legacy GLM configuration for backward compatibility
    glm_api_key: str = Field(default="", alias="GLM_API_KEY")
    glm_base_url: str = Field(
        default="http://www.zettacore.cyou/v1",
        alias="GLM_BASE_URL",
    )
    glm_model: str = Field(default="glm-5", alias="GLM_MODEL")
    glm_backup_model: str = Field(default="", alias="GLM_BACKUP_MODEL")

    # Mem0 Configuration
    mem0_api_key: str = Field(default="", alias="MEM0_API_KEY")

    # Application
    app_name: str = Field(default="Debate Agent", alias="APP_NAME")
    debug: bool = Field(default=False, alias="DEBUG")
    cors_origins: str = Field(
        default=(
            "http://localhost:3000,"
            "http://127.0.0.1:3000,"
            "https://debate-agent.vercel.app"
        ),
        alias="CORS_ORIGINS",
    )
    database_path: str = Field(default="", alias="DATABASE_PATH")
    llm_timeout_seconds: float = Field(
        default=45.0,
        alias="LLM_TIMEOUT_SECONDS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Parse configured CORS origins."""
        origins = [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
        return origins or ["http://localhost:3000"]

    @property
    def resolved_primary_llm_api_key(self) -> str:
        if self.primary_llm_api_key:
            return self.primary_llm_api_key
        if self.primary_llm_provider == "openai":
            return self.glm_api_key
        return ""

    @property
    def resolved_primary_llm_base_url(self) -> str:
        return self.primary_llm_base_url or self.glm_base_url

    @property
    def resolved_primary_llm_model(self) -> str:
        return self.primary_llm_model or self.glm_model

    @property
    def resolved_backup_llm_api_key(self) -> str:
        return self.backup_llm_api_key or self.glm_api_key

    @property
    def resolved_backup_llm_base_url(self) -> str:
        return self.backup_llm_base_url or self.glm_base_url

    @property
    def resolved_backup_llm_model(self) -> str:
        return self.backup_llm_model or self.glm_backup_model


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
