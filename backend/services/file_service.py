from __future__ import annotations

from math import ceil

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.crypto import analyze_file, parse_metadata
from backend.models import ActivityLog, FileKey, Share, StoredFile, User
from backend.schemas.file import (
    FileDetailResponse,
    FileListResponse,
    SecurityAnalysisResponse,
)
from backend.schemas.share import SharedFileItem, SharedFileListResponse
from backend.storage import storage


def _format_size(bytes_count: int) -> str:
    if bytes_count < 1024:
        return f"{bytes_count} B"
    if bytes_count < 1024 * 1024:
        return f"{bytes_count / 1024:.1f} KB"
    return f"{bytes_count / (1024 * 1024):.1f} MB"


class FileService:
    @staticmethod
    def get_user_files(
        db: Session, user: User, page: int = 1, per_page: int = 20
    ) -> FileListResponse:
        page = max(page, 1)
        per_page = max(min(per_page, 100), 1)

        query = (
            db.query(StoredFile)
            .filter(StoredFile.owner_id == user.id)
            .order_by(StoredFile.created_at.desc())
        )

        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()

        serialized_items = [
            {
                "id": item.id,
                "owner_id": item.owner_id,
                "filename_original": item.filename_original,
                "filename_stored": item.filename_stored,
                "file_size_original": item.file_size_original,
                "file_size_encrypted": item.file_size_encrypted,
                "file_size_formatted": _format_size(item.file_size_original),
                "mime_type": item.mime_type,
                "encryption_type": item.encryption_type,
                "created_at": item.created_at,
            }
            for item in items
        ]

        return FileListResponse(
            items=serialized_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=max(ceil(total / per_page), 1),
        )

    @staticmethod
    def search_user_files(
        db: Session,
        user: User,
        q: str,
        page: int = 1,
        per_page: int = 20,
    ) -> FileListResponse:
        page = max(page, 1)
        per_page = max(min(per_page, 100), 1)

        query = (
            db.query(StoredFile)
            .filter(
                StoredFile.owner_id == user.id,
                StoredFile.filename_original.ilike(f"%{q}%"),
            )
            .order_by(StoredFile.created_at.desc())
        )

        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()

        serialized_items = [
            {
                "id": item.id,
                "owner_id": item.owner_id,
                "filename_original": item.filename_original,
                "filename_stored": item.filename_stored,
                "file_size_original": item.file_size_original,
                "file_size_encrypted": item.file_size_encrypted,
                "file_size_formatted": _format_size(item.file_size_original),
                "mime_type": item.mime_type,
                "encryption_type": item.encryption_type,
                "created_at": item.created_at,
            }
            for item in items
        ]

        return FileListResponse(
            items=serialized_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=max(ceil(total / per_page), 1),
        )

    @staticmethod
    @staticmethod
    def _check_share_access(db: Session, file_id: int, user: User) -> bool:
        share = (
            db.query(Share)
            .filter(
                Share.file_id == file_id,
                Share.recipient_id == user.id,
                Share.revoked == False,
            )
            .first()
        )
        return share is not None

    @staticmethod
    def get_file_detail(db: Session, file_id: int, user: User) -> FileDetailResponse:
        file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )
        if file.owner_id != user.id and not FileService._check_share_access(
            db, file_id, user
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        key = db.query(FileKey).filter(FileKey.file_id == file.id).first()
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File key not found",
            )

        metadata = parse_metadata(key.metadata_json)

        return FileDetailResponse(
            id=file.id,
            owner_id=file.owner_id,
            filename_original=file.filename_original,
            filename_stored=file.filename_stored,
            file_size_original=file.file_size_original,
            file_size_encrypted=file.file_size_encrypted,
            file_size_formatted=_format_size(file.file_size_original),
            mime_type=file.mime_type,
            created_at=file.created_at,
            encryption_type=file.encryption_type,
            logistic_r=metadata.get("logistic_r"),
            ai_decision=metadata.get("ai_decision"),
            metadata=metadata,
        )

    @staticmethod
    def list_activities(db: Session, user: User, limit: int = 100) -> dict[str, object]:
        logs = (
            db.query(ActivityLog)
            .filter(ActivityLog.user_id == user.id)
            .order_by(ActivityLog.timestamp.desc())
            .limit(max(limit, 1))
            .all()
        )

        return {
            "total": len(logs),
            "items": [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "file_id": log.file_id,
                    "file_name": None,
                    "timestamp": log.timestamp,
                    "details": log.details,
                }
                for log in logs
            ],
        }

    @staticmethod
    def analyze_stored_file(
        db: Session, file_id: int, user: User
    ) -> SecurityAnalysisResponse:
        file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )
        if file.owner_id != user.id and not FileService._check_share_access(
            db, file_id, user
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        if not storage.exists(file.filename_stored):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ciphertext not found in storage",
            )

        ciphertext = storage.read(file.filename_stored)
        analysis = analyze_file(ciphertext)

        return SecurityAnalysisResponse(
            score=analysis["score"],
            metrics=analysis["metrics"],
        )

    @staticmethod
    def get_shared_with_me(
        db: Session, user: User, page: int = 1, per_page: int = 20
    ) -> SharedFileListResponse:
        page = max(page, 1)
        per_page = max(min(per_page, 100), 1)

        query = (
            db.query(StoredFile, Share.access_token, User.username)
            .join(Share, Share.file_id == StoredFile.id)
            .join(User, User.id == StoredFile.owner_id)
            .filter(
                Share.recipient_id == user.id,
                Share.revoked == False,
            )
            .order_by(Share.created_at.desc())
        )

        total = query.count()
        rows = query.offset((page - 1) * per_page).limit(per_page).all()

        items = [
            SharedFileItem(
                id=row.StoredFile.id,
                owner_id=row.StoredFile.owner_id,
                filename_original=row.StoredFile.filename_original,
                filename_stored=row.StoredFile.filename_stored,
                file_size_original=row.StoredFile.file_size_original,
                file_size_encrypted=row.StoredFile.file_size_encrypted,
                file_size_formatted=_format_size(row.StoredFile.file_size_original),
                mime_type=row.StoredFile.mime_type,
                encryption_type=row.StoredFile.encryption_type,
                created_at=row.StoredFile.created_at,
                shared_by=row.username,
                access_token=row.access_token,
            )
            for row in rows
        ]

        return SharedFileListResponse(
            items=items,
            total=total,
        )

    @staticmethod
    def delete_user_file(db: Session, file_id: int, user: User) -> dict[str, str]:
        file = (
            db.query(StoredFile)
            .filter(StoredFile.id == file_id, StoredFile.owner_id == user.id)
            .first()
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        filename_stored = file.filename_stored

        # Delete dependent records
        db.query(FileKey).filter(FileKey.file_id == file.id).delete()
        db.query(Share).filter(Share.file_id == file.id).delete()

        # Delete file from storage
        if storage.exists(filename_stored):
            storage.delete(filename_stored)

        # Log activity
        db.add(
            ActivityLog(
                user_id=user.id,
                file_id=file.id,
                action="delete",
                details=f"Deleted {file.filename_original}",
            )
        )

        db.delete(file)
        db.commit()

        return {"message": "File deleted successfully"}
