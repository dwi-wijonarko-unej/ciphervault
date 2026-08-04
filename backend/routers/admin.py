from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.middleware.role_guard import require_admin
from backend.models import ActivityLog, Share, StoredFile, User
from backend.schemas.admin import (
    AdminUserDetail,
    AdminUserItem,
    AdminUserListResponse,
    ResetPasswordRequest,
    SetActiveRequest,
    SystemStatsResponse,
    UpdateRoleRequest,
)
from backend.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


def _activity_to_dict(log: ActivityLog) -> dict:
    return {
        "id": log.id,
        "user_id": log.user_id,
        "file_id": log.file_id,
        "action": log.action,
        "details": log.details,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
    }


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserListResponse:
    result = AdminService.list_users(db, page, per_page)
    return AdminUserListResponse(
        items=[AdminUserItem.model_validate(u) for u in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        total_pages=result["total_pages"],
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def admin_get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserDetail:
    user = AdminService.get_user(db, user_id)
    file_count = db.query(StoredFile).filter(StoredFile.owner_id == user_id).count()
    share_count = db.query(Share).filter(Share.recipient_id == user_id).count()
    detail = AdminUserDetail.model_validate(user)
    detail.file_count = file_count
    detail.share_count = share_count
    return detail


@router.patch("/users/{user_id}/role", response_model=AdminUserItem)
def admin_update_role(
    user_id: int,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserItem:
    user = AdminService.update_user_role(db, user_id, payload.role)
    return AdminUserItem.model_validate(user)


@router.patch("/users/{user_id}/active", response_model=AdminUserItem)
def admin_set_active(
    user_id: int,
    payload: SetActiveRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserItem:
    user = AdminService.set_user_active(db, user_id, payload.is_active)
    return AdminUserItem.model_validate(user)


@router.post("/users/{user_id}/reset-password", response_model=AdminUserItem)
def admin_reset_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserItem:
    user = AdminService.reset_user_password(db, user_id, payload.new_password)
    return AdminUserItem.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    if user_id == current_user.id:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account",
        )
    AdminService.delete_user(db, user_id)


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    stats = AdminService.get_system_stats(db)
    stats["recent_activities"] = [
        _activity_to_dict(log) for log in stats["recent_activities"]
    ]
    return stats
