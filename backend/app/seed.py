"""Seed script — creates development data.

Run: python -m app.seed
"""
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.core.database import engine, SessionLocal, Base
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.service import Service, ServicePrice, PricingType
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus, OrderStatusHistory
from app.models.invoice import Invoice
from app.models.inventory import InventoryItem
from app.models.audit import AuditLog
from app.services.billing_service import create_order_with_billing


def seed():
    """Seed the database with development data."""
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # ─── Users ────────────────────────────────────────────────────────
        admin = User(
            username="admin",
            email="admin@laundrybros.com",
            full_name="Admin User",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
        )
        worker1 = User(
            username="worker1",
            email="raj@laundrybros.com",
            full_name="Raj Kumar",
            hashed_password=hash_password("worker123"),
            role=UserRole.WORKER,
        )
        worker2 = User(
            username="worker2",
            email="priya@laundrybros.com",
            full_name="Priya Sharma",
            hashed_password=hash_password("worker123"),
            role=UserRole.WORKER,
        )
        db.add_all([admin, worker1, worker2])
        db.flush()
        print("  ✓ Created users (admin, worker1, worker2)")

        # ─── Services ────────────────────────────────────────────────────
        washing = Service(
            name="Washing", description="Regular clothes washing service",
            pricing_type=PricingType.PER_KG, unit="kg", sort_order=1,
        )
        ironing = Service(
            name="Steam Ironing", description="Professional steam ironing",
            pricing_type=PricingType.PER_PIECE, unit="piece", sort_order=2,
        )
        dc_shirt = Service(
            name="Dry Cleaning - Shirt", description="Dry cleaning for shirts",
            pricing_type=PricingType.PER_PIECE, unit="piece", category="Dry Cleaning", sort_order=3,
        )
        dc_trousers = Service(
            name="Dry Cleaning - Trousers", description="Dry cleaning for trousers",
            pricing_type=PricingType.PER_PIECE, unit="piece", category="Dry Cleaning", sort_order=4,
        )
        dc_jacket = Service(
            name="Dry Cleaning - Jacket", description="Dry cleaning for jackets",
            pricing_type=PricingType.PER_PIECE, unit="piece", category="Dry Cleaning", sort_order=5,
        )
        dc_suit = Service(
            name="Dry Cleaning - Suit", description="Dry cleaning for full suits",
            pricing_type=PricingType.PER_PIECE, unit="piece", category="Dry Cleaning", sort_order=6,
        )
        dc_dress = Service(
            name="Dry Cleaning - Dress", description="Dry cleaning for dresses",
            pricing_type=PricingType.PER_PIECE, unit="piece", category="Dry Cleaning", sort_order=7,
        )
        services = [washing, ironing, dc_shirt, dc_trousers, dc_jacket, dc_suit, dc_dress]
        db.add_all(services)
        db.flush()
        print("  ✓ Created services")

        # ─── Pricing (seed defaults) ─────────────────────────────────────
        prices = [
            ServicePrice(service_id=washing.id, rate=Decimal("60.00"), minimum_charge=Decimal("50.00"), created_by=admin.id),
            ServicePrice(service_id=ironing.id, rate=Decimal("15.00"), minimum_charge=Decimal("0.00"), created_by=admin.id),
            ServicePrice(service_id=dc_shirt.id, rate=Decimal("80.00"), minimum_charge=Decimal("0.00"), created_by=admin.id),
            ServicePrice(service_id=dc_trousers.id, rate=Decimal("100.00"), minimum_charge=Decimal("0.00"), created_by=admin.id),
            ServicePrice(service_id=dc_jacket.id, rate=Decimal("150.00"), minimum_charge=Decimal("0.00"), created_by=admin.id),
            ServicePrice(service_id=dc_suit.id, rate=Decimal("300.00"), minimum_charge=Decimal("0.00"), created_by=admin.id),
            ServicePrice(service_id=dc_dress.id, rate=Decimal("200.00"), minimum_charge=Decimal("0.00"), created_by=admin.id),
        ]
        db.add_all(prices)
        db.flush()
        print("  ✓ Created pricing (seed defaults)")

        # ─── Inventory ────────────────────────────────────────────────────
        inventory = [
            InventoryItem(name="Detergent", unit="L", current_stock=Decimal("12.00"), minimum_stock=Decimal("5.00"), cost_per_unit=Decimal("120.00")),
            InventoryItem(name="Fabric Softener", unit="L", current_stock=Decimal("8.00"), minimum_stock=Decimal("3.00"), cost_per_unit=Decimal("85.00")),
            InventoryItem(name="Stain Remover", unit="L", current_stock=Decimal("3.00"), minimum_stock=Decimal("2.00"), cost_per_unit=Decimal("200.00")),
            InventoryItem(name="Packaging Bags", unit="pieces", current_stock=Decimal("150.00"), minimum_stock=Decimal("50.00"), cost_per_unit=Decimal("5.00")),
            InventoryItem(name="Hangers", unit="pieces", current_stock=Decimal("200.00"), minimum_stock=Decimal("50.00"), cost_per_unit=Decimal("10.00")),
            InventoryItem(name="Labels", unit="pieces", current_stock=Decimal("500.00"), minimum_stock=Decimal("100.00"), cost_per_unit=Decimal("2.00")),
        ]
        db.add_all(inventory)
        db.flush()
        print("  ✓ Created inventory items")

        db.commit()

        # ─── Sample Orders ───────────────────────────────────────────────
        # Order 1: Washing + Ironing
        order1 = create_order_with_billing(
            db=db,
            customer_data={"name": "Arnav Joshi", "phone": "9876543210", "email": "arnav@example.com", "address": "123 MG Road, Pune"},
            items_data=[
                {"service_id": washing.id, "quantity": "2.5"},
                {"service_id": ironing.id, "quantity": "5"},
            ],
        )
        print(f"  ✓ Created order {order1.order_number} (₹{order1.total})")

        # Order 2: Dry cleaning
        order2 = create_order_with_billing(
            db=db,
            customer_data={"name": "Meera Patel", "phone": "9876543211", "email": "meera@example.com"},
            items_data=[
                {"service_id": dc_shirt.id, "quantity": "3"},
                {"service_id": dc_trousers.id, "quantity": "2"},
            ],
        )
        print(f"  ✓ Created order {order2.order_number} (₹{order2.total})")

        # Order 3: Small washing (should hit minimum charge)
        order3 = create_order_with_billing(
            db=db,
            customer_data={"name": "Vikram Singh", "phone": "9876543212"},
            items_data=[
                {"service_id": washing.id, "quantity": "0.5"},
            ],
        )
        print(f"  ✓ Created order {order3.order_number} (₹{order3.total} — minimum charge applied)")

        # Order 4: Combined services
        order4 = create_order_with_billing(
            db=db,
            customer_data={"name": "Anita Desai", "phone": "9876543213", "address": "456 FC Road, Pune"},
            items_data=[
                {"service_id": washing.id, "quantity": "4"},
                {"service_id": ironing.id, "quantity": "10"},
                {"service_id": dc_suit.id, "quantity": "1"},
            ],
        )
        print(f"  ✓ Created order {order4.order_number} (₹{order4.total})")

        # Order 5: Another customer
        order5 = create_order_with_billing(
            db=db,
            customer_data={"name": "Ravi Menon", "phone": "9876543214"},
            items_data=[
                {"service_id": ironing.id, "quantity": "8"},
                {"service_id": dc_jacket.id, "quantity": "1"},
            ],
        )
        print(f"  ✓ Created order {order5.order_number} (₹{order5.total})")

        # Update some order statuses
        order1.status = OrderStatus.IN_PROGRESS
        db.add(OrderStatusHistory(order_id=order1.id, status=OrderStatus.CONFIRMED, changed_by=worker1.id))
        db.add(OrderStatusHistory(order_id=order1.id, status=OrderStatus.IN_PROGRESS, changed_by=worker1.id))

        order2.status = OrderStatus.READY_FOR_PICKUP
        db.add(OrderStatusHistory(order_id=order2.id, status=OrderStatus.CONFIRMED, changed_by=worker2.id))
        db.add(OrderStatusHistory(order_id=order2.id, status=OrderStatus.IN_PROGRESS, changed_by=worker2.id))
        db.add(OrderStatusHistory(order_id=order2.id, status=OrderStatus.READY_FOR_PICKUP, changed_by=worker2.id))

        order3.status = OrderStatus.COMPLETED
        order3.payment_status = PaymentStatus.PAID
        db.add(OrderStatusHistory(order_id=order3.id, status=OrderStatus.CONFIRMED, changed_by=worker1.id))
        db.add(OrderStatusHistory(order_id=order3.id, status=OrderStatus.IN_PROGRESS, changed_by=worker1.id))
        db.add(OrderStatusHistory(order_id=order3.id, status=OrderStatus.READY_FOR_PICKUP, changed_by=worker1.id))
        db.add(OrderStatusHistory(order_id=order3.id, status=OrderStatus.COMPLETED, changed_by=worker1.id))

        db.commit()
        print("  ✓ Updated order statuses")

        print("\n✅ Database seeded successfully!")
        print("\n── Development Credentials ──")
        print("  Admin:   admin / admin123")
        print("  Worker1: worker1 / worker123")
        print("  Worker2: worker2 / worker123")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
