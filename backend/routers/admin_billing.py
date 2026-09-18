from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.role_guard import require_admin
from backend.models import Invoice, Subscription, User
from backend.schemas.billing import InvoiceResponse, SubscriptionResponse

router = APIRouter(prefix="/admin", tags=["admin-billing"])


class RevenueSummary(BaseModel):
    mrr: int
    active_subscribers: int
    total_paid: int
    total_invoices: int


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
def all_subscriptions(
    status: str | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[Subscription]:
    query = db.query(Subscription).order_by(Subscription.id.desc())
    if status:
        query = query.filter(Subscription.status == status)
    return query.all()


@router.get("/invoices", response_model=list[InvoiceResponse])
def all_invoices(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[Invoice]:
    return db.query(Invoice).order_by(Invoice.id.desc()).all()


@router.get("/revenue", response_model=RevenueSummary)
def revenue_summary(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    active = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.status == "active")
        .scalar()
        or 0
    )
    total_paid = (
        db.query(func.coalesce(func.sum(Invoice.amount + Invoice.tax_amount), 0))
        .filter(Invoice.status == "paid")
        .scalar()
        or 0
    )
    total_invoices = db.query(func.count(Invoice.id)).scalar() or 0
    return {
        "mrr": total_paid,
        "active_subscribers": active,
        "total_paid": total_paid,
        "total_invoices": total_invoices,
    }
