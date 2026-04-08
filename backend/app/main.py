from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import config

# Initialize database FIRST before importing routes (which import models)
from app.database import init_db
init_db()

from app.database import SessionLocal
from app.routes.auth import router as auth_router
from app.routes.history import router as history_router
from app.routes.subscription import router as subscription_router
from app.routes.balance import router as balance_router
from app.routes.dashboard import router as dashboard_router
from app.routes.bank import router as bank_router
from app.routes.email import router as email_router
from app.routes.coupon import router as coupon_router
from app.routes.transfer import router as transfer_router
from app.routes.invoice import router as invoice_router
from app.routes.payment import router as payment_router
from app.middleware.rate_limit import RateLimitMiddleware
from app.providers.balance_provider import BankAPIService

# Initialize FastAPI app
app = FastAPI(
    title=config.PROJECT_NAME,
    description="Payment Gateway Service API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=config.GZIP_MINIMUM_SIZE)
app.add_middleware(
    RateLimitMiddleware,
    default_limit=config.API_RATE_LIMIT_REQUESTS,
    window_seconds=config.API_RATE_LIMIT_WINDOW_SECONDS,
    auth_limit=config.AUTH_RATE_LIMIT_REQUESTS,
)

# Include routers
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(subscription_router)
app.include_router(balance_router)
app.include_router(dashboard_router)
app.include_router(bank_router)
app.include_router(email_router)
app.include_router(coupon_router)
app.include_router(transfer_router)
app.include_router(invoice_router)
app.include_router(payment_router)

# Initialize default banks and scheduler on startup
@app.on_event("startup")
async def startup_event():
    """Initialize default data and scheduler"""
    db = SessionLocal()
    try:
        BankAPIService.initialize_default_banks(db)
    finally:
        db.close()

    # Start background scheduler for daily billing / monthly reset
    try:
        from app.tasks.scheduler import init_scheduler
        init_scheduler()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Scheduler init skipped: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Graceful shutdown"""
    try:
        from app.tasks.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to Payment Gateway Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "Service is healthy"}

@app.get("/api/health")
def api_health_check():
    """API health check endpoint"""
    return {"status": "OK", "message": "API service is running"}
