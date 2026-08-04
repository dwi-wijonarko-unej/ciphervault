from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import StoredFile, User
from backend.schemas.public_link import (
    PublicLinkCreate,
    PublicLinkListResponse,
    PublicLinkResponse,
)
from backend.services.download_service import DownloadService
from backend.services.public_link_service import PublicLinkService

router = APIRouter(tags=["public-link"])


def _to_response(link, file: StoredFile) -> PublicLinkResponse:
    return PublicLinkResponse(
        id=link.id,
        file_id=link.file_id,
        token=link.token,
        url=f"/public/{link.token}",
        has_password=link.password_hash is not None,
        access_count=link.access_count,
        max_access=link.max_access,
        is_active=link.is_active,
        created_at=link.created_at,
        expires_at=link.expires_at,
    )


@router.post("/files/{file_id}/public-link", response_model=PublicLinkResponse)
def create_public_link(
    file_id: int,
    payload: PublicLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PublicLinkResponse:
    link = PublicLinkService.create_link(
        db,
        file_id=file_id,
        owner=current_user,
        password=payload.password,
        max_access=payload.max_access,
        expires_in_hours=payload.expires_in_hours,
    )
    file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
    return _to_response(link, file)


@router.get("/files/{file_id}/public-links", response_model=PublicLinkListResponse)
def list_public_links(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PublicLinkListResponse:
    links = PublicLinkService.list_links(db, file_id, current_user)
    file = db.query(StoredFile).filter(StoredFile.id == file_id).first()
    return PublicLinkListResponse(links=[_to_response(link, file) for link in links])


@router.delete("/public-links/{link_id}", status_code=204)
def revoke_public_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    PublicLinkService.revoke_link(db, link_id, current_user)


@router.get("/public/{token}")
def public_download(
    token: str,
    password: str | None = None,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Download via public link — no authentication required.

    If the link has a password, pass it as a query parameter: ?password=xxx
    """
    file, owner = PublicLinkService.verify_and_get_file(db, token, password)
    plaintext = DownloadService.download(file.id, owner, db)

    return StreamingResponse(
        iter([plaintext]),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file.filename_original}"',
            "Content-Length": str(len(plaintext)),
        },
    )
