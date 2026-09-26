"""Order schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class OrderItemRequest(BaseModel):
    service_id: int
    quantity: Decimal = Field(..., gt=0)
    garment_type: Optional[str] = None  # For dry cleaning


class CustomerInfo(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=5, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = Field(None, max_length=500)


class OrderCreateRequest(BaseModel):
    customer: CustomerInfo
    items: List[OrderItemRequest] = Field(..., min_length=1)
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    service_id: int
    service_name_snapshot: str
    pricing_type_snapshot: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    minimum_charge_snapshot: Decimal
    line_total: Decimal
    garment_type: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True


class OrderStatusHistoryResponse(BaseModel):
    id: int
    status: str
    changed_by: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer: CustomerResponse
    status: str
    payment_status: str
    payment_mode: Optional[str] = None
    items: List[OrderItemResponse]
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    id: int
    order_number: str
    customer_name: str
    customer_phone: str
    status: str
    payment_status: str
    payment_mode: Optional[str] = None
    total: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class OrderTrackResponse(BaseModel):
    """Limited info for public tracking — no sensitive customer data."""
    order_number: str
    status: str
    payment_status: str
    services: List[str]
    total: Decimal
    created_at: datetime
    status_history: List[OrderStatusHistoryResponse]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(RECEIVED|CONFIRMED|IN_PROGRESS|READY_FOR_PICKUP|COMPLETED|CANCELLED)$")
    notes: Optional[str] = None


class OrderCreateResponse(BaseModel):
    order_number: str
    total: Decimal
    message: str
