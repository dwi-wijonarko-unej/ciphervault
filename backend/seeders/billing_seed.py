from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import Plan

GB = 1024**3

DEFAULT_PLANS = [
    {
        "name": "free",
        "tier": 0,
        "price_monthly": 0,
        "price_yearly": 0,
        "storage_bytes": 1 * GB,
        "max_file_bytes": 10 * 1024 * 1024,
        "max_api_calls_month": 1000,
        "features_json": {
            "sharing": True,
            "public_link": False,
            "api_access": False,
        },
    },
    {
        "name": "pro",
        "tier": 1,
        "price_monthly": 29000_00,
        "price_yearly": 290000_00,
        "storage_bytes": 100 * GB,
        "max_file_bytes": 100 * 1024 * 1024,
        "max_api_calls_month": 100000,
        "features_json": {
            "sharing": True,
            "public_link": True,
            "api_access": True,
        },
    },
    {
        "name": "enterprise",
        "tier": 2,
        "price_monthly": 290000_00,
        "price_yearly": 2900000_00,
        "storage_bytes": 1024 * GB,
        "max_file_bytes": 500 * 1024 * 1024,
        "max_api_calls_month": 1000000,
        "features_json": {
            "sharing": True,
            "public_link": True,
            "api_access": True,
            "sso": True,
            "audit_export": True,
        },
    },
]


def seed_plans(db: Session | None = None) -> None:
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        for spec in DEFAULT_PLANS:
            existing = db.query(Plan).filter(Plan.name == spec["name"]).first()
            if existing:
                continue
            db.add(Plan(**spec))
        db.commit()
    finally:
        if close:
            db.close()


def run_billing_seeders() -> None:
    seed_plans()
