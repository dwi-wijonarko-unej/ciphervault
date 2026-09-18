from datetime import datetime

from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: int
    name: str
    tier: int
    price_monthly: int
    price_yearly: int
    storage_bytes: int
    max_file_bytes: int
    max_api_calls_month: int
    features_json: dict
    is_active: bool

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    plan_id: int
    cycle: str = "monthly"


class CheckoutResponse(BaseModel):
    subscription_id: int
    invoice_id: int | None = None
    invoice_number: str | None = None
    amount: int | None = None
    tax_amount: int | None = None
    snap_token: str | None = None
    sandbox: bool = True
    free: bool = False


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan_id: int
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    payment_gateway: str
    trial_ends_at: datetime | None = None

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: int
    subscription_id: int
    user_id: int
    amount: int
    tax_amount: int
    currency: str
    status: str
    invoice_number: str
    issued_at: datetime
    due_at: datetime | None = None
    paid_at: datetime | None = None

    model_config = {"from_attributes": True}


class UsageResponse(BaseModel):
    plan_name: str
    storage_used_bytes: int
    storage_quota_bytes: int
    max_file_bytes: int
