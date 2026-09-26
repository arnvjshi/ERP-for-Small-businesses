"""Service and ServicePrice models for dynamic pricing."""
import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum as SAEnum,
    ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class PricingType(str, enum.Enum):
    PER_KG = "PER_KG"
    PER_PIECE = "PER_PIECE"
    FLAT = "FLAT"
    PER_UNIT = "PER_UNIT"


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    pricing_type = Column(SAEnum(PricingType), nullable=False, default=PricingType.PER_PIECE)
    unit = Column(String(50), nullable=False, default="piece")
    category = Column(String(100), nullable=True)  # e.g. "Dry Cleaning" parent category
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    prices = relationship("ServicePrice", back_populates="service", order_by="ServicePrice.effective_from.desc()")

    def __repr__(self):
        return f"<Service {self.name} ({self.pricing_type.value})>"


class ServicePrice(Base):
    __tablename__ = "service_prices"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, index=True)
    rate = Column(Numeric(12, 2), nullable=False)
    minimum_charge = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    effective_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    effective_until = Column(DateTime(timezone=True), nullable=True)  # NULL = currently active
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    service = relationship("Service", back_populates="prices")

    def __repr__(self):
        return f"<ServicePrice {self.service_id}: ₹{self.rate}/{self.service.unit if self.service else '?'}>"
