from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SecurityAnalysisResponse(BaseModel):
    score: int
    metrics: dict[str, float]


class FileUploadResponse(BaseModel):
    id: int
    filename_original: str
    filename_stored: str
    file_size_original: int
    file_size_encrypted: int
    mime_type: str
    created_at: datetime
    security_score: int
    security_metrics: dict[str, float]


class FileListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    filename_original: str
    filename_stored: str
    file_size_original: int
    file_size_encrypted: int
    file_size_formatted: str | None = None
    mime_type: str
    created_at: datetime


class FileListResponse(BaseModel):
    items: list[FileListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class FileDetailResponse(FileListItem):
    encryption_type: str
    logistic_r: float | None = None
    metadata: dict[str, Any]
