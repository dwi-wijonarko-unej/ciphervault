from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import User
from backend.services.file_service import FileService

router = APIRouter(tags=["activity"])


@router.get("/activities")
def list_activities(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return FileService.list_activities(db, current_user, limit)
