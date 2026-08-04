from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    label: str = Field(min_length=1, max_length=64, default="default")
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=3650)


class ApiKeyResponse(BaseModel):
    """Returned ONCE at creation — includes the plaintext key."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    key: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None


class ApiKeyListItem(BaseModel):
    """Safe to list — never includes the plaintext key."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    key_prefix: str
    is_active: bool
    last_used: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None


class ApiKeyListResponse(BaseModel):
    keys: list[ApiKeyListItem]
