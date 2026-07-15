from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class FileKey(Base):
    __tablename__ = "file_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    file_id: Mapped[int] = mapped_column(
        ForeignKey("stored_files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )
    wrapped_session_key: Mapped[str] = mapped_column(Text, nullable=False)
    rsa_wrapped_session_key: Mapped[str] = mapped_column(Text, nullable=False)
    iv_aes: Mapped[str] = mapped_column(Text, nullable=False)
    iv_uhc: Mapped[str] = mapped_column(Text, nullable=False)
    plaintext_hash: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
