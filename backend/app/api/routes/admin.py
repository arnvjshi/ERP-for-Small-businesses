"""Admin routes — protected by ADMIN role."""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, cast, Date

from app.core.database import get_db
from app.api.dependencies import require_admin
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus, OrderStatusHistory
from app.models.service import Service, ServicePrice, PricingType
from app.models.invoice import Invoice
from app.models.inventory import InventoryItem
from app.models.audit import AuditLog
from app.schemas.service import (
    ServiceResponse, ServiceCreate, ServiceUpdate, PriceUpdate,
    ServicePriceResponse, ServicePriceHistory,
)
from app.schemas.order import OrderResponse, OrderListResponse, OrderItemResponse, CustomerResponse
from app.schemas.inventory import (
    InventoryItemResponse, InventoryItemCreate, InventoryItemUpdate, InventoryStockUpdate,
)
from app.schemas.dashboard import DashboardMetrics, DashboardAnalytics, RevenueDataPoint, ServicePopularity
from app.services.pricing_service import get_current_price
from app.services.audit_service import log_action
from app.core.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get admin dashboard metrics."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    todays_orders = db.query(func.count(Order.id)).filter(Order.created_at >= today_start).scalar()
    todays_revenue = (
        db.query(func.coalesce(func.sum(Order.total), 0))
        .filter(Order.created_at >= today_start, Order.status != OrderStatus.CANCELLED)
        .scalar()
    )
    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.RECEIVED, OrderStatus.CONFIRMED])
    ).scalar()
    ready_for_pickup = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.READY_FOR_PICKUP
    ).scalar()
    completed_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.COMPLETED
    ).scalar()
    in_progress = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.IN_PROGRESS
    ).scalar()
    cancelled = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.CANCELLED
    ).scalar()
    total_customers = db.query(func.count(Customer.id)).scalar()
    low_stock = db.query(func.count(InventoryItem.id)).filter(
        InventoryItem.current_stock <= InventoryItem.minimum_stock,
        InventoryItem.is_active == True,
    ).scalar()
    active_services = db.query(func.count(Service.id)).filter(Service.is_active == True).scalar()

    return DashboardMetrics(
        todays_orders=todays_orders,
        todays_revenue=Decimal(str(todays_revenue)),
        pending_orders=pending_orders,
        ready_for_pickup=ready_for_pickup,
        completed_orders=completed_orders,
        in_progress_orders=in_progress,
        cancelled_orders=cancelled,
        total_customers=total_customers,
        low_stock_items=low_stock,
        active_services=active_services,
    )


