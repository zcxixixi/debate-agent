from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # GLM API Configuration
    glm_api_key: str = ""
    glm_base_url: str = "http://www.zettacore.cyou/v1"
    glm_model: str = "glm-5"

    # Mem0 Configuration
    mem0_api_key: str = ""

    # Application
    app_name: str = "Debate Agent"
    debug: bool = False

    class Config:
        env_file = ".env"
        env_prefix = ""  # No prefix, use exact env var names


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()