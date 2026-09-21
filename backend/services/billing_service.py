from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models import Invoice, Payment, Plan, Subscription, User
from backend.services import gateway_midtrans
from backend.services.email_service import send_payment_receipt
from backend.services.invoice_service import create_invoice_for_subscription

settings = get_settings()

TRIAL_DAYS = 14
PPN_RATE = 0.11


class BillingService:
    @staticmethod
    def list_plans(db: Session) -> list[Plan]:
        return (
            db.query(Plan)
            .filter(Plan.is_active == True)  # noqa: E712
            .order_by(Plan.tier)
            .all()
        )

    @staticmethod
    def get_plan(db: Session, plan_id: int) -> Plan:
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan or not plan.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found"
            )
        return plan

    @staticmethod
    def current_subscription(db: Session, user: User) -> Subscription | None:
        return (
            db.query(Subscription)
            .filter(Subscription.user_id == user.id)
            .order_by(Subscription.id.desc())
            .first()
        )

    @staticmethod
    def start_trial(db: Session, user: User, plan_name: str = "free") -> Subscription:
        plan = db.query(Plan).filter(Plan.name == plan_name).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found"
            )
        now = datetime.now(timezone.utc)
        subscription = Subscription(
            user_id=user.id,
            plan_id=plan.id,
            status="trial" if plan.price_monthly > 0 else "active",
            current_period_start=now,
            current_period_end=now + timedelta(days=TRIAL_DAYS),
            payment_gateway="manual",
            trial_ends_at=now + timedelta(days=TRIAL_DAYS)
            if plan.price_monthly > 0
            else None,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def checkout(
        db: Session,
        user: User,
        plan_id: int,
        cycle: str = "monthly",
        payment_method: str | None = None,
    ) -> dict:
        plan = BillingService.get_plan(db, plan_id)
        if cycle not in ("monthly", "yearly"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cycle"
            )
        amount = plan.price_monthly if cycle == "monthly" else plan.price_yearly
        if amount <= 0:
            subscription = BillingService.start_trial(db, user, plan.name)
            return {"subscription_id": subscription.id, "free": True}

        now = datetime.now(timezone.utc)
        subscription = Subscription(
            user_id=user.id,
            plan_id=plan.id,
            status="trial",
            current_period_start=now,
            current_period_end=now + timedelta(days=TRIAL_DAYS),
            payment_gateway="midtrans",
            trial_ends_at=now + timedelta(days=TRIAL_DAYS),
        )
        db.add(subscription)
        db.flush()

        invoice = create_invoice_for_subscription(db, user, subscription, amount)
        db.flush()
        order_id = invoice.invoice_number
        invoice.gateway_invoice_id = order_id

        token = None
        redirect_url = None
        if settings.midtrans_server_key:
            finish_url = (
                f"{settings.public_base_url.rstrip('/')}"
                f"/success.html?invoice={invoice.id}"
            )
            params = gateway_midtrans.build_checkout_params(
                order_id,
                amount + invoice.tax_amount,
                user.email,
                f"{plan.name}-{cycle}",
                finish_url=finish_url,
                expiry_hours=settings.snap_expiry_hours,
                enabled_payments=gateway_midtrans.enabled_payments_for(payment_method),
            )
            token = gateway_midtrans.create_snap_token(
                params, settings.midtrans_server_key, settings.midtrans_sandbox
            )
            if token:
                redirect_url = gateway_midtrans.get_snap_redirect_url(
                    token, settings.midtrans_sandbox
                )
        db.commit()
        db.refresh(subscription)
        return {
            "subscription_id": subscription.id,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "amount": amount,
            "tax_amount": invoice.tax_amount,
            "snap_token": token,
            "redirect_url": redirect_url,
            "sandbox": settings.midtrans_sandbox,
        }

    @staticmethod
    def handle_webhook(db: Session, gateway: str, payload: dict) -> dict:
        if gateway != "midtrans":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported gateway",
            )
        if settings.midtrans_server_key and not gateway_midtrans.verify_signature(
            payload, settings.midtrans_server_key
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature"
            )
        order_id = payload.get("order_id", "")
        invoice = (
            db.query(Invoice).filter(Invoice.invoice_number == order_id).first()
        )
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
            )
        payment_status = gateway_midtrans.notification_status(payload)
        payment = Payment(
            invoice_id=invoice.id,
            gateway="midtrans",
            gateway_transaction_id=payload.get("transaction_id"),
            amount=int(float(payload.get("gross_amount", 0))),
            method=payload.get("payment_type"),
            status=payment_status,
            raw_response_json=payload,
        )
        db.add(payment)

        if payment_status == "success" and invoice.status != "paid":
            now = datetime.now(timezone.utc)
            invoice.status = "paid"
            invoice.paid_at = now
            subscription = (
                db.query(Subscription)
                .filter(Subscription.id == invoice.subscription_id)
                .first()
            )
            if subscription:
                subscription.status = "active"
                subscription.current_period_start = now
                subscription.current_period_end = now + timedelta(days=30)
            user = db.query(User).filter(User.id == invoice.user_id).first()
            if user:
                send_payment_receipt(
                    user.email, invoice.invoice_number, str(invoice.amount)
                )
        elif payment_status == "failed":
            invoice.status = "void"
        db.commit()
        return {"invoice_number": invoice.invoice_number, "status": invoice.status}

    @staticmethod
    def mock_mark_paid(db: Session, user: User, invoice_id: int) -> Invoice:
        invoice = (
            db.query(Invoice)
            .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
            .first()
        )
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
            )
        if invoice.status == "paid":
            return invoice
        now = datetime.now(timezone.utc)
        invoice.status = "paid"
        invoice.paid_at = now
        subscription = (
            db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
        )
        if subscription:
            subscription.status = "active"
            subscription.current_period_start = now
            subscription.current_period_end = now + timedelta(days=30)
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def cancel_subscription(db: Session, user: User) -> Subscription:
        subscription = BillingService.current_subscription(db, user)
        if not subscription or subscription.status in ("cancelled", "expired"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription",
            )
        subscription.cancel_at_period_end = True
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def user_invoices(db: Session, user: User) -> list[Invoice]:
        return (
            db.query(Invoice)
            .filter(Invoice.user_id == user.id)
            .order_by(Invoice.id.desc())
            .all()
        )
