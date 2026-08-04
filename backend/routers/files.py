from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.middleware.role_guard import require_admin
from backend.models import StoredFile, User
from backend.schemas.directory import (
    DirectoryContentsResponse,
    DirectoryCreate,
    MoveRequest,
)
from backend.schemas.file import (
    FileDetailResponse,
    FileListResponse,
    SecurityAnalysisResponse,
)
from backend.schemas.share import SharedFileListResponse
from backend.services.directory_service import DirectoryService
from backend.services.download_service import DownloadService
from backend.services.file_service import FileService
from backend.storage import storage

router = APIRouter(prefix="/files", tags=["files"])


# ── Static paths (must come before /{file_id}) ───────────────────


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


# ── Directory Management (static paths before {file_id}) ────────


@router.post("/directories")
def create_directory(
    payload: DirectoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    folder = DirectoryService.create_folder(
        db, current_user, payload.name, payload.parent_id
    )
    return {
        "id": folder.id,
        "name": folder.filename_original,
        "parent_id": folder.parent_id,
        "is_directory": True,
        "message": "Folder created successfully",
    }


@router.get("/directories", response_model=DirectoryContentsResponse)
def list_directories(
    parent_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DirectoryContentsResponse:
    result = DirectoryService.list_contents(db, current_user, parent_id)
    return DirectoryContentsResponse(**result)


@router.delete("/directories/{dir_id}")
def delete_directory(
    dir_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return DirectoryService.delete_folder(db, current_user, dir_id)


# ── Dynamic paths with {file_id} ────────────────────────────────


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
    current_user: User = Depends(require_admin),
) -> SecurityAnalysisResponse:
    return FileService.analyze_stored_file(db, file_id, current_user)


@router.post("/{file_id}/verify")
def verify_integrity(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """Verify file integrity without downloading it."""
    file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if file.owner_id != current_user.id and not FileService._check_share_access(
        db, file_id, current_user
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    return FileService.verify_file_integrity(db, file_id, current_user)


@router.get("/{file_id}/download/cipher")
def download_ciphertext(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Download raw ciphertext without decryption."""
    file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if file.owner_id != current_user.id and not FileService._check_share_access(
        db, file_id, current_user
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if not storage.exists(file.filename_stored):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ciphertext not found"
        )
    ciphertext = storage.read(file.filename_stored)
    return StreamingResponse(
        iter([ciphertext]),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file.filename_stored}"',
            "Content-Length": str(len(ciphertext)),
        },
    )


@router.patch("/{file_id}/move")
def move_item(
    file_id: int,
    payload: MoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return DirectoryService.move_item(
        db, current_user, file_id, payload.target_parent_id
    )
