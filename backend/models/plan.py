from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price_monthly: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price_yearly: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    storage_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    max_file_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    max_api_calls_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    features_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
