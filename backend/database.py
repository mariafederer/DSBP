import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.config import settings

# Default to a local SQLite database if no DATABASE_URL is provided or usable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DEFAULT_DB_PATH = os.path.join(PROJECT_ROOT, "dsbp.db")


def _build_engine():
    """Create the SQLAlchemy engine, preferring the configured DATABASE_URL."""
    database_url = settings.DATABASE_URL if getattr(settings, "DATABASE_URL", None) else None

    # Attempt to use the configured database URL if available
    if database_url:
        try:
            engine = create_engine(database_url)
            # Ensure the target database is reachable; otherwise fall back to SQLite
            with engine.connect() as connection:  # noqa: F841
                pass
            return engine
        except ModuleNotFoundError:
            # Some SQL drivers (e.g. psycopg2) might be missing in the execution environment.
            # Fall back to SQLite so the application continues to function.
            pass
        except Exception:
            # Connection errors or inaccessible databases should not break local development.
            pass

    # Fall back to SQLite stored in the project root
    sqlite_url = f"sqlite:///{DEFAULT_DB_PATH}"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = _build_engine()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for your models
Base = declarative_base()


# Optional helper if your code uses dependency injection (FastAPI style)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
