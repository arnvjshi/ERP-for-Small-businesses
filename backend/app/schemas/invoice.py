"""Invoice schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class InvoiceItemResponse(BaseModel):
    service_name: str
    pricing_type: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    minimum_charge: Decimal
    line_total: Decimal
    garment_type: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    invoice_number: str
    order_number: str
    customer_name: str
    customer_phone: str
    items: List[InvoiceItemResponse]
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    payment_status: str
    order_status: str
    created_at: datetime

    class Config:
        from_attributes = True
