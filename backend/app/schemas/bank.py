"""
Bank Account Schemas - Pydantic models for API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BankTypeEnum(str, Enum):
    """Supported bank types"""
    MBBANK = "mbbank"
    VIETCOMBANK = "vietcombank"
    TPBANK = "tpbank"
    ACB = "acb"
    SEABANK = "seabank"


class BankTransactionResponse(BaseModel):
    """Bank transaction details"""
    id: int
    transaction_id: Optional[str]
    transaction_date: Optional[datetime]
    amount: float
    currency: str = "VND"
    transaction_type: str  # IN, OUT, TRANSFER
    description: Optional[str]
    counterparty_name: Optional[str]
    counterparty_account: Optional[str]
    balance_after: Optional[float]
    
    class Config:
        from_attributes = True


class BankAccountBase(BaseModel):
    """Base bank account schema"""
    bank_type: BankTypeEnum
    account_number: str
    phone: Optional[str] = None
    account_name: Optional[str] = None
    daily_limit: int = 100
    monthly_limit: int = 3000


class BankAccountCreate(BankAccountBase):
    """Create bank account request"""
    password: str  # Will be encrypted on backend


class BankAccountUpdate(BaseModel):
    """Update bank account request"""
    is_active: Optional[bool] = None
    daily_limit: Optional[int] = None
    monthly_limit: Optional[int] = None


class BankAccountResponse(BaseModel):
    """Bank account response"""
    id: int
    user_id: int
    bank_type: str
    account_number: str
    account_name: Optional[str]
    phone: Optional[str]
    is_active: bool
    last_login_at: Optional[datetime]
    last_used_at: Optional[datetime]
    daily_limit: int
    monthly_limit: int
    used_today: int
    used_this_month: int
    can_use_api: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BankAccountListResponse(BaseModel):
    """List of bank accounts"""
    total: int
    accounts: List[BankAccountResponse]
    status: bool = True
    message: str = "Danh sách tài khoản ngân hàng"


class BankLoginRequest(BaseModel):
    """Login to bank request"""
    bank_type: BankTypeEnum
    phone: str
    password: str
    account_number: str


class BankLoginResponse(BaseModel):
    """Login to bank response"""
    status: bool
    message: str
    account: Optional[BankAccountResponse]
    access_token: Optional[str]


class BankTransactionListResponse(BaseModel):
    """List of transactions"""
    total: int
    transactions: List[BankTransactionResponse]
    date_range: Optional[dict]
    status: bool = True
    message: str = "Danh sách giao dịch"


class BankBalanceResponse(BaseModel):
    """Bank account balance"""
    account_id: int
    bank_type: str
    account_number: str
    balance: float
    currency: str = "VND"
    last_updated: datetime
    status: bool = True


class BankStatisticsResponse(BaseModel):
    """Bank statistics"""
    total_in: float
    total_out: float
    transaction_count: int
    average_transaction: float
    daily_average: float
    balance: float
    period: str
    status: bool = True


class BankSyncRequest(BaseModel):
    """Sync bank transactions request"""
    days: int = 30  # Last N days to sync
    force_refresh: bool = False


class BankListResponse(BaseModel):
    """Supported banks list"""
    banks: List[dict]
    total: int
    status: bool = True
    message: str = "Danh sách ngân hàng được hỗ trợ"
