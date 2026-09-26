"""Pricing service — retrieves current prices from the database.

All rates are database-driven. No hard-coded prices.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.service import Service, ServicePrice, PricingType


def get_current_price(db: Session, service_id: int) -> Optional[ServicePrice]:
    """Get the currently active price for a service.

    Returns the most recent active price whose effective_from <= now
    and effective_until is NULL or > now.
    """
    now = datetime.now(timezone.utc)
    price = (
        db.query(ServicePrice)
        .filter(
            ServicePrice.service_id == service_id,
            ServicePrice.is_active == True,
            ServicePrice.effective_from <= now,
        )
        .filter(
            (ServicePrice.effective_until == None) | (ServicePrice.effective_until > now)
        )
        .order_by(ServicePrice.effective_from.desc())
        .first()
    )
    return price


def get_all_active_services_with_prices(db: Session):
    """Get all active services with their current prices."""
    services = db.query(Service).filter(Service.is_active == True).order_by(Service.sort_order).all()
    result = []
    for service in services:
        price = get_current_price(db, service.id)
        if price:
            result.append({
                "id": service.id,
                "name": service.name,
                "description": service.description,
                "pricing_type": service.pricing_type.value,
                "unit": service.unit,
                "category": service.category,
                "rate": price.rate,
                "minimum_charge": price.minimum_charge,
            })
    return result


def calculate_line_total(
    pricing_type: str,
    quantity: Decimal,
    rate: Decimal,
    minimum_charge: Decimal = Decimal("0.00"),
) -> Decimal:
    """Calculate the line total for a single service item.

    Rules:
    - PER_KG: max(quantity * rate, minimum_charge)
    - PER_PIECE: quantity * rate
    - PER_UNIT: quantity * rate
    - FLAT: rate (quantity ignored)
    """
    if pricing_type == PricingType.PER_KG.value or pricing_type == PricingType.PER_KG:
        calculated = quantity * rate
        return max(calculated, minimum_charge).quantize(Decimal("0.01"))
    elif pricing_type in (PricingType.PER_PIECE.value, PricingType.PER_PIECE,
                          PricingType.PER_UNIT.value, PricingType.PER_UNIT):
        return (quantity * rate).quantize(Decimal("0.01"))
    elif pricing_type == PricingType.FLAT.value or pricing_type == PricingType.FLAT:
        return rate.quantize(Decimal("0.01"))
    else:
        raise ValueError(f"Unknown pricing type: {pricing_type}")
