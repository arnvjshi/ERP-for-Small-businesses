"""Worker routes — protected by WORKER role."""
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.api.dependencies import require_worker
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatus, OrderStatusHistory, VALID_TRANSITIONS
from app.models.customer import Customer
from app.schemas.order import (
    OrderResponse, OrderListResponse, OrderItemResponse,
    CustomerResponse, OrderStatusUpdate,
)
from app.schemas.dashboard import WorkerDashboardMetrics
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/worker", tags=["Worker"])


@router.get("/dashboard", response_model=WorkerDashboardMetrics)
def get_worker_dashboard(
    worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
):
    """Get worker dashboard metrics."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    todays_orders = db.query(func.count(Order.id)).filter(Order.created_at >= today_start).scalar()
    pending = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.RECEIVED, OrderStatus.CONFIRMED])
    ).scalar()
    in_progress = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.IN_PROGRESS
    ).scalar()
    completed_today = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.COMPLETED,
        Order.updated_at >= today_start,
    ).scalar()

    return WorkerDashboardMetrics(
        todays_orders=todays_orders,
        pending_work=pending,
        in_progress=in_progress,
        completed_today=completed_today,
    )


@router.get("/orders", response_model=list[OrderListResponse])
def list_worker_orders(
    search: str = None,
    status_filter: str = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
):
    """List orders for workers. Prioritizes actionable orders."""
    query = db.query(Order).options(joinedload(Order.customer), joinedload(Order.invoice))

    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).filter(
            (Order.order_number.ilike(search_term)) |
            (Customer.name.ilike(search_term)) |
            (Customer.phone.ilike(search_term))
        )

    if status_filter:
        try:
            status_enum = OrderStatus(status_filter)
            query = query.filter(Order.status == status_enum)
        except ValueError:
            pass
    else:
        # Default: show actionable orders first
        query = query.filter(
            Order.status.in_([
                OrderStatus.RECEIVED, OrderStatus.CONFIRMED,
                OrderStatus.IN_PROGRESS, OrderStatus.READY_FOR_PICKUP,
            ])
        )

    orders = query.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return [
        OrderListResponse(
            id=o.id,
            order_number=o.order_number,
            customer_name=o.customer.name,
            customer_phone=o.customer.phone,
            status=o.status.value,
            payment_status=o.payment_status.value,
            payment_mode=o.invoice.payment_mode if o.invoice else None,
            total=o.total,
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_worker_order(
    order_id: int,
    worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
):
    """Get order details for worker."""
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items), joinedload(Order.invoice))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        customer=CustomerResponse.model_validate(order.customer),
        status=order.status.value,
        payment_status=order.payment_status.value,
        payment_mode=order.invoice.payment_mode if order.invoice else None,
        items=[OrderItemResponse.model_validate(item) for item in order.items],
        subtotal=order.subtotal,
        discount=order.discount,
        tax=order.tax,
        total=order.total,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    request: OrderStatusUpdate,
    worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
):
    """Worker updates order status."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        new_status = OrderStatus(request.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    if new_status not in VALID_TRANSITIONS.get(order.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {order.status.value} to {request.status}",
        )

    order.status = new_status
    history = OrderStatusHistory(
        order_id=order.id,
        status=new_status,
        changed_by=worker.id,
        notes=request.notes,
    )
    db.add(history)
    db.commit()

    log_action(
        db, f"Updated order {order.order_number} status to {request.status}",
        "Order", order.id, worker.id,
    )

    return {"message": f"Order status updated to {request.status}"}

@router.post("/orders/{order_id}/pay")
def process_order_payment(
    order_id: int,
    payment_data: dict,
    worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
):
    """Process payment and apply discount code."""
    from app.services.payment_service import process_payment
    payment_mode = payment_data.get("payment_mode", "CASH")
    discount_code = payment_data.get("discount_code")
    
    order = process_payment(db, order_id, payment_mode, discount_code)
    
    log_action(
        db, f"Processed payment for order {order.order_number}",
        "Order", order.id, worker.id,
    )
    
    return {"message": "Payment successful"}

