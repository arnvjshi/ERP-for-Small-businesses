from pydantic import BaseModel
from typing import Optional

class PaymentRequest(BaseModel):
    payment_mode: str
    discount_code: Optional[str] = None
