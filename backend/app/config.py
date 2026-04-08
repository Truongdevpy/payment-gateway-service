import base64
import hashlib
import os
from dotenv import load_dotenv
from datetime import timedelta
from cryptography.fernet import Fernet

load_dotenv()


def _build_default_fernet_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)

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
    
    # Encryption for sensitive data (like MB Bank passwords)
    # Generate key with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key())"
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY") or _build_default_fernet_key(SECRET_KEY)
    
    # CORS
    ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",") if os.getenv("ALLOWED_HOSTS") else []
    
    # Server
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
    GZIP_MINIMUM_SIZE = int(os.getenv("GZIP_MINIMUM_SIZE", "1024"))
    API_RATE_LIMIT_REQUESTS = int(os.getenv("API_RATE_LIMIT_REQUESTS", "240"))
    API_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("API_RATE_LIMIT_WINDOW_SECONDS", "60"))
    AUTH_RATE_LIMIT_REQUESTS = int(os.getenv("AUTH_RATE_LIMIT_REQUESTS", "30"))
    
    # SMTP / Email Configuration
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@thueapi.com")
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ThueAPI")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "t")
    
    # Payment Gateways
    MOMO_PARTNER_CODE = os.getenv("MOMO_PARTNER_CODE", "")
    MOMO_ACCESS_KEY = os.getenv("MOMO_ACCESS_KEY", "")
    MOMO_SECRET_KEY = os.getenv("MOMO_SECRET_KEY", "")
    MOMO_API_ENDPOINT = os.getenv("MOMO_API_ENDPOINT", "https://test-payment.momo.vn")
    MOMO_PARTNER_NAME = os.getenv("MOMO_PARTNER_NAME", PROJECT_NAME)
    MOMO_STORE_ID = os.getenv("MOMO_STORE_ID", "")
    MOMO_STORE_NAME = os.getenv("MOMO_STORE_NAME", PROJECT_NAME)
    MOMO_REDIRECT_URL = os.getenv("MOMO_REDIRECT_URL", "http://localhost:3000/payments/momo/return")
    MOMO_IPN_URL = os.getenv("MOMO_IPN_URL", "http://localhost:8000/api/payments/momo/ipn")
    MOMO_REQUEST_TYPE = os.getenv("MOMO_REQUEST_TYPE", "captureWallet")
    MOMO_LANG = os.getenv("MOMO_LANG", "vi")
    
    ZALOPAY_APP_ID = os.getenv("ZALOPAY_APP_ID", "")
    ZALOPAY_KEY1 = os.getenv("ZALOPAY_KEY1", "")
    ZALOPAY_KEY2 = os.getenv("ZALOPAY_KEY2", "")
    ZALOPAY_API_ENDPOINT = os.getenv("ZALOPAY_API_ENDPOINT", "https://sb-openapi.zalopay.vn")
    
    VCB_API_URL = os.getenv("VCB_API_URL", "")
    VCB_RSA_PUBLIC_KEY = os.getenv("VCB_RSA_PUBLIC_KEY", "")
    VCB_MERCHANT_ID = os.getenv("VCB_MERCHANT_ID", "")
    
    # Scheduler
    SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "True").lower() in ("true", "1", "t")
    SCHEDULER_TIMEZONE = os.getenv("SCHEDULER_TIMEZONE", "Asia/Ho_Chi_Minh")

    # Real top-up configuration
    TOPUP_PROVIDER = os.getenv("TOPUP_PROVIDER", "mbbank")
    TOPUP_BANK_CODE = os.getenv("TOPUP_BANK_CODE", "MBBANK")
    TOPUP_BANK_NAME = os.getenv("TOPUP_BANK_NAME", "Ngân hàng TMCP Quân đội")
    TOPUP_QR_BANK_ID = os.getenv("TOPUP_QR_BANK_ID", "970422")
    TOPUP_QR_TEMPLATE = os.getenv("TOPUP_QR_TEMPLATE", "print")
    TOPUP_ACCOUNT_NUMBER = os.getenv("TOPUP_ACCOUNT_NUMBER", "0868133346")
    TOPUP_ACCOUNT_NAME = os.getenv("TOPUP_ACCOUNT_NAME", "NGUYEN VAN TRUONG")
    TOPUP_CONTENT_TEMPLATE = os.getenv("TOPUP_CONTENT_TEMPLATE", "THUEAPI{user_id}")
    ADMIN_EMAILS = [item.strip().lower() for item in os.getenv("ADMIN_EMAILS", "").split(",") if item.strip()]

# Create config instance
config = Config()