@router.get("/analytics", response_model=DashboardAnalytics)
def get_analytics(
    days: int = Query(default=30, ge=1, le=365),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get analytics data for charts."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Revenue over time
    orders = (
        db.query(Order)
        .filter(Order.created_at >= start_date, Order.status != OrderStatus.CANCELLED)
        .all()
    )

    revenue_by_date = {}
    for order in orders:
        date_key = order.created_at.strftime("%Y-%m-%d")
        if date_key not in revenue_by_date:
            revenue_by_date[date_key] = {"revenue": Decimal("0"), "orders": 0}
        revenue_by_date[date_key]["revenue"] += order.total
        revenue_by_date[date_key]["orders"] += 1

    revenue_over_time = [
        RevenueDataPoint(date=date, revenue=data["revenue"], orders=data["orders"])
        for date, data in sorted(revenue_by_date.items())
    ]

    # Service popularity
    service_stats = (
        db.query(
            OrderItem.service_name_snapshot,
            func.count(OrderItem.id),
            func.coalesce(func.sum(OrderItem.line_total), 0),
        )
        .join(Order)
        .filter(Order.created_at >= start_date, Order.status != OrderStatus.CANCELLED)
        .group_by(OrderItem.service_name_snapshot)
        .all()
    )

    service_popularity = [
        ServicePopularity(service_name=name, order_count=count, revenue=Decimal(str(revenue)))
        for name, count, revenue in service_stats
    ]

    return DashboardAnalytics(
        revenue_over_time=revenue_over_time,
        service_popularity=service_popularity,
    )


# ─── Orders ──────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[OrderListResponse])
def list_orders(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    payment_filter: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all orders with search and filters."""
    query = db.query(Order).options(joinedload(Order.customer))

    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).filter(
            (Order.order_number.ilike(search_term)) |
            (Customer.name.ilike(search_term)) |
            (Customer.phone.ilike(search_term))
        )
        # Also check invoice number
        invoice_match = db.query(Invoice.order_id).filter(
            Invoice.invoice_number.ilike(search_term)
        ).subquery()
        query = query.union(
            db.query(Order).filter(Order.id.in_(invoice_match))
        ) if not search else query

    if status_filter:
        try:
            status_enum = OrderStatus(status_filter)
            query = query.filter(Order.status == status_enum)
        except ValueError:
            pass

    if payment_filter:
        try:
            payment_enum = PaymentStatus(payment_filter)
            query = query.filter(Order.payment_status == payment_enum)
        except ValueError:
            pass

    orders = query.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return [
        OrderListResponse(
            id=o.id,
            order_number=o.order_number,
            customer_name=o.customer.name,
            customer_phone=o.customer.phone,
            status=o.status.value,
            payment_status=o.payment_status.value,
            total=o.total,
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get order details."""
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
def update_order_status_admin(
    order_id: int,
    status_update: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin can update order status."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = status_update.get("status")
    try:
        new_status_enum = OrderStatus(new_status)
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid status")

    from app.models.order import VALID_TRANSITIONS
    if new_status_enum not in VALID_TRANSITIONS.get(order.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {order.status.value} to {new_status}",
        )

    order.status = new_status_enum
    history = OrderStatusHistory(
        order_id=order.id,
        status=new_status_enum,
        changed_by=admin.id,
        notes=status_update.get("notes"),
    )
    db.add(history)
    db.commit()

    log_action(db, f"Changed order status to {new_status}", "Order", order.id, admin.id)

    return {"message": f"Order status updated to {new_status}"}


@router.patch("/orders/{order_id}/payment")
def update_payment_status(
    order_id: int,
    payment_update: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update payment status."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = payment_update.get("payment_status")
    try:
        new_payment = PaymentStatus(new_status)
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid payment status")

    order.payment_status = new_payment
    db.commit()

    log_action(db, f"Changed payment status to {new_status}", "Order", order.id, admin.id)

    return {"message": f"Payment status updated to {new_status}"}


# ─── Services & Pricing ─────────────────────────────────────────────────────

@router.get("/services", response_model=list[ServiceResponse])
def list_all_services(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all services (including inactive) with current prices."""
    services = db.query(Service).order_by(Service.sort_order).all()
    result = []
    for service in services:
        current_price = get_current_price(db, service.id)
        price_response = None
        if current_price:
            price_response = ServicePriceResponse.model_validate(current_price)
        result.append(ServiceResponse(
            id=service.id,
            name=service.name,
            description=service.description,
            pricing_type=service.pricing_type.value,
            unit=service.unit,
            category=service.category,
            is_active=service.is_active,
            sort_order=service.sort_order,
            current_price=price_response,
            created_at=service.created_at,
            updated_at=service.updated_at,
        ))
    return result


@router.post("/services", response_model=ServiceResponse, status_code=201)
def create_service(
    request: ServiceCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new service with initial pricing."""
    service = Service(
        name=request.name,
        description=request.description,
        pricing_type=PricingType(request.pricing_type),
        unit=request.unit,
        category=request.category,
        sort_order=request.sort_order,
    )
    db.add(service)
    db.flush()

    price = ServicePrice(
        service_id=service.id,
        rate=request.rate,
        minimum_charge=request.minimum_charge,
        created_by=admin.id,
    )
    db.add(price)
    db.commit()
    db.refresh(service)

    log_action(
        db, f"Created service: {service.name}", "Service", service.id, admin.id,
        details=f"Rate: ₹{request.rate}/{request.unit}, Min: ₹{request.minimum_charge}",
    )

    current_price = get_current_price(db, service.id)
    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        pricing_type=service.pricing_type.value,
        unit=service.unit,
        category=service.category,
        is_active=service.is_active,
        sort_order=service.sort_order,
        current_price=ServicePriceResponse.model_validate(current_price) if current_price else None,
        created_at=service.created_at,
        updated_at=service.updated_at,
    )


@router.patch("/services/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    request: ServiceUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update service details (not pricing — use pricing endpoint for that)."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "pricing_type" and value:
            setattr(service, field, PricingType(value))
        else:
            setattr(service, field, value)

    db.commit()
    db.refresh(service)

    log_action(db, f"Updated service: {service.name}", "Service", service.id, admin.id)

    current_price = get_current_price(db, service.id)
    return ServiceResponse(
        id=service.id,
        name=service.name,
        description=service.description,
        pricing_type=service.pricing_type.value,
        unit=service.unit,
        category=service.category,
        is_active=service.is_active,
        sort_order=service.sort_order,
        current_price=ServicePriceResponse.model_validate(current_price) if current_price else None,
        created_at=service.created_at,
        updated_at=service.updated_at,
    )


@router.post("/services/{service_id}/pricing", response_model=ServicePriceResponse, status_code=201)
def update_service_pricing(
    service_id: int,
    request: PriceUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update service pricing. Creates a new price record and deactivates the old one."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Get old price for audit logging
    old_price = get_current_price(db, service_id)
    old_rate = old_price.rate if old_price else None
    old_min = old_price.minimum_charge if old_price else None

    # Deactivate current price
    now = datetime.now(timezone.utc)
    if old_price:
        old_price.effective_until = now
        old_price.is_active = False

    # Create new price
    new_price = ServicePrice(
        service_id=service_id,
        rate=request.rate,
        minimum_charge=request.minimum_charge,
        effective_from=now,
        created_by=admin.id,
    )
    db.add(new_price)
    db.commit()
    db.refresh(new_price)

    details = f"Rate: ₹{old_rate} → ₹{request.rate}"
    if old_min != request.minimum_charge:
        details += f", Min: ₹{old_min} → ₹{request.minimum_charge}"
    log_action(db, f"Updated pricing for {service.name}", "ServicePrice", new_price.id, admin.id, details=details)

    return ServicePriceResponse.model_validate(new_price)


@router.get("/services/{service_id}/pricing", response_model=ServicePriceHistory)
def get_pricing_history(
    service_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get pricing history for a service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    prices = (
        db.query(ServicePrice)
        .filter(ServicePrice.service_id == service_id)
        .order_by(ServicePrice.effective_from.desc())
        .all()
    )
    return ServicePriceHistory(
        prices=[ServicePriceResponse.model_validate(p) for p in prices],
        service_name=service.name,
    )


@router.delete("/services/{service_id}")
def delete_service(
    service_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Soft-delete a service (deactivate)."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check if service has orders
    has_orders = db.query(OrderItem).filter(OrderItem.service_id == service_id).first()
    if has_orders:
        service.is_active = False
        db.commit()
        log_action(db, f"Deactivated service: {service.name}", "Service", service.id, admin.id)
        return {"message": f"Service '{service.name}' deactivated (has existing orders)"}
    else:
        db.delete(service)
        db.commit()
        log_action(db, f"Deleted service: {service.name}", "Service", service_id, admin.id)
        return {"message": f"Service '{service.name}' deleted"}


# ─── Inventory ───────────────────────────────────────────────────────────────

@router.get("/inventory", response_model=list[InventoryItemResponse])
def list_inventory(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all inventory items."""
    items = db.query(InventoryItem).order_by(InventoryItem.name).all()
    return [
        InventoryItemResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            unit=item.unit,
            current_stock=item.current_stock,
            minimum_stock=item.minimum_stock,
            cost_per_unit=item.cost_per_unit,
            stock_status=item.stock_status.value,
            is_active=item.is_active,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.post("/inventory", response_model=InventoryItemResponse, status_code=201)
def create_inventory_item(
    request: InventoryItemCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new inventory item."""
    item = InventoryItem(**request.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    log_action(db, f"Added inventory item: {item.name}", "InventoryItem", item.id, admin.id)

    return InventoryItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        unit=item.unit,
        current_stock=item.current_stock,
        minimum_stock=item.minimum_stock,
        cost_per_unit=item.cost_per_unit,
        stock_status=item.stock_status.value,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.patch("/inventory/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: int,
    request: InventoryItemUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update an inventory item."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    log_action(db, f"Updated inventory: {item.name}", "InventoryItem", item.id, admin.id)

    return InventoryItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        unit=item.unit,
        current_stock=item.current_stock,
        minimum_stock=item.minimum_stock,
        cost_per_unit=item.cost_per_unit,
        stock_status=item.stock_status.value,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.post("/inventory/{item_id}/stock")
def adjust_stock(
    item_id: int,
    request: InventoryStockUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Adjust stock quantity (add or subtract)."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    new_stock = item.current_stock + request.quantity
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot go below zero")

    item.current_stock = new_stock
    db.commit()

    log_action(
        db, f"Adjusted stock for {item.name}: {'+' if request.quantity >= 0 else ''}{request.quantity} {item.unit}",
        "InventoryItem", item.id, admin.id,
        details=request.reason,
    )

    return {"message": f"Stock updated. New stock: {new_stock} {item.unit}"}


# ─── Audit Logs ──────────────────────────────────────────────────────────────

@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    entity_type: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List audit logs."""
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return [
        {
            "id": log.id,
            "user": log.user.full_name if log.user else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


# ─── Workers Management ─────────────────────────────────────────────────────

@router.get("/workers")
def list_workers(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all workers."""
    workers = db.query(User).filter(User.role == UserRole.WORKER).all()
    return [
        {
            "id": w.id,
            "username": w.username,
            "email": w.email,
            "full_name": w.full_name,
            "is_active": w.is_active,
            "created_at": w.created_at.isoformat(),
        }
        for w in workers
    ]


@router.post("/workers", status_code=201)
def create_worker(
    worker_data: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new worker account."""
    existing = db.query(User).filter(
        (User.username == worker_data.get("username")) | (User.email == worker_data.get("email"))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    worker = User(
        username=worker_data["username"],
        email=worker_data["email"],
        full_name=worker_data["full_name"],
        hashed_password=hash_password(worker_data["password"]),
        role=UserRole.WORKER,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)

    log_action(db, f"Created worker: {worker.full_name}", "User", worker.id, admin.id)

    return {
        "id": worker.id,
        "username": worker.username,
        "email": worker.email,
        "full_name": worker.full_name,
        "message": "Worker created successfully",
    }


@router.patch("/workers/{worker_id}")
def update_worker(
    worker_id: int,
    worker_data: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update worker details."""
    worker = db.query(User).filter(User.id == worker_id, User.role == UserRole.WORKER).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    if "full_name" in worker_data:
        worker.full_name = worker_data["full_name"]
    if "email" in worker_data:
        worker.email = worker_data["email"]
    if "is_active" in worker_data:
        worker.is_active = worker_data["is_active"]
    if "password" in worker_data:
        worker.hashed_password = hash_password(worker_data["password"])

    db.commit()

    log_action(db, f"Updated worker: {worker.full_name}", "User", worker.id, admin.id)

    return {"message": "Worker updated successfully"}
