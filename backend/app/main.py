from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.database import init_db
from app.routes.auth import router as auth_router

# Initialize FastAPI app
app = FastAPI(
    title=config.PROJECT_NAME,
    description="Payment Gateway Service API",
    version="1.0.0"
)

# Initialize database
init_db()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_HOSTS if config.ALLOWED_HOSTS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)

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
