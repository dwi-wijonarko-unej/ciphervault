"""Seed a fresh demo database with realistic dummy data for UI screenshots.

Usage:
    python scripts/seed_demo_data.py

Creates:
    - data/ciphervault_demo.db   (fresh SQLite database)
    - data/demo_storage/         (random ciphertext blobs for security analysis)

The database is created from scratch every run. All seeded values are dummy
data meant to showcase the CipherVault UI for copyright documentation.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import random
import secrets
import shutil
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow running from repo root or scripts/ dir
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

os.environ["DATABASE_URL"] = "sqlite:///./data/ciphervault_demo.db"
os.environ["STORAGE_PATH"] = "./data/demo_storage"

from sqlalchemy.orm import Session

from backend.crypto.key_manager import derive_user_key, rsa_wrap_key, wrap_key
from backend.crypto.rsa_engine import load_or_create_global_keypair
from backend.database import Base, engine, init_db
from backend.models import (
    ActivityLog,
    ApiKey,
    FileKey,
    PublicLink,
    Share,
    StoredFile,
    User,
)
from backend.utils.security import (
    derive_key_hash,
    generate_salt,
    hash_password,
)

DEMO_DB = Path("data/ciphervault_demo.db")
DEMO_STORAGE = Path("data/demo_storage")


from backend.config import get_settings


def _hash_api_key(raw_key: str) -> str:
    """HMAC-SHA256 hash matching the api_key_service implementation."""
    settings = get_settings()
    return hmac.new(
        settings.secret_key.encode(), raw_key.encode(), hashlib.sha256
    ).hexdigest()


def now(**kwargs) -> datetime:
    return datetime.now(timezone.utc) - timedelta(**kwargs)


# ── Dummy data definitions ─────────────────────────────────────────────

USERS = [
    # (username, email, role, password, is_active)
    ("dwijonarko", "dwi-wijonarko@unej.ac.id", "admin", "Admin123!", True),
    ("budi", "budi@example.com", "user", "User123!", True),
    ("sari", "sari@example.com", "user", "User123!", True),
    ("rina", "rina@example.com", "user", "User123!", True),
    ("agus", "agus@example.com", "user", "User123!", True),
    ("dewi", "dewi@example.com", "user", "User123!", False),
    ("admin", "admin@ciphervault.io", "admin", "Admin123!", True),
]

FILES = [
    # (owner, name, mime, size_original, size_encrypted, folder)
    ("dwijonarko", "Proposal_Riset_Keamanan.pdf", "application/pdf", 2457600, 2457900, "Riset"),
    ("dwijonarko", "Laporan_Keuangan_Q2_2026.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1153434, 1153800, "Keuangan"),
    ("dwijonarko", "Foto_Tim_Project.jpg", "image/jpeg", 4194304, 4194700, "Gambar"),
    ("dwijonarko", "Source_Code_CipherVault_v2.zip", "application/zip", 8388608, 8389100, None),
    ("dwijonarko", "README_Instalasi.md", "text/markdown", 3584, 3900, None),
    ("dwijonarko", "Presentasi_Defense_Q3.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", 5242880, 5243300, "Dokumen"),
    ("dwijonarko", "Arsitektur_UHC_AES.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1835008, 1835400, "Dokumen"),
    ("dwijonarko", "Data_Uji_Entropy.csv", "text/csv", 262144, 262500, "Riset"),
    ("dwijonarko", "Skema_Kunci_RSA.png", "image/png", 1258291, 1258600, "Gambar"),
    ("dwijonarko", "Backup_Database_20260706.sql", "application/sql", 13212058, 13212400, None),
    ("dwijonarko", "Jadwal_Rapat_Tim.ics", "text/calendar", 8192, 8400, None),
    ("dwijonarko", "Catatan_Rapat_20260701.txt", "text/plain", 2048, 2300, "Dokumen"),
    ("budi", "Dokumentasi_API.html", "text/html", 12288, 13100, None),
    ("budi", "Logo_Perusahaan.png", "image/png", 65536, 65800, None),
    ("sari", "Data_Penelitian_Lapangan.csv", "text/csv", 524288, 524600, None),
]

FOLDERS = [
    ("dwijonarko", "Dokumen"),
    ("dwijonarko", "Riset"),
    ("dwijonarko", "Keuangan"),
    ("dwijonarko", "Gambar"),
]

SHARES = [
    # (file_name, owner, recipient, hours_offset, expires_hours)
    ("Proposal_Riset_Keamanan.pdf", "dwijonarko", "budi", 120, None),
    ("Laporan_Keuangan_Q2_2026.xlsx", "dwijonarko", "sari", 96, 720),
    ("Dokumentasi_API.html", "budi", "dwijonarko", 72, None),
    ("Logo_Perusahaan.png", "budi", "dwijonarko", 48, 336),
    ("Data_Penelitian_Lapangan.csv", "sari", "dwijonarko", 24, None),
]

API_KEYS = [
    # (owner, label, active, expires_in_days, last_used_hours_ago)
    ("dwijonarko", "produksi", True, 180, 5),
    ("dwijonarko", "ci-cd-pipeline", True, None, 26),
    ("dwijonarko", "analitik-lama", False, -30, 720),
]

PUBLIC_LINKS = [
    # (file_name, owner, password, max_access, access_count, active, expires_hours)
    ("Proposal_Riset_Keamanan.pdf", "dwijonarko", None, None, 12, True, None),
    ("README_Instalasi.md", "dwijonarko", "rahasia123", 20, 8, True, 720),
    ("Foto_Tim_Project.jpg", "dwijonarko", None, 5, 5, False, -168),
]

ACTIVITIES = [
    # (action, file_name, hours_ago, details)
    ("upload", "Catatan_Rapat_20260701.txt", 2, "File uploaded — encrypted with UHC(mod257,M8,R3.99)+AES-256-CBC+RSA-OAEP"),
    ("share", "Laporan_Keuangan_Q2_2026.xlsx", 5, "Shared with user sari"),
    ("download", "Proposal_Riset_Keamanan.pdf", 9, "File downloaded — RSA unwrap + AES decrypt + UHC decrypt"),
    ("verify", "Foto_Tim_Project.jpg", 26, "Integrity check passed (SHA-256)"),
    ("upload", "Backup_Database_20260706.sql", 30, "File uploaded — adaptive split ratio 0.95"),
    ("login", None, 34, "Login from 192.168.1.10"),
    ("share", "Proposal_Riset_Keamanan.pdf", 50, "Shared with user budi"),
    ("delete", None, 74, "File 'draft_old.txt' deleted permanently"),
    ("upload", "Data_Uji_Entropy.csv", 98, "File uploaded — security score 91/100"),
    ("verify", "README_Instalasi.md", 122, "Integrity check passed (SHA-256)"),
    ("upload", "Presentasi_Defense_Q3.pptx", 146, "File uploaded — matrix_size AI selected n=8"),
    ("login", None, 170, "Login from 192.168.1.10"),
    ("download", "Source_Code_CipherVault_v2.zip", 196, "File downloaded — RSA unwrap + AES decrypt + UHC decrypt"),
    ("share", "Data_Penelitian_Lapangan.csv", 240, "Shared with user dwijonarko"),
    ("upload", "Skema_Kunci_RSA.png", 300, "File uploaded — encrypted with UHC(mod257,M4,R3.99)+AES-256-CBC+RSA-OAEP"),
    ("verify", "Arsitektur_UHC_AES.docx", 380, "Integrity check passed (SHA-256)"),
]


def seed() -> None:
    # Wipe previous demo artifacts
    if DEMO_DB.exists():
        DEMO_DB.unlink()
    if DEMO_STORAGE.exists():
        shutil.rmtree(DEMO_STORAGE)
    DEMO_STORAGE.mkdir(parents=True, exist_ok=True)

    init_db()
    load_or_create_global_keypair()

    from backend.database import SessionLocal

    session = SessionLocal()
    try:
        _seed_users(session)
        _seed_files(session)
        _seed_links(session)
        _seed_activities(session)
        session.commit()
    finally:
        session.close()

    print("Demo database seeded:")
    print(f"  DB:      {DEMO_DB}")
    print(f"  Storage: {DEMO_STORAGE} ({len(list(DEMO_STORAGE.glob('*.bin')))} ciphertext files)")


def _seed_users(session: Session) -> None:
    for username, email, role, password, is_active in USERS:
        salt = generate_salt()
        session.add(
            User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                salt=salt,
                derived_key_hash=derive_key_hash(password, salt, 100000),
                role=role,
                is_active=is_active,
                created_at=now(days=random.randint(90, 400)),
            )
        )
    session.flush()


def _user(session: Session, username: str) -> User:
    return session.query(User).filter(User.username == username).one()


def _seed_files(session: Session) -> None:
    user_cache: dict[str, User] = {}
    for username, *_ in USERS:
        user_cache[username] = _user(session, username)

    folder_cache: dict[tuple[str, str], StoredFile] = {}
    for owner, name in FOLDERS:
        folder = StoredFile(
            owner_id=user_cache[owner].id,
            filename_original=name,
            filename_stored=f"dir_{owner}_{name}_{secrets.token_hex(4)}",
            mime_type="directory",
            file_size_original=0,
            file_size_encrypted=0,
            encryption_type="N/A",
            is_directory=True,
            created_at=now(days=200),
            updated_at=now(days=200),
        )
        session.add(folder)
        session.flush()
        folder_cache[(owner, name)] = folder

    for owner, name, mime, size_orig, size_enc, folder_name in FILES:
        owner_user = user_cache[owner]
        folder = folder_cache.get((owner, folder_name)) if folder_name else None

        # Realistic random ciphertext blob for security analysis
        ciphertext = secrets.token_bytes(size_enc)
        stored_name = f"{secrets.token_hex(16)}.bin"
        (DEMO_STORAGE / stored_name).write_bytes(ciphertext)

        session_key = secrets.token_bytes(32)
        user_key = derive_user_key(owner_user.derived_key_hash, owner_user.salt)
        wrapped_key = wrap_key(session_key, user_key)
        rsa_wrapped_key = rsa_wrap_key(session_key)

        ai_modes = ["multi_feature_adaptive", "legacy"]
        matrix_sizes = [4, 8]
        logistic_rs = [3.923, 3.99]
        matrix_size = random.choice(matrix_sizes)
        logistic_r = random.choice(logistic_rs)

        metadata = {
            "ai_mode": random.choice(ai_modes),
            "split_ratio": round(random.uniform(0.9, 0.99), 2),
            "matrix_size": matrix_size,
            "modulus": 257,
            "logistic_r": logistic_r,
            "uhc": {
                "matrix_size": matrix_size,
                "logistic_r": logistic_r,
                "iterations": random.randint(3, 8),
            },
            "ai_decision": {
                "strategy": "multi_feature_adaptive",
                "class": random.choice(["text", "image", "document", "archive"]),
                "matrix_size": matrix_size,
                "reason": "adaptive split + entropy threshold",
                "confidence": round(random.uniform(0.82, 0.97), 2),
            },
        }

        created = now(days=random.randint(3, 120), hours=random.randint(0, 23))
        stored_file = StoredFile(
            owner_id=owner_user.id,
            filename_original=name,
            filename_stored=stored_name,
            mime_type=mime,
            file_size_original=size_orig,
            file_size_encrypted=size_enc,
            encryption_type=f"UHC(mod257,M{matrix_size},R{logistic_r})+AES+RSA",
            parent_id=folder.id if folder else None,
            created_at=created,
            updated_at=created,
        )
        session.add(stored_file)
        session.flush()

        session.add(
            FileKey(
                file_id=stored_file.id,
                wrapped_session_key=wrapped_key,
                rsa_wrapped_session_key=rsa_wrapped_key,
                iv_aes=secrets.token_hex(16),
                iv_uhc=secrets.token_hex(16),
                plaintext_hash=secrets.token_hex(32),
                metadata_json=json.dumps(metadata, separators=(",", ":"), sort_keys=True),
                created_at=created,
            )
        )


def _seed_links(session: Session) -> None:
    def file_by_name(session: Session, owner: str, name: str) -> StoredFile:
        owner_user = _user(session, owner)
        return (
            session.query(StoredFile)
            .filter(
                StoredFile.owner_id == owner_user.id,
                StoredFile.filename_original == name,
                StoredFile.is_directory == False,
            )
            .one()
        )

    def user_key_for(session: Session, username: str) -> bytes:
        u = _user(session, username)
        return derive_user_key(u.derived_key_hash, u.salt)

    # Shares
    for file_name, owner, recipient, hours_ago, expires_hours in SHARES:
        f = file_by_name(session, owner, file_name)
        owner_user = _user(session, owner)
        recipient_user = _user(session, recipient)
        session_key = secrets.token_bytes(32)
        wrapped = wrap_key(session_key, user_key_for(session, recipient))
        session.add(
            Share(
                file_id=f.id,
                owner_id=owner_user.id,
                recipient_id=recipient_user.id,
                wrapped_session_key=wrapped,
                access_token=f"tok_{secrets.token_urlsafe(16)}",
                created_at=now(hours=hours_ago),
                expires_at=now(hours=hours_ago) + timedelta(hours=expires_hours)
                if expires_hours
                else None,
                revoked=False,
            )
        )

    # API keys — raw keys are discarded; only hashes are stored
    for owner, label, active, expires_days, last_used_hours in API_KEYS:
        owner_user = _user(session, owner)
        raw_key = f"cv_{secrets.token_urlsafe(24)}"
        session.add(
            ApiKey(
                user_id=owner_user.id,
                key_hash=_hash_api_key(raw_key),
                key_prefix=raw_key[:12],
                label=label,
                is_active=active,
                last_used=now(hours=last_used_hours) if last_used_hours else None,
                created_at=now(days=random.randint(30, 120)),
                expires_at=now(days=expires_days) if expires_days else None,
            )
        )

    # Public links
    for file_name, owner, password, max_access, access_count, active, expires_hours in PUBLIC_LINKS:
        f = file_by_name(session, owner, file_name)
        owner_user = _user(session, owner)
        created = now(days=random.randint(10, 60))
        session.add(
            PublicLink(
                file_id=f.id,
                owner_id=owner_user.id,
                token=secrets.token_urlsafe(24),
                password_hash=hash_password(password) if password else None,
                access_count=access_count,
                max_access=max_access,
                is_active=active,
                created_at=created,
                expires_at=created + timedelta(hours=expires_hours)
                if expires_hours
                else None,
            )
        )


def _seed_activities(session: Session) -> None:
    dwijonarko = _user(session, "dwijonarko")
    files: dict[str, StoredFile] = {
        f.filename_original: f
        for f in session.query(StoredFile)
        .filter(StoredFile.owner_id == dwijonarko.id)
        .all()
    }

    for action, file_name, hours_ago, details in ACTIVITIES:
        f = files.get(file_name) if file_name else None
        session.add(
            ActivityLog(
                user_id=dwijonarko.id,
                file_id=f.id if f else None,
                action=action,
                details=details,
                timestamp=now(hours=hours_ago),
            )
        )

    # A few activity entries from other users for admin stats view
    budi = _user(session, "budi")
    sari = _user(session, "sari")
    session.add(
        ActivityLog(
            user_id=budi.id,
            file_id=files.get("Proposal_Riset_Keamanan.pdf").id,
            action="download",
            details="Downloaded shared file — RSA unwrap + AES decrypt + UHC decrypt",
            timestamp=now(hours=8),
        )
    )
    session.add(
        ActivityLog(
            user_id=sari.id,
            action="login",
            details="Login from 192.168.1.24",
            timestamp=now(hours=3),
        )
    )


if __name__ == "__main__":
    seed()
