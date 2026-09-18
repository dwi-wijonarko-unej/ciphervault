import hashlib
import logging

logger = logging.getLogger(__name__)


def verify_signature(payload: dict, server_key: str) -> bool:
    expected = hashlib.sha512(
        (
            f"{payload.get('order_id', '')}"
            f"{payload.get('status_code', '')}"
            f"{payload.get('gross_amount', '')}"
            f"{server_key}"
        ).encode()
    ).hexdigest()
    provided = payload.get("signature_key", "")
    return bool(provided) and provided.lower() == expected.lower()


def build_checkout_params(
    order_id: str, gross_amount: int, customer_email: str, item_name: str
) -> dict:
    return {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": gross_amount,
        },
        "customer_details": {"email": customer_email},
        "item_details": [
            {"id": order_id, "price": gross_amount, "quantity": 1, "name": item_name}
        ],
    }


def create_snap_token(
    params: dict, server_key: str, sandbox: bool = True, timeout: int = 15
) -> str | None:
    import base64
    import json
    import urllib.request

    base = (
        "https://app.sandbox.midtrans.com/snap/v1/transactions"
        if sandbox
        else "https://app.midtrans.com/snap/v1/transactions"
    )
    auth = base64.b64encode(f"{server_key}:".encode()).decode()
    request = urllib.request.Request(
        base,
        data=json.dumps(params).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode()).get("token")
    except OSError as exc:
        logger.error("Midtrans Snap request failed: %s", exc)
        return None


def notification_status(payload: dict) -> str:
    transaction = payload.get("transaction_status", "")
    fraud = payload.get("fraud_status", "accept")
    if transaction == "capture" and fraud == "accept":
        return "success"
    if transaction == "settlement":
        return "success"
    if transaction in ("deny", "expire", "cancel", "failure"):
        return "failed"
    return "pending"
