"""Public routes — services listing and order creation (no auth required)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.order import Order
from app.models.invoice import Invoice
from app.schemas.order import (
    OrderCreateRequest, OrderCreateResponse, OrderTrackResponse,
    OrderStatusHistoryResponse,
)
from app.schemas.invoice import InvoiceResponse, InvoiceItemResponse
from app.schemas.service import PublicServiceResponse
from app.services.billing_service import create_order_with_billing
from app.services.pricing_service import get_all_active_services_with_prices

router = APIRouter(prefix="/api", tags=["Public"])


@router.get("/services", response_model=list[PublicServiceResponse])
def list_services(db: Session = Depends(get_db)):
    """Get all active services with current pricing. Public endpoint."""
    services = get_all_active_services_with_prices(db)
    return services


@router.post("/orders", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
def create_order(request: OrderCreateRequest, db: Session = Depends(get_db)):
    """Create a new order. Backend calculates all prices — never trusts client totals."""
    try:
        order = create_order_with_billing(
            db=db,
            customer_data=request.customer.model_dump(),
            items_data=[item.model_dump() for item in request.items],
            notes=request.notes,
        )
        return OrderCreateResponse(
            order_number=order.order_number,
            total=order.total,
            message="Order placed successfully! Save your Order ID for tracking.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/orders/{order_number}/track", response_model=OrderTrackResponse)
def track_order(order_number: str, phone: str = None, db: Session = Depends(get_db)):
    """Track order by order number. Requires phone for verification."""
    order = db.query(Order).filter(Order.order_number == order_number.upper()).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found. Please check your Order ID.",
        )

    # Phone verification — require last 4 digits
    if phone:
        if not order.customer.phone.endswith(phone[-4:]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Phone number does not match.",
            )

    service_names = [item.service_name_snapshot for item in order.items]
    status_history = [
        OrderStatusHistoryResponse(
            id=h.id,
            status=h.status.value,
            changed_by=None,  # Don't expose user IDs
            notes=h.notes,
            created_at=h.created_at,
        )
        for h in sorted(order.status_history, key=lambda x: x.created_at)
    ]

    return OrderTrackResponse(
        order_number=order.order_number,
        status=order.status.value,
        payment_status=order.payment_status.value,
        services=service_names,
        total=order.total,
        created_at=order.created_at,
        status_history=status_history,
    )


@router.get("/orders/{order_number}/bill", response_model=InvoiceResponse)
def get_bill(order_number: str, db: Session = Depends(get_db)):
    """Get the invoice/bill for an order. Uses stored price snapshots."""
    order = db.query(Order).filter(Order.order_number == order_number.upper()).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    invoice = order.invoice
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not yet generated.",
        )

    items = [
        InvoiceItemResponse(
            service_name=item.service_name_snapshot,
            pricing_type=item.pricing_type_snapshot,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            minimum_charge=item.minimum_charge_snapshot,
            line_total=item.line_total,
            garment_type=item.garment_type,
        )
        for item in order.items
    ]

    return InvoiceResponse(
        invoice_number=invoice.invoice_number,
        order_number=order.order_number,
        customer_name=order.customer.name,
        customer_phone=order.customer.phone,
        items=items,
        subtotal=invoice.subtotal,
        discount=invoice.discount,
        tax=invoice.tax,
        total=invoice.total,
        payment_mode=invoice.payment_mode,
        payment_status=order.payment_status.value,
        order_status=order.status.value,
        created_at=invoice.created_at,
    )
