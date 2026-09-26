"""Tests for order creation and dynamic pricing.

Critically tests: old orders keep old prices when admin changes pricing.
"""
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.service import Service, ServicePrice, PricingType
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables and seed test data."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    admin = User(
        username="testadmin", email="admin@test.com", full_name="Test Admin",
        hashed_password=hash_password("admin123"), role=UserRole.ADMIN,
    )
    db.add(admin)
    db.flush()

    washing = Service(
        name="Washing", pricing_type=PricingType.PER_KG, unit="kg", sort_order=1,
    )
    ironing = Service(
        name="Steam Ironing", pricing_type=PricingType.PER_PIECE, unit="piece", sort_order=2,
    )
    dc_shirt = Service(
        name="Dry Cleaning - Shirt", pricing_type=PricingType.PER_PIECE, unit="piece",
        category="Dry Cleaning", sort_order=3,
    )
    db.add_all([washing, ironing, dc_shirt])
    db.flush()

    db.add(ServicePrice(service_id=washing.id, rate=Decimal("60.00"), minimum_charge=Decimal("50.00"), created_by=admin.id))
    db.add(ServicePrice(service_id=ironing.id, rate=Decimal("15.00"), minimum_charge=Decimal("0.00"), created_by=admin.id))
    db.add(ServicePrice(service_id=dc_shirt.id, rate=Decimal("80.00"), minimum_charge=Decimal("0.00"), created_by=admin.id))

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def _get_admin_token():
    resp = client.post("/api/auth/login", json={"username": "testadmin", "password": "admin123"})
    return resp.json()["access_token"]


class TestOrderCreation:
    def test_create_order_basic(self):
        """Create a simple order with washing."""
        services = client.get("/api/services").json()
        washing_id = next(s["id"] for s in services if s["name"] == "Washing")

        response = client.post("/api/orders", json={
            "customer": {"name": "Test Customer", "phone": "1234567890"},
            "items": [{"service_id": washing_id, "quantity": 2.5}],
        })
        assert response.status_code == 201
        data = response.json()
        assert data["order_number"].startswith("ORD-")
        assert float(data["total"]) == 150.00  # 2.5 × ₹60 = ₹150

    def test_create_order_minimum_charge(self):
        """0.5kg washing should hit ₹50 minimum."""
        services = client.get("/api/services").json()
        washing_id = next(s["id"] for s in services if s["name"] == "Washing")

        response = client.post("/api/orders", json={
            "customer": {"name": "Min Charge Test", "phone": "1234567891"},
            "items": [{"service_id": washing_id, "quantity": 0.5}],
        })
        assert response.status_code == 201
        assert float(response.json()["total"]) == 50.00  # minimum charge

    def test_create_order_combined_services(self):
        """Order with washing + ironing + dry cleaning."""
        services = client.get("/api/services").json()
        washing_id = next(s["id"] for s in services if s["name"] == "Washing")
        ironing_id = next(s["id"] for s in services if s["name"] == "Steam Ironing")
        shirt_id = next(s["id"] for s in services if s["name"] == "Dry Cleaning - Shirt")

        response = client.post("/api/orders", json={
            "customer": {"name": "Combined Test", "phone": "1234567892"},
            "items": [
                {"service_id": washing_id, "quantity": 2.5},
                {"service_id": ironing_id, "quantity": 4},
                {"service_id": shirt_id, "quantity": 2},
            ],
        })
        assert response.status_code == 201
        # 150 + 60 + 160 = ₹370
        assert float(response.json()["total"]) == 370.00

    def test_create_order_invalid_service(self):
        """Order with non-existent service should fail."""
        response = client.post("/api/orders", json={
            "customer": {"name": "Bad Service", "phone": "1234567893"},
            "items": [{"service_id": 9999, "quantity": 1}],
        })
        assert response.status_code == 400

    def test_create_order_empty_items(self):
        """Order with no items should fail validation."""
        response = client.post("/api/orders", json={
            "customer": {"name": "Empty Order", "phone": "1234567894"},
            "items": [],
        })
        assert response.status_code == 422  # Pydantic validation

    def test_order_tracking(self):
        """Created order can be tracked."""
        services = client.get("/api/services").json()
        ironing_id = next(s["id"] for s in services if s["name"] == "Steam Ironing")

        create_resp = client.post("/api/orders", json={
            "customer": {"name": "Track Test", "phone": "1234567895"},
            "items": [{"service_id": ironing_id, "quantity": 3}],
        })
        order_number = create_resp.json()["order_number"]

        track_resp = client.get(f"/api/orders/{order_number}/track")
        assert track_resp.status_code == 200
        data = track_resp.json()
        assert data["status"] == "RECEIVED"
        assert float(data["total"]) == 45.00  # 3 × ₹15

    def test_order_bill(self):
        """Created order has a bill/invoice."""
        services = client.get("/api/services").json()
        ironing_id = next(s["id"] for s in services if s["name"] == "Steam Ironing")

        create_resp = client.post("/api/orders", json={
            "customer": {"name": "Bill Test", "phone": "1234567896"},
            "items": [{"service_id": ironing_id, "quantity": 5}],
        })
        order_number = create_resp.json()["order_number"]

        bill_resp = client.get(f"/api/orders/{order_number}/bill")
        assert bill_resp.status_code == 200
        data = bill_resp.json()
        assert data["invoice_number"].startswith("INV-")
        assert float(data["total"]) == 75.00


class TestDynamicPricing:
    """CRITICAL: Old orders must keep old prices when admin changes pricing."""

    def test_price_change_preserves_old_order(self):
        """
        1. Create order at ₹60/kg
        2. Admin changes price to ₹80/kg
        3. Old order's bill still shows ₹60/kg
        4. New order uses ₹80/kg
        """
        services = client.get("/api/services").json()
        washing_id = next(s["id"] for s in services if s["name"] == "Washing")

        # 1. Create order at current price (₹60/kg)
        old_order = client.post("/api/orders", json={
            "customer": {"name": "Old Price", "phone": "5551111111"},
            "items": [{"service_id": washing_id, "quantity": 2}],
        })
        assert old_order.status_code == 201
        old_order_number = old_order.json()["order_number"]
        assert float(old_order.json()["total"]) == 120.00  # 2 × ₹60

        # 2. Admin changes price to ₹80/kg
        token = _get_admin_token()
        price_resp = client.post(
            f"/api/admin/services/{washing_id}/pricing",
            json={"rate": 80.00, "minimum_charge": 50.00},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert price_resp.status_code == 201

        # 3. Old order's bill MUST still show ₹60/kg
        old_bill = client.get(f"/api/orders/{old_order_number}/bill")
        assert old_bill.status_code == 200
        old_bill_data = old_bill.json()
        assert float(old_bill_data["total"]) == 120.00  # ← NOT 160!
        assert float(old_bill_data["items"][0]["unit_price"]) == 60.00  # snapshot preserved

        # 4. New order uses ₹80/kg
        new_order = client.post("/api/orders", json={
            "customer": {"name": "New Price", "phone": "5552222222"},
            "items": [{"service_id": washing_id, "quantity": 2}],
        })
        assert new_order.status_code == 201
        assert float(new_order.json()["total"]) == 160.00  # 2 × ₹80
