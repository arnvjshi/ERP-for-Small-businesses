"""Core configuration loaded from environment variables."""
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://laundrybros:laundrybros_dev_password@localhost:5432/laundrybros"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://admin.localhost:3000,http://work.localhost:3000"

    # API prefix — useful when deploying behind a reverse proxy path
    # e.g., set to "/api/v1" to serve all routes under that prefix
    API_PREFIX: str = ""

    # Gunicorn (production)
    GUNICORN_WORKERS: int = 4
    GUNICORN_TIMEOUT: int = 120

    @model_validator(mode="after")
    def fix_database_url_scheme(self):
        """Convert postgres:// to postgresql:// for SQLAlchemy 2.x compatibility.

        Services like Aiven, Heroku, and Supabase use postgres:// but
        SQLAlchemy 2.x only accepts postgresql:// as the dialect.
        """
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace(
                "postgres://", "postgresql://", 1
            )
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_serverless(self) -> bool:
        """Detect Vercel serverless environment."""
        import os
        return os.environ.get("VERCEL", "") == "1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
        case_sensitive = True


settings = Settings()
