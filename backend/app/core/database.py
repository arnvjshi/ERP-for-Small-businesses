"""Database connection and session management."""
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# Build engine kwargs based on environment
engine_kwargs = {
    "pool_pre_ping": True,
}

if settings.is_serverless:
    # Vercel serverless: disable connection pooling since each invocation
    # is ephemeral and connections can't persist across function calls
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs.pop("pool_pre_ping", None)
elif settings.is_production:
    # Long-running production server: use connection pooling
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,  # Recycle connections every 30 minutes
    })

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
