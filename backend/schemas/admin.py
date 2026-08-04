from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AdminUserDetail(AdminUserItem):
    file_count: int = 0
    share_count: int = 0


class UpdateRoleRequest(BaseModel):
    role: str = Field(pattern="^(admin|user)$")


class SetActiveRequest(BaseModel):
    is_active: bool


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=255)


class SystemStatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    users: dict
    files: dict
    shares: dict
    public_links: dict
    api_keys: int
    recent_activities: list[dict]
