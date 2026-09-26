"""Payment model."""
import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    BANK_TRANSFER = "BANK_TRANSFER"
    OTHER = "OTHER"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    method = Column(SAEnum(PaymentMethod), nullable=False, default=PaymentMethod.CASH)
    reference = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    invoice = relationship("Invoice")

    def __repr__(self):
        return f"<Payment ₹{self.amount} ({self.method.value})>"
