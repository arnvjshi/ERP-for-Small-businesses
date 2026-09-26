"""Inventory model — generic design for any small business."""
import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, Enum as SAEnum
from app.core.database import Base


class StockStatus(str, enum.Enum):
    IN_STOCK = "IN_STOCK"
    LOW_STOCK = "LOW_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(50), nullable=False)  # L, kg, pieces, etc.
    current_stock = Column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    minimum_stock = Column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    cost_per_unit = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def stock_status(self) -> StockStatus:
        if self.current_stock <= 0:
            return StockStatus.OUT_OF_STOCK
        elif self.current_stock <= self.minimum_stock:
            return StockStatus.LOW_STOCK
        return StockStatus.IN_STOCK

    def __repr__(self):
        return f"<InventoryItem {self.name}: {self.current_stock} {self.unit}>"
