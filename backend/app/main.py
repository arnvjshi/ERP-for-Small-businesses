"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.routes import auth, public, admin, worker

limiter = Limiter(key_func=get_remote_address)

# Conditionally disable interactive docs in production
docs_kwargs = {}
if settings.is_production:
    docs_kwargs = {
        "docs_url": None,
        "redoc_url": None,
    }

app = FastAPI(
    title="Laundry Bros API",
    description="Inventory Management, Billing & Order ERP for Laundry Businesses",
    version="1.0.0",
    root_path=settings.API_PREFIX,
    **docs_kwargs,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(worker.router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Laundry Bros API",
        "environment": settings.ENVIRONMENT,
    }

