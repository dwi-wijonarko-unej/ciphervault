from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.crypto import (
    aes_decrypt,
    compute_sha256,
    derive_user_key,
    generate_key_matrix,
    uhc_decrypt,
    unwrap_key,
)
from backend.models import ActivityLog, FileKey, Share, StoredFile, User
from backend.storage import storage

settings = get_settings()


class DownloadService:
    @staticmethod
    def download(file_id: int, user: User, db: Session) -> bytes:
        # 1. verify ownership — owner or recipient
        file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        is_owner = file.owner_id == user.id
        is_recipient = False
        if not is_owner:
            share = (
                db.query(Share)
                .filter(
                    Share.file_id == file_id,
                    Share.recipient_id == user.id,
                    Share.revoked == False,
                )
                .first()
            )
            if share:
                is_recipient = True

        if not is_owner and not is_recipient:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: you do not have permission to download this file",
            )

        # 2. get file key record
        key = db.query(FileKey).filter(FileKey.file_id == file.id).first()
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File key not found",
            )

        # 3. read ciphertext from storage
        if not storage.exists(file.filename_stored):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ciphertext not found in storage",
            )
        cipher_aes = storage.read(file.filename_stored)

        # 4. get the correct wrapped key
        if is_recipient:
            share = (
                db.query(Share)
                .filter(
                    Share.file_id == file_id,
                    Share.recipient_id == user.id,
                    Share.revoked == False,
                )
                .first()
            )
            if not share:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Share record not found or revoked",
                )
            wrapped_key = share.wrapped_session_key
        else:
            wrapped_key = key.wrapped_session_key

        # 5. derive user key (same method as upload_service)
        user_key = derive_user_key(user.derived_key_hash, user.salt)

        # 6. unwrap session key
        try:
            session_key = unwrap_key(wrapped_key, user_key)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: unable to decrypt session key",
            ) from exc

        # 7. AES decrypt → cipher_u
        iv_aes = bytes.fromhex(key.iv_aes)
        cipher_u = aes_decrypt(cipher_aes, session_key, iv_aes)

        # 8. Generate key matrix from metadata
        metadata = _parse_json(key.metadata_json)
        matrix_size = metadata.get("matrix_size", settings.uhc_matrix_size)
        logistic_r = metadata.get("logistic_r", settings.uhc_logistic_r)

        key_matrix = generate_key_matrix(
            matrix_size=matrix_size,
            seed_source=session_key,
            modulus=settings.uhc_modulus,
            r=logistic_r,
        )

        # 9. UHC decrypt → plaintext (pas metadata dict, bukan iv)
        uhc_metadata = {
            "original_length": file.file_size_original,
            "matrix_size": matrix_size,
            "modulus": settings.uhc_modulus,
        }
        plaintext = uhc_decrypt(
            cipher_u, key_matrix, settings.uhc_modulus, uhc_metadata
        )

        # 10. verify integrity
        expected_hash = key.plaintext_hash
        actual_hash = compute_sha256(plaintext)

        if actual_hash != expected_hash:
            db.add(
                ActivityLog(
                    user_id=user.id,
                    file_id=file.id,
                    action="integrity_fail",
                    details=(
                        f"Integrity check FAILED for {file.filename_original} "
                        f"(ID {file.id}). Expected {expected_hash}, got {actual_hash}"
                    ),
                )
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Integrity check failed: file may be corrupted",
            )

        # 11. log activity
        db.add(
            ActivityLog(
                user_id=user.id,
                file_id=file.id,
                action="download",
                details=f"Downloaded {Path(file.filename_original).name}",
            )
        )
        db.commit()

        return plaintext


def _parse_json(text: str) -> dict:
    import json

    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return {}
