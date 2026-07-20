from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ShareRequest(BaseModel):
    recipient_username: str
    expires_in_hours: int | None = None


class ShareRecipient(BaseModel):
    id: int
    username: str


class ShareResponse(BaseModel):
    id: int
    file_id: int
    access_token: str
    recipient: ShareRecipient
    created_at: datetime
    expires_at: datetime | None = None


class ShareInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    owner_id: int
    recipient_id: int
    access_token: str
    created_at: datetime
    expires_at: datetime | None = None
    revoked: bool


class SharedFileItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    filename_original: str
    filename_stored: str
    file_size_original: int
    file_size_encrypted: int
    file_size_formatted: str | None = None
    mime_type: str
    encryption_type: str = "UHC+AES+RSA"
    created_at: datetime
    shared_by: str | None = None
    access_token: str | None = None


class SharedFileListResponse(BaseModel):
    items: list[SharedFileItem]
    total: int
