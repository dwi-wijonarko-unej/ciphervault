from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import StoredFile, User
from backend.services.download_service import DownloadService

router = APIRouter(tags=["download"])


@router.get("/files/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    plaintext = DownloadService.download(file_id, current_user, db)

    file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
    filename = file.filename_original if file else "download.bin"

    return StreamingResponse(
        iter([plaintext]),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(plaintext)),
        },
    )
