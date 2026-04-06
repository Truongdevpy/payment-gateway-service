import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PROJECT_NAME = os.getenv("PROJECT_NAME", "Web Application")
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")
    SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
    ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",") if os.getenv("ALLOWED_HOSTS") else []
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")