# Laundry Bros — ERP for Small Businesses

A production-quality inventory management, order management, and billing ERP, initially optimized for a laundry business.

## Features

- **Public Landing Page:** Professional landing page for new customers.
- **Customer Order Creation:** Customers can build their orders online and see estimated bills instantly.
- **Customer Order Tracking:** Customers can track their order status without needing an account.
- **Dynamic Billing Engine:** Authoritative backend calculation with snapshot pricing (old invoices don't change when prices do).
- **Admin Dashboard:** Comprehensive metrics, order processing, and dynamic pricing management.
- **Worker Dashboard:** Operational view focused on moving orders through their lifecycle (Received → Confirmed → In Progress → Ready → Completed).

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide React
- **Backend:** FastAPI, Python, PostgreSQL, SQLAlchemy, Alembic, Pydantic
- **Auth:** JWT-based Role-Based Access Control (RBAC)

## Docker Setup

The easiest way to run the complete stack is using Docker Compose.

```bash
# 1. Copy the environment variables template
cp .env.example .env

# 2. Start the stack (Backend, Frontend, Postgres)
docker compose up --build
```

- The API will be available at `http://localhost:8000`
- The Frontend will be available at `http://localhost:3000`

### Development Credentials (seeded automatically)

- **Admin:** `admin` / `admin123`
- **Worker:** `worker1` / `worker123`

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
# Activate venv
pip install -r requirements.txt

# Create .env file based on .env.example

# Run migrations
alembic upgrade head

# Seed database
python -m app.seed

# Run dev server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
