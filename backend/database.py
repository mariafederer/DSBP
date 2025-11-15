import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Put the SQLite file in the project root (one level above backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "dsbp.db")

# SQLite URL
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# For SQLite + FastAPI we need check_same_thread=False
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

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