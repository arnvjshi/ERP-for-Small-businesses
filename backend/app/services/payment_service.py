from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.order import Order, PaymentStatus, OrderStatus
from app.models.invoice import Invoice

def process_payment(db: Session, order_id: int, payment_mode: str, discount_code: str = None):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    invoice = order.invoice
    if not invoice:
        raise HTTPException(status_code=400, detail="Invoice not generated for this order")
    
    if order.payment_status == PaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Order is already paid")
    
    # Apply discount logic
    discount_pct = Decimal("0.0")
    if discount_code:
        code = discount_code.upper().strip()
        if code in ["TRYNEW", "DISCOUNT20"]:
            discount_pct = Decimal("0.20")
        elif code == "DISCOUNT10":
            discount_pct = Decimal("0.10")
        else:
            raise HTTPException(status_code=400, detail="Invalid discount coupon")
    
    if discount_pct > 0:
        new_discount = (invoice.subtotal * discount_pct).quantize(Decimal("0.01"))
        invoice.discount = new_discount
        invoice.total = invoice.subtotal - new_discount + invoice.tax
        order.discount = new_discount
        order.total = invoice.total

    invoice.payment_mode = payment_mode.upper()
    order.payment_status = PaymentStatus.PAID
    
    # If order is ready for pickup, completing payment means it can be completed
    if order.status == OrderStatus.READY_FOR_PICKUP:
        from app.models.order import OrderStatusHistory
        order.status = OrderStatus.COMPLETED
        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.COMPLETED,
            notes=f"Paid via {payment_mode}" + (f" with coupon {discount_code}" if discount_code else "")
        )
        db.add(history)

    db.commit()
    db.refresh(order)
    return order
