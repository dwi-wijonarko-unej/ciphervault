from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import Invoice, Plan, StoredFile, Subscription, User
from backend.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    InvoiceDetailResponse,
    InvoiceResponse,
    PlanResponse,
    SubscriptionResponse,
    UsageResponse,
)
from backend.services.billing_service import BillingService
from backend.services.invoice_service import render_invoice_pdf

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[PlanResponse])
def list_plans(db: Session = Depends(get_db)) -> list[Plan]:
    return BillingService.list_plans(db)


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return BillingService.checkout(db, user, payload.plan_id, payload.cycle)


@router.post("/webhook/{gateway}")
async def webhook(gateway: str, request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    return BillingService.handle_webhook(db, gateway, payload)


@router.get("/subscription", response_model=SubscriptionResponse | None)
def get_subscription(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Subscription | None:
    return BillingService.current_subscription(db, user)


@router.post("/subscription/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Subscription:
    return BillingService.cancel_subscription(db, user)


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Invoice]:
    return BillingService.user_invoices(db, user)


@router.get("/invoices/{invoice_id}/detail", response_model=InvoiceDetailResponse)
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .first()
    )
    if not invoice:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
        )
    subscription = (
        db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
    )
    plan = None
    if subscription:
        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    return {
        **InvoiceResponse.model_validate(invoice).model_dump(),
        "plan_name": plan.name if plan else "-",
        "payment_gateway": subscription.payment_gateway if subscription else "manual",
    }


@router.get("/invoices/{invoice_id}")
def get_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .first()
    )
    if not invoice:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
        )
    plan = (
        db.query(Plan)
        .join(Subscription, Subscription.plan_id == Plan.id)
        .filter(Subscription.id == invoice.subscription_id)
        .first()
    )
    subscription = (
        db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
    )
    pdf = render_invoice_pdf(
        invoice,
        plan,
        user,
        payment_method=subscription.payment_gateway if subscription else None,
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"
        },
    )


@router.get("/usage", response_model=UsageResponse)
def get_usage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    subscription = BillingService.current_subscription(db, user)
    plan = None
    if subscription and subscription.status in ("trial", "active"):
        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        plan = db.query(Plan).filter(Plan.name == "free").first()
    used = (
        db.query(func.coalesce(func.sum(StoredFile.file_size_encrypted), 0))
        .filter(
            StoredFile.owner_id == user.id,
            StoredFile.is_directory == False,  # noqa: E712
        )
        .scalar()
        or 0
    )
    return {
        "plan_name": plan.name if plan else "free",
        "storage_used_bytes": used,
        "storage_quota_bytes": plan.storage_bytes if plan else 0,
        "max_file_bytes": plan.max_file_bytes if plan else 0,
    }
