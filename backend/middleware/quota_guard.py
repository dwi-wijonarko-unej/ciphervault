from fastapi import Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import Plan, StoredFile, Subscription, User
from backend.services.billing_service import BillingService


def _active_plan(db: Session, user: User) -> Plan:
    subscription = BillingService.current_subscription(db, user)
    if subscription and subscription.status in ("trial", "active"):
        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        if plan:
            return plan
    plan = db.query(Plan).filter(Plan.name == "free").first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No billing plan available",
        )
    return plan


def ensure_upload_allowed(db: Session, user: User, file_size: int) -> Plan:
    plan = _active_plan(db, user)
    if file_size > plan.max_file_bytes:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"File exceeds plan limit of {plan.max_file_bytes} bytes",
        )
    used = (
        db.query(func.coalesce(func.sum(StoredFile.file_size_encrypted), 0))
        .filter(
            StoredFile.owner_id == user.id,
            StoredFile.is_directory == False,  # noqa: E712
        )
        .scalar()
    )
    if (used or 0) + file_size > plan.storage_bytes:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Storage quota exceeded for current plan",
        )
    return plan


def check_upload_allowed(
    file_size: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    ensure_upload_allowed(db, user, file_size)
    return user
