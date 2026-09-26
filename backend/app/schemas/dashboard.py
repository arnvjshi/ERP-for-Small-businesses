"""Dashboard schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    todays_orders: int
    todays_revenue: Decimal
    pending_orders: int
    ready_for_pickup: int
    completed_orders: int
    in_progress_orders: int
    cancelled_orders: int
    total_customers: int
    low_stock_items: int
    active_services: int
    recent_orders: List[dict] = []
    payment_modes: List[dict] = []


class RevenueDataPoint(BaseModel):
    date: str
    revenue: Decimal
    orders: int


class ServicePopularity(BaseModel):
    service_name: str
    order_count: int
    revenue: Decimal


class DashboardAnalytics(BaseModel):
    revenue_over_time: List[RevenueDataPoint]
    service_popularity: List[ServicePopularity]
    payment_modes: List[dict] = []


class WorkerDashboardMetrics(BaseModel):
    todays_orders: int
    pending_work: int
    in_progress: int
    completed_today: int
