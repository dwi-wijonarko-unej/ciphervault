from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PublicLinkCreate(BaseModel):
    password: Optional[str] = Field(default=None, min_length=4, max_length=128)
    max_access: Optional[int] = Field(default=None, ge=1, le=100000)
    expires_in_hours: Optional[int] = Field(default=None, ge=1, le=87600)


class PublicLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    token: str
    url: str
    has_password: bool
    access_count: int
    max_access: Optional[int] = None
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None


class PublicLinkListResponse(BaseModel):
    links: list[PublicLinkResponse]


class PublicDownloadRequest(BaseModel):
    password: Optional[str] = None
