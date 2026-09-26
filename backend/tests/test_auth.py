"""Tests for authentication and authorization."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
import app.models  # noqa
from app.main import app


# Use in-memory SQLite for tests
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
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create test users
    admin = User(
        username="testadmin", email="admin@test.com", full_name="Test Admin",
        hashed_password=hash_password("admin123"), role=UserRole.ADMIN,
    )
    worker = User(
        username="testworker", email="worker@test.com", full_name="Test Worker",
        hashed_password=hash_password("worker123"), role=UserRole.WORKER,
    )
    db.add_all([admin, worker])
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


class TestLogin:
    def test_login_success(self):
        response = client.post("/api/auth/login", json={
            "username": "testadmin", "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["role"] == "ADMIN"

    def test_login_invalid_password(self):
        response = client.post("/api/auth/login", json={
            "username": "testadmin", "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_invalid_username(self):
        response = client.post("/api/auth/login", json={
            "username": "nonexistent", "password": "password"
        })
        assert response.status_code == 401

    def test_worker_login(self):
        response = client.post("/api/auth/login", json={
            "username": "testworker", "password": "worker123"
        })
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "WORKER"


class TestAuthorization:
    def _get_admin_token(self):
        resp = client.post("/api/auth/login", json={"username": "testadmin", "password": "admin123"})
        return resp.json()["access_token"]

    def _get_worker_token(self):
        resp = client.post("/api/auth/login", json={"username": "testworker", "password": "worker123"})
        return resp.json()["access_token"]

    def test_admin_can_access_admin_routes(self):
        token = self._get_admin_token()
        response = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    def test_worker_cannot_access_admin_routes(self):
        token = self._get_worker_token()
        response = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403

    def test_worker_can_access_worker_routes(self):
        token = self._get_worker_token()
        response = client.get("/api/worker/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    def test_no_token_rejected(self):
        response = client.get("/api/admin/dashboard")
        assert response.status_code in (401, 403)

    def test_invalid_token_rejected(self):
        response = client.get("/api/admin/dashboard", headers={"Authorization": "Bearer invalidtoken"})
        assert response.status_code in (401, 403)

    def test_get_me(self):
        token = self._get_admin_token()
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["username"] == "testadmin"
