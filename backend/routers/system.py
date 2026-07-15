from __future__ import annotations

import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.crypto.rsa_engine import load_or_create_global_keypair
from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import StoredFile, User

router = APIRouter(prefix="/system", tags=["system"])
settings = get_settings()


def _format_bytes(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


@router.get("/config")
def system_config(_: User = Depends(get_current_user)) -> dict[str, object]:
    return {
        "ai_mode": "adaptive_split",
        "layer2_algorithm": "AES-256-CBC + RSA-OAEP",
        "uhc_modulus": settings.uhc_modulus,
        "uhc_matrix_size": settings.uhc_matrix_size,
        "uhc_logistic_r": settings.uhc_logistic_r,
        "session_key_bytes": settings.session_key_bytes,
        "pbkdf2_iterations": settings.pbkdf2_iterations,
        "storage_path": settings.storage_path,
        "database_url": settings.database_url,
    }


@router.get("/status")
def system_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict[str, object]:
    private_key, public_key = load_or_create_global_keypair()
    storage_root = Path(settings.storage_path)
    storage_root.mkdir(parents=True, exist_ok=True)

    files = [p for p in storage_root.rglob("*") if p.is_file()]
    used = sum(p.stat().st_size for p in files)

    encrypted_count = db.query(func.count(StoredFile.id)).scalar() or 0

    return {
        "rsa_status": "ready" if private_key and public_key else "not_ready",
        "rsa_key_size": settings.rsa_key_size,
        "rsa_fingerprint": hashlib.sha256(public_key).hexdigest()[:16],
        "rsa_generated_at": "available",
        "storage_files": encrypted_count,
        "storage_used": _format_bytes(used),
        "storage_limit": "100 MB",
        "database": "SQLite" if settings.database_url.startswith("sqlite") else "SQL",
    }
