"""Service and pricing schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class ServicePriceResponse(BaseModel):
    id: int
    service_id: int
    rate: Decimal
    minimum_charge: Decimal
    effective_from: datetime
    effective_until: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    pricing_type: str
    unit: str
    category: Optional[str] = None
    is_active: bool
    sort_order: int
    current_price: Optional[ServicePriceResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    pricing_type: str = Field(..., pattern="^(PER_KG|PER_PIECE|FLAT|PER_UNIT)$")
    unit: str = Field(..., min_length=1, max_length=50)
    category: Optional[str] = None
    rate: Decimal = Field(..., ge=0)
    minimum_charge: Decimal = Field(default=Decimal("0.00"), ge=0)
    sort_order: int = 0


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    pricing_type: Optional[str] = Field(None, pattern="^(PER_KG|PER_PIECE|FLAT|PER_UNIT)$")
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    category: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class PriceUpdate(BaseModel):
    rate: Decimal = Field(..., ge=0)
    minimum_charge: Decimal = Field(default=Decimal("0.00"), ge=0)


class ServicePriceHistory(BaseModel):
    prices: List[ServicePriceResponse]
    service_name: str

    class Config:
        from_attributes = True


class PublicServiceResponse(BaseModel):
    """Public-facing service info for customer order page."""
    id: int
    name: str
    description: Optional[str] = None
    pricing_type: str
    unit: str
    category: Optional[str] = None
    rate: Decimal
    minimum_charge: Decimal

    class Config:
        from_attributes = True
