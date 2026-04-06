#!/usr/bin/env python
"""
Runner script for the FastAPI application.
Run this from the backend directory with: python run.py
"""
import uvicorn
import sys
import os

if __name__ == "__main__":
    # Run the FastAPI app using uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
