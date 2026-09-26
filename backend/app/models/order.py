"""Order, OrderItem, and OrderStatusHistory models."""
import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum as SAEnum,
    ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    REFUNDED = "REFUNDED"


# Valid status transitions
VALID_TRANSITIONS = {
    OrderStatus.RECEIVED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    OrderStatus.CONFIRMED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
    OrderStatus.IN_PROGRESS: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    OrderStatus.READY_FOR_PICKUP: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    OrderStatus.COMPLETED: [],
    OrderStatus.CANCELLED: [],
}


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.RECEIVED, nullable=False)
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    discount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    total = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    customer = relationship("Customer")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order",
                                  order_by="OrderStatusHistory.created_at.desc()")
    invoice = relationship("Invoice", back_populates="order", uselist=False)

    def __repr__(self):
        return f"<Order {self.order_number} ({self.status.value})>"


class OrderItem(Base):
    """Stores a price snapshot — never re-fetches current prices for display."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    service_name_snapshot = Column(String(255), nullable=False)
    pricing_type_snapshot = Column(String(20), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit = Column(String(50), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    minimum_charge_snapshot = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    line_total = Column(Numeric(12, 2), nullable=False)
    garment_type = Column(String(100), nullable=True)  # For dry cleaning
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="items")
    service = relationship("Service")

    def __repr__(self):
        return f"<OrderItem {self.service_name_snapshot} x{self.quantity}>"


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    status = Column(SAEnum(OrderStatus), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="status_history")
    user = relationship("User")

    def __repr__(self):
        return f"<OrderStatusHistory {self.order_id}: {self.status.value}>"
