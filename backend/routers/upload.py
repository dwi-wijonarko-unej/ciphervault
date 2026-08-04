from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import User
from backend.schemas.file import FileUploadResponse
from backend.services.upload_service import UploadService

router = APIRouter(prefix="/files", tags=["upload"])


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    parent_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileUploadResponse:
    payload = await file.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    return UploadService.upload(
        db,
        user=current_user,
        filename_original=file.filename or "upload.bin",
        mime_type=file.content_type or "application/octet-stream",
        plaintext=payload,
        parent_id=parent_id,
    )
