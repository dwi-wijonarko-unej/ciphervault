from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("plans.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="trial", index=True
    )
    current_period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    current_period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payment_gateway: Mapped[str] = mapped_column(String(16), nullable=False, default="manual")
    gateway_subscription_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True
    )
    trial_ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
