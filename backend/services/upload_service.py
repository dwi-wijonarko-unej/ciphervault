from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.crypto import (
    adaptive_matrix,
    adaptive_split,
    aes_encrypt,
    analyze_file,
    choose_matrix_size_by_split,
    classify_file_type,
    compute_sha256,
    derive_user_key,
    extract_features,
    generate_key_matrix,
    generate_metadata,
    generate_session_key,
    rsa_wrap_key,
    uhc_encrypt,
    wrap_key,
)
from backend.models import ActivityLog, FileKey, StoredFile, User
from backend.schemas.file import FileUploadResponse
from backend.storage import storage

settings = get_settings()


class UploadService:
    @staticmethod
    def upload(
        db: Session,
        *,
        user: User,
        filename_original: str,
        mime_type: str,
        plaintext: bytes,
    ) -> FileUploadResponse:
        plaintext_hash = compute_sha256(plaintext)

        session_key = generate_session_key()
        features = extract_features(
            plaintext, extension=Path(filename_original).suffix.lower()
        )
        split_ratio = adaptive_split(features)

        ai_strategy = settings.ai_matrix_strategy.lower().strip()
        ai_decision: dict[str, object] | None = None

        if ai_strategy == "legacy":
            matrix_size = choose_matrix_size_by_split(
                data_length=len(plaintext),
                split_ratio=split_ratio,
                fallback=settings.uhc_matrix_size,
            )
            logistic_r = settings.uhc_logistic_r
        else:
            file_class = classify_file_type(
                str(features.get("extension", "")),
                features,
            )
            matrix_size, selected_r, ai_decision = adaptive_matrix(features, file_class)
            logistic_r = (
                selected_r if settings.ai_adaptive_r else settings.uhc_logistic_r
            )

        key_matrix = generate_key_matrix(
            matrix_size=matrix_size,
            seed_source=session_key,
            modulus=settings.uhc_modulus,
            r=logistic_r,
        )

        cipher_u, iv_uhc, uhc_meta = uhc_encrypt(
            plaintext,
            key_matrix,
            modulus=settings.uhc_modulus,
        )
        cipher_aes, iv_aes = aes_encrypt(cipher_u, session_key)

        # Encrypt flipped plaintext for avalanche analysis
        flipped_pt = bytearray(plaintext)
        flipped_pt[0] ^= 0b00000001
        flipped_u, _, _ = uhc_encrypt(
            bytes(flipped_pt), key_matrix, modulus=settings.uhc_modulus
        )
        flipped_aes, _ = aes_encrypt(flipped_u, session_key)

        user_key = derive_user_key(user.derived_key_hash, user.salt)
        wrapped_key = wrap_key(session_key, user_key)
        rsa_wrapped_key = rsa_wrap_key(session_key)

        stored_name = f"{uuid4().hex}.bin"
        storage.save(stored_name, cipher_aes)

        metadata_json = generate_metadata(
            {
                "ai_mode": (
                    "legacy" if ai_strategy == "legacy" else "multi_feature_adaptive"
                ),
                "split_ratio": split_ratio,
                "matrix_size": matrix_size,
                "modulus": settings.uhc_modulus,
                "logistic_r": logistic_r,
                "uhc": uhc_meta,
                "ai_decision": ai_decision,
            }
        )

        stored_file = StoredFile(
            owner_id=user.id,
            filename_original=filename_original,
            filename_stored=stored_name,
            mime_type=mime_type,
            file_size_original=len(plaintext),
            file_size_encrypted=len(cipher_aes),
            encryption_type=f"UHC(mod{settings.uhc_modulus},M{matrix_size},R{logistic_r})+AES+RSA",
        )
        db.add(stored_file)
        db.flush()

        file_key = FileKey(
            file_id=stored_file.id,
            wrapped_session_key=wrapped_key,
            rsa_wrapped_session_key=rsa_wrapped_key,
            iv_aes=iv_aes.hex(),
            iv_uhc=iv_uhc.hex(),
            plaintext_hash=plaintext_hash,
            metadata_json=metadata_json,
        )
        db.add(file_key)

        analysis = analyze_file(cipher_aes, flipped_aes)

        db.add(
            ActivityLog(
                user_id=user.id,
                file_id=stored_file.id,
                action="upload",
                details=f"Uploaded {Path(filename_original).name}",
            )
        )

        db.commit()
        db.refresh(stored_file)

        return FileUploadResponse(
            id=stored_file.id,
            filename_original=stored_file.filename_original,
            filename_stored=stored_file.filename_stored,
            file_size_original=stored_file.file_size_original,
            file_size_encrypted=stored_file.file_size_encrypted,
            mime_type=stored_file.mime_type,
            created_at=stored_file.created_at,
            encryption_type=stored_file.encryption_type,
            security_score=analysis["score"],
            security_metrics=analysis["metrics"],
            ai_decision=ai_decision,
        )
