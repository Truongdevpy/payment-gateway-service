import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    # Project Info
    PROJECT_NAME = os.getenv("PROJECT_NAME", "Payment Gateway Service")
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # Database
    DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        "postgresql://payment_user:payment_password@localhost:5432/payment_db"
    )
    
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
    JWT_SECRET = os.getenv("JWT_SECRET", "jwt_secret_key")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    JWT_REFRESH_EXPIRATION_DAYS = int(os.getenv("JWT_REFRESH_EXPIRATION_DAYS", "30"))
    
    # CORS
    ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",") if os.getenv("ALLOWED_HOSTS") else []
    
    # Server
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

# Create config instance
config = Config()
