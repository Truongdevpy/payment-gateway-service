#!/usr/bin/env python
"""
Runner script for the FastAPI application.
Run this from the backend directory with: python run.py
"""
import uvicorn
import sys
import os
from app.config import config

if __name__ == "__main__":
    reload_enabled = os.getenv("UVICORN_RELOAD", "false").lower() in ("1", "true", "yes", "on")
    # Run the FastAPI app using uvicorn
    uvicorn.run(
        "app.main:app",
        host=config.SERVER_HOST,
        port=config.SERVER_PORT,
        reload=reload_enabled
    )

