#!/bin/bash
set -e

echo "Ensuring database tables exist..."
python -c "from app.core.database import engine, Base; import app.models; Base.metadata.create_all(bind=engine)"

echo "Stamping alembic migration head..."
alembic stamp head || true

echo "Seeding database..."
python -m app.seed

echo "Starting server..."
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running in PRODUCTION mode"
    exec gunicorn app.main:app \
        --worker-class uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:${BACKEND_PORT:-8000} \
        --workers ${GUNICORN_WORKERS:-4} \
        --timeout ${GUNICORN_TIMEOUT:-120} \
        --access-logfile - \
        --error-logfile -
else
    echo "Running in DEVELOPMENT mode"
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port ${BACKEND_PORT:-8000} \
        --reload
fi
