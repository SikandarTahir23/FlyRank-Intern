from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://capstone:capstone@localhost:5432/capstone"
    gemini_api_key: str = ""
    cosine_threshold: float = 0.72
    confidence_threshold: float = 0.75
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()