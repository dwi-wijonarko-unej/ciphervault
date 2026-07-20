from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.crypto import derive_user_key, unwrap_key, wrap_key
from backend.models import ActivityLog, Share, StoredFile, User
from backend.schemas.share import ShareRecipient, ShareResponse


class ShareService:
    @staticmethod
    def share_file(
        db: Session,
        file_id: int,
        owner: User,
        recipient_username: str,
        expires_in_hours: int | None = None,
    ) -> ShareResponse:
        # 1. verify file exists and user is owner
        file = (
            db.query(StoredFile)
            .filter(StoredFile.id == file_id, StoredFile.owner_id == owner.id)
            .first()
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        # 2. find recipient
        recipient = db.query(User).filter(User.username == recipient_username).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient user not found",
            )

        # 3. cannot share with self
        if recipient.id == owner.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot share a file with yourself",
            )

        # 4. check for existing active share
        existing = (
            db.query(Share)
            .filter(
                Share.file_id == file_id,
                Share.owner_id == owner.id,
                Share.recipient_id == recipient.id,
                Share.revoked == False,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="File already shared with this user",
            )

        from backend.models.file_key import FileKey

        # 5. decrypt owner's wrapped key → session_key
        key = db.query(FileKey).filter(FileKey.file_id == file.id).first()
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File key not found",
            )

        owner_key = derive_user_key(owner.derived_key_hash, owner.salt)
        try:
            session_key = unwrap_key(key.wrapped_session_key, owner_key)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to unwrap session key",
            ) from exc

        # 6. re-wrap with recipient's user key
        recipient_key = derive_user_key(recipient.derived_key_hash, recipient.salt)
        re_wrapped = wrap_key(session_key, recipient_key)

        # 7. generate access token
        access_token = secrets.token_hex(32)

        # 8. compute expiry
        expires_at = None
        if expires_in_hours and expires_in_hours > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)

        # 9. create share record
        share = Share(
            file_id=file.id,
            owner_id=owner.id,
            recipient_id=recipient.id,
            wrapped_session_key=re_wrapped,
            access_token=access_token,
            expires_at=expires_at,
        )
        db.add(share)
        db.flush()

        # 10. log activity
        db.add(
            ActivityLog(
                user_id=owner.id,
                file_id=file.id,
                action="share",
                details=f"Shared {file.filename_original} with {recipient.username}",
            )
        )
        db.commit()
        db.refresh(share)

        return ShareResponse(
            id=share.id,
            file_id=share.file_id,
            access_token=share.access_token,
            recipient=ShareRecipient(id=recipient.id, username=recipient.username),
            created_at=share.created_at,
            expires_at=share.expires_at,
        )

    @staticmethod
    def revoke_share(
        db: Session,
        share_id: int,
        owner: User,
    ) -> dict[str, str]:
        share = (
            db.query(Share)
            .filter(Share.id == share_id, Share.owner_id == owner.id)
            .first()
        )
        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Share record not found",
            )

        if share.revoked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Share already revoked",
            )

        share.revoked = True
        db.add(
            ActivityLog(
                user_id=owner.id,
                file_id=share.file_id,
                action="revoke",
                details=f"Revoked share (ID {share.id})",
            )
        )
        db.commit()

        return {"message": "Share access revoked"}

    @staticmethod
    def list_shares_for_file(
        db: Session,
        file_id: int,
        owner: User,
    ) -> dict[str, object]:
        file = (
            db.query(StoredFile)
            .filter(StoredFile.id == file_id, StoredFile.owner_id == owner.id)
            .first()
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        shares = (
            db.query(Share)
            .filter(Share.file_id == file_id, Share.owner_id == owner.id)
            .all()
        )

        items = []
        for s in shares:
            recipient = db.query(User).filter(User.id == s.recipient_id).first()
            items.append(
                {
                    "id": s.id,
                    "file_id": s.file_id,
                    "recipient": {
                        "id": s.recipient_id,
                        "username": recipient.username if recipient else "unknown",
                    },
                    "access_token": s.access_token[:16] + "...",
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                    "revoked": s.revoked,
                }
            )

        return {"items": items, "total": len(items)}
