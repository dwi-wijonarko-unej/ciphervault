from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import get_settings

settings = get_settings()

connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    if settings.database_url.startswith("sqlite:///./"):
        db_rel = settings.database_url.replace("sqlite:///./", "")
        Path(db_rel).parent.mkdir(parents=True, exist_ok=True)

    from backend.models import user  # noqa: F401

    Base.metadata.create_all(bind=engine)
