from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # GLM API Configuration
    glm_api_key: str = Field(default="", alias="GLM_API_KEY")
    glm_base_url: str = Field(
        default="http://www.zettacore.cyou/v1",
        alias="GLM_BASE_URL",
    )
    glm_model: str = Field(default="glm-5", alias="GLM_MODEL")

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


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
