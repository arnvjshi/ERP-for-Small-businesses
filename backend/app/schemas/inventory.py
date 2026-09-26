"""Inventory schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class InventoryItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    unit: str
    current_stock: Decimal
    minimum_stock: Decimal
    cost_per_unit: Optional[Decimal] = None
    stock_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    unit: str = Field(..., min_length=1, max_length=50)
    current_stock: Decimal = Field(default=Decimal("0.00"), ge=0)
    minimum_stock: Decimal = Field(default=Decimal("0.00"), ge=0)
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    current_stock: Optional[Decimal] = Field(None, ge=0)
    minimum_stock: Optional[Decimal] = Field(None, ge=0)
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class InventoryStockUpdate(BaseModel):
    """Add or subtract stock."""
    quantity: Decimal
    reason: Optional[str] = None
