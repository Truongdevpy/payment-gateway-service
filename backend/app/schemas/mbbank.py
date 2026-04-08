from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class MBBankLoginRequest(BaseModel):
    """Request model for MB Bank login"""
    phone: str = Field(..., min_length=10, max_length=20, description="Phone number / MB Bank username")
    password: str = Field(..., min_length=6, description="MB Bank password")
    account_number: str = Field(..., min_length=8, max_length=20, description="MB Bank account number (STK)")


class MBBankAccountResponse(BaseModel):
    """Response model for MB Bank account"""
    id: int
    phone: str
    accountNumber: str
    accountName: str
    sessionId: Optional[str] = None
    deviceId: Optional[str] = None
    lastLoginAt: Optional[str] = None
    createdAt: str
    updatedAt: str
    
    class Config:
        from_attributes = True


class MBBankLoginResponse(BaseModel):
    """Response model for MB Bank login"""
    message: str
    status: bool
    account: Optional[MBBankAccountResponse] = None
    token: Optional[str] = None


class MBBankAccountListResponse(BaseModel):
    """Response model for list of MB Bank accounts"""
    message: str
    accounts: list[MBBankAccountResponse]
    total: int


class MBBankAccountDeleteResponse(BaseModel):
    """Response model for deleting MB Bank account"""
    message: str
    status: bool
