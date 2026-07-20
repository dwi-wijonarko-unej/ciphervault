from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import User
from backend.schemas.share import ShareRequest, ShareResponse
from backend.services.share_service import ShareService

router = APIRouter(prefix="/files", tags=["share"])


@router.post("/{file_id}/share", response_model=ShareResponse)
def share_file(
    file_id: int,
    body: ShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShareResponse:
    return ShareService.share_file(
        db,
        file_id,
        current_user,
        body.recipient_username,
        body.expires_in_hours,
    )


@router.get("/{file_id}/shares")
def list_shares(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return ShareService.list_shares_for_file(db, file_id, current_user)


@router.delete("/shares/{share_id}")
def revoke_share(
    share_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return ShareService.revoke_share(db, share_id, current_user)
