"""DSBP Configuration Settings."""

from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Database
    DATABASE_URL: Optional[str] = None

    # JWT
    JWT_SECRET_KEY: str = Field(default="dev-secret-key-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Application
    APP_NAME: str = "DSBP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@dsbp.com"
    SMTP_FROM_NAME: str = "DSBP"
    
    # License
    FREE_USER_BOARD_LIMIT: int = 3
    PAID_USER_BOARD_LIMIT: int = -1  # -1 means unlimited
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Return the configured CORS origins as a sanitized list."""

        if not self.CORS_ORIGINS:
            return []

        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

