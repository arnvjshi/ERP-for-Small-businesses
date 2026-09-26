"""Billing service — authoritative bill calculation.

The frontend may show estimates, but THIS service calculates the real bill.
Never accept client-supplied totals.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict

from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus, OrderStatusHistory
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.services.pricing_service import get_current_price, calculate_line_total


def generate_order_number(db: Session) -> str:
    """Generate unique order number: ORD-YYYY-NNNNNN."""
    year = datetime.now(timezone.utc).year
    prefix = f"ORD-{year}-"
    last_order = (
        db.query(Order)
        .filter(Order.order_number.like(f"{prefix}%"))
        .order_by(Order.id.desc())
        .first()
    )
    if last_order:
        last_num = int(last_order.order_number.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"{prefix}{new_num:06d}"


def generate_invoice_number(db: Session) -> str:
    """Generate unique invoice number: INV-YYYY-NNNNNN."""
    year = datetime.now(timezone.utc).year
    prefix = f"INV-{year}-"
    last_invoice = (
        db.query(Invoice)
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .order_by(Invoice.id.desc())
        .first()
    )
    if last_invoice:
        last_num = int(last_invoice.invoice_number.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"{prefix}{new_num:06d}"


def create_order_with_billing(
    db: Session,
    customer_data: dict,
    items_data: List[dict],
    notes: str = None,
) -> Order:
    """Create an order with backend-calculated billing.

    Steps:
    1. Find or create customer
    2. Validate services and retrieve current prices
    3. Calculate each line item (with minimum charges)
    4. Calculate subtotal, discount, tax, total
    5. Store price snapshots on OrderItem
    6. Generate invoice
    """
    # 1. Find or create customer
    customer = (
        db.query(Customer)
        .filter(Customer.phone == customer_data["phone"])
        .first()
    )
    if not customer:
        customer = Customer(
            name=customer_data["name"],
            phone=customer_data["phone"],
            email=customer_data.get("email"),
            address=customer_data.get("address"),
        )
        db.add(customer)
        db.flush()
    else:
        # Update customer info
        customer.name = customer_data["name"]
        if customer_data.get("email"):
            customer.email = customer_data["email"]
        if customer_data.get("address"):
            customer.address = customer_data["address"]

    # 2. Create order
    order_number = generate_order_number(db)
    order = Order(
        order_number=order_number,
        customer_id=customer.id,
        status=OrderStatus.RECEIVED,
        payment_status=PaymentStatus.PENDING,
        notes=notes,
    )
    db.add(order)
    db.flush()

    # 3. Process each item — retrieve current prices, calculate totals
    subtotal = Decimal("0.00")
    order_items = []

    for item_data in items_data:
        service = db.query(Service).filter(
            Service.id == item_data["service_id"],
            Service.is_active == True,
        ).first()
        if not service:
            raise ValueError(f"Service with id {item_data['service_id']} not found or inactive")

        current_price = get_current_price(db, service.id)
        if not current_price:
            raise ValueError(f"No active price found for service: {service.name}")

        quantity = Decimal(str(item_data["quantity"]))
        line_total = calculate_line_total(
            pricing_type=service.pricing_type.value,
            quantity=quantity,
            rate=current_price.rate,
            minimum_charge=current_price.minimum_charge,
        )

        order_item = OrderItem(
            order_id=order.id,
            service_id=service.id,
            service_name_snapshot=service.name,
            pricing_type_snapshot=service.pricing_type.value,
            quantity=quantity,
            unit=service.unit,
            unit_price=current_price.rate,
            minimum_charge_snapshot=current_price.minimum_charge,
            line_total=line_total,
            garment_type=item_data.get("garment_type"),
        )
        db.add(order_item)
        order_items.append(order_item)
        subtotal += line_total

    # 4. Calculate totals
    discount = Decimal("0.00")
    tax = Decimal("0.00")
    total = (subtotal - discount + tax).quantize(Decimal("0.01"))

    order.subtotal = subtotal.quantize(Decimal("0.01"))
    order.discount = discount
    order.tax = tax
    order.total = total

    # 5. Create invoice
    invoice_number = generate_invoice_number(db)
    invoice = Invoice(
        invoice_number=invoice_number,
        order_id=order.id,
        subtotal=order.subtotal,
        discount=order.discount,
        tax=order.tax,
        total=order.total,
    )
    db.add(invoice)

    # 6. Record initial status
    status_history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.RECEIVED,
        notes="Order placed by customer",
    )
    db.add(status_history)

    db.commit()
    db.refresh(order)
    return order


def recalculate_order_total(db: Session, order: Order) -> Order:
    """Recalculate order total from its items. Used when items are modified by a worker."""
    subtotal = Decimal("0.00")
    for item in order.items:
        subtotal += item.line_total

    order.subtotal = subtotal.quantize(Decimal("0.01"))
    order.total = (order.subtotal - order.discount + order.tax).quantize(Decimal("0.01"))

    # Update invoice
    if order.invoice:
        order.invoice.subtotal = order.subtotal
        order.invoice.total = order.total

    db.commit()
    db.refresh(order)
    return order
