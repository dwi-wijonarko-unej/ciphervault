import hashlib
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.database import SessionLocal, init_db
from backend.main import app
from backend.models import Plan, User
from backend.seeders import run_billing_seeders

init_db()
run_billing_seeders()

client = TestClient(app)


def _uid(prefix="bill"):
    return f"{prefix}_{uuid4().hex[:8]}"


def _register_and_login():
    username = _uid()
    r = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@test.io",
            "password": "Pass123!",
        },
    )
    assert r.status_code == 200, r.text
    r = client.post(
        "/auth/login", json={"username": username, "password": "Pass123!"}
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return data["access_token"], data["user"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _make_admin(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        user.role = "admin"
        db.commit()
    finally:
        db.close()


def _plan_id(name):
    db = SessionLocal()
    try:
        return db.query(Plan).filter(Plan.name == name).first().id
    finally:
        db.close()


def test_plans_returns_three_tiers_idr():
    r = client.get("/billing/plans")
    assert r.status_code == 200
    plans = r.json()
    assert [p["name"] for p in plans] == ["free", "pro", "enterprise"]
    pro = [p for p in plans if p["name"] == "pro"][0]
    assert pro["price_monthly"] == 29000_00
    assert pro["storage_bytes"] == 100 * 1024**3


def test_checkout_free_plan():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("free"), "cycle": "monthly"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["free"] is True


def test_checkout_paid_creates_invoice_with_ppn():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["snap_token"] is None
    assert body["amount"] == 29000_00
    assert body["tax_amount"] == int(round(29000_00 * 0.11))
    assert body["invoice_number"].startswith("CV-")


def test_webhook_success_activates_subscription():
    from backend.config import get_settings

    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    invoice_number = r.json()["invoice_number"]
    amount = r.json()["amount"] + r.json()["tax_amount"]

    server_key = get_settings().midtrans_server_key or "test-key"
    payload = {
        "order_id": invoice_number,
        "status_code": "200",
        "gross_amount": str(float(amount)),
        "transaction_status": "settlement",
        "transaction_id": "txn-test-1",
        "payment_type": "qris",
    }
    payload["signature_key"] = hashlib.sha512(
        f"{payload['order_id']}{payload['status_code']}"
        f"{payload['gross_amount']}{server_key}".encode()
    ).hexdigest()

    import backend.services.billing_service as billing_mod

    real_key = billing_mod.settings.midtrans_server_key
    billing_mod.settings.midtrans_server_key = server_key
    try:
        r = client.post("/billing/webhook/midtrans", json=payload)
    finally:
        billing_mod.settings.midtrans_server_key = real_key
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "paid"

    r = client.get("/billing/subscription", headers=_auth(token))
    assert r.json()["status"] == "active"


def test_quota_enforcement_rejects_over_limit_upload():
    token, _ = _register_and_login()
    db = SessionLocal()
    try:
        plan = db.query(Plan).filter(Plan.name == "free").first()
        oversized = plan.max_file_bytes + 1
    finally:
        db.close()
    r = client.post(
        "/files/upload",
        files={"file": ("big.bin", b"x" * min(oversized, 2_000_000))},
        headers=_auth(token),
    )
    assert r.status_code in (402, 413)


def test_invoice_pdf_contains_ppn():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    invoice_id = r.json()["invoice_id"]
    r = client.get(f"/billing/invoices/{invoice_id}", headers=_auth(token))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert b"PPN 11%" in r.content


def test_invoice_detail_returns_plan_info():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    invoice_id = r.json()["invoice_id"]
    r = client.get(f"/billing/invoices/{invoice_id}/detail", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["invoice_number"].startswith("CV-")
    assert body["plan_name"] == "pro"
    assert body["payment_gateway"] == "midtrans"
    assert body["amount"] == 29000_00


def test_invoice_detail_other_user_forbidden():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    invoice_id = r.json()["invoice_id"]
    other_token, _ = _register_and_login()
    r = client.get(f"/billing/invoices/{invoice_id}/detail", headers=_auth(other_token))
    assert r.status_code == 404


def test_checkout_without_key_returns_no_redirect():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly", "payment_method": "qris"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["snap_token"] is None
    assert body["redirect_url"] is None
    assert body["invoice_id"] is not None


def test_mock_confirm_disabled_by_default():
    token, _ = _register_and_login()
    r = client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    invoice_id = r.json()["invoice_id"]
    r = client.post(
        f"/billing/invoices/{invoice_id}/mock-confirm", headers=_auth(token)
    )
    assert r.status_code == 403


def test_mock_confirm_marks_paid_when_enabled():
    from backend.config import get_settings

    settings = get_settings()
    old = settings.mock_gateway
    settings.mock_gateway = True
    try:
        token, _ = _register_and_login()
        r = client.post(
            "/billing/checkout",
            json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
            headers=_auth(token),
        )
        invoice_id = r.json()["invoice_id"]
        r = client.post(
            f"/billing/invoices/{invoice_id}/mock-confirm", headers=_auth(token)
        )
        assert r.status_code == 200
        assert r.json()["status"] == "paid"
        r = client.get("/billing/subscription", headers=_auth(token))
        assert r.json()["status"] == "active"
    finally:
        settings.mock_gateway = old


def test_admin_revenue_and_subscriptions():
    token, user = _register_and_login()
    _make_admin(user["id"])
    r = client.get("/admin/revenue", headers=_auth(token))
    assert r.status_code == 200
    assert "mrr" in r.json()
    r = client.get("/admin/subscriptions", headers=_auth(token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_trial_period_active_for_paid_plan():
    token, _ = _register_and_login()
    client.post(
        "/billing/checkout",
        json={"plan_id": _plan_id("pro"), "cycle": "monthly"},
        headers=_auth(token),
    )
    r = client.get("/billing/subscription", headers=_auth(token))
    assert r.json()["status"] == "trial"
    assert r.json()["trial_ends_at"] is not None
