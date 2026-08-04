from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DirectoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: Optional[int] = None


class MoveRequest(BaseModel):
    target_parent_id: Optional[int] = None


class DirectoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_directory: bool
    parent_id: Optional[int] = None
    owner_id: int
    file_size_original: int = 0
    file_size_formatted: str = ""
    mime_type: str = ""
    encryption_type: str = ""
    created_at: datetime


class DirectoryContentsResponse(BaseModel):
    current_path: list[dict]
    items: list[DirectoryItem]
    total: int


class BreadcrumbItem(BaseModel):
    id: int
    name: str
