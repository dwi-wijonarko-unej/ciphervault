from pathlib import Path

from sqlalchemy import create_engine, text
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


def _migrate_columns() -> None:
    """Add new columns to existing tables (SQLite-safe via PRAGMA).

    SQLAlchemy's create_all does not alter existing tables, so we manually
    add columns that were introduced after the initial schema.
    """
    migrations = [
        ("users", "role", "VARCHAR(10) DEFAULT 'user' NOT NULL"),
        ("users", "is_active", "BOOLEAN DEFAULT 1"),
        ("stored_files", "parent_id", "INTEGER"),
        ("stored_files", "is_directory", "BOOLEAN DEFAULT 0"),
    ]
    with engine.connect() as conn:
        for table, column, definition in migrations:
            existing = {
                row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))
            }
            if column not in existing:
                conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                )
        conn.commit()


def init_db() -> None:
    if settings.database_url.startswith("sqlite:///./"):
        db_rel = settings.database_url.replace("sqlite:///./", "")
        Path(db_rel).parent.mkdir(parents=True, exist_ok=True)

    import backend.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_columns()
