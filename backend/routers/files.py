from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import User
from backend.schemas.file import (
    FileDetailResponse,
    FileListResponse,
    SecurityAnalysisResponse,
)
from backend.schemas.share import SharedFileListResponse
from backend.services.file_service import FileService

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=FileListResponse)
def list_files(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileListResponse:
    return FileService.get_user_files(db, current_user, page, per_page)


@router.get("/shared", response_model=SharedFileListResponse)
def list_shared_files(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SharedFileListResponse:
    return FileService.get_shared_with_me(db, current_user, page, per_page)


@router.get("/search", response_model=FileListResponse)
def search_files(
    q: str = Query("", min_length=0),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileListResponse:
    return FileService.search_user_files(db, current_user, q, page, per_page)


@router.get("/{file_id}", response_model=FileDetailResponse)
def get_file_detail(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileDetailResponse:
    return FileService.get_file_detail(db, file_id, current_user)


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return FileService.delete_user_file(db, file_id, current_user)


@router.post("/{file_id}/analyze", response_model=SecurityAnalysisResponse)
def analyze_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityAnalysisResponse:
    return FileService.analyze_stored_file(db, file_id, current_user)
