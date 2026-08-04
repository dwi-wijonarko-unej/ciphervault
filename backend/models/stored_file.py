from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class StoredFile(Base):
    __tablename__ = "stored_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename_original: Mapped[str] = mapped_column(String(255), nullable=False)
    filename_stored: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True
    )
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_original: Mapped[int] = mapped_column(Integer, nullable=False)
    file_size_encrypted: Mapped[int] = mapped_column(Integer, nullable=False)
    encryption_type: Mapped[str] = mapped_column(String(64), default="UHC+AES+RSA")
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("stored_files.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
        index=True,
    )
    is_directory: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
