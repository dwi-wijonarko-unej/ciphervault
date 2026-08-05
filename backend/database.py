from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import get_settings

settings = get_settings()

_is_sqlite = settings.database_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if _is_sqlite else {}
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=not _is_sqlite,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _existing_columns(conn, table: str) -> set[str]:
    """Return existing column names for a table, dialect-aware."""
    if _is_sqlite:
        return {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
    # PostgreSQL / other ANSI-compliant databases
    rows = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :table"
        ),
        {"table": table},
    )
    return {row[0] for row in rows}


def _migrate_columns() -> None:
    """Add new columns to existing tables that were introduced after the
    initial schema.

    On a fresh database this is a no-op (``create_all`` already created the
    full schema). On an existing database (e.g. an older SQLite install) it
    backfills columns via ALTER TABLE. Dialect-aware: uses PRAGMA for SQLite
    and information_schema for PostgreSQL/ANSI databases.
    """
    migrations = [
        ("users", "role", "VARCHAR(10) DEFAULT 'user' NOT NULL"),
        ("users", "is_active", "BOOLEAN DEFAULT TRUE"),
        ("stored_files", "parent_id", "INTEGER"),
        ("stored_files", "is_directory", "BOOLEAN DEFAULT FALSE"),
    ]
    with engine.connect() as conn:
        for table, column, definition in migrations:
            if column in _existing_columns(conn, table):
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        conn.commit()


def init_db() -> None:
    if _is_sqlite:
        db_rel = settings.database_url.replace("sqlite:///./", "")
        Path(db_rel).parent.mkdir(parents=True, exist_ok=True)

    import backend.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_columns()
