from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class BalanceResponse(BaseModel):
    """Response model for user balance"""
    id: int
    balance: float = Field(..., description="Current balance in VND")
    total_deposited: float = Field(..., description="Total deposited in VND")
    total_spent: float = Field(..., description="Total spent in VND")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepositRequest(BaseModel):
    """Request model for depositing balance"""
    amount: float = Field(..., gt=0, description="Amount to deposit in VND")
    payment_method: str = Field(default="demo", description="Payment method (demo, stripe, vnpay)")


class DepositResponse(BaseModel):
    """Response model for deposit operation"""
    status: bool
    message: str
    balance: BalanceResponse
    transaction_id: Optional[str] = None


class BalanceTransactionResponse(BaseModel):
    """Response model for balance transaction"""
    id: int
    transaction_type: str
    amount: float
    description: Optional[str]
    status: str
    reference_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BalanceHistoryResponse(BaseModel):
    """Response model for balance transaction history"""
    total_count: int
    transactions: List[BalanceTransactionResponse]
    page: int
    page_size: int
    total_pages: int


class BankAPIResponse(BaseModel):
    """Response model for bank API"""
    id: int
    bank_code: str
    bank_name: str
    bank_name_vi: str
    logo_url: Optional[str]
    api_name: str
    api_version: Optional[str]
    is_active: str
    base_price_per_call: float
    monthly_call_limit: Optional[int]
    supported_operations: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BankAPIListResponse(BaseModel):
    """Response model for list of bank APIs"""
    total: int
    banks: List[BankAPIResponse]


class BankTransactionResponse(BaseModel):
    """Response model for bank transaction"""
    id: int
    user_id: int
    bank_api_id: int
    transaction_type: str
    amount: float
    status: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class RevenueStatsResponse(BaseModel):
    """Response model for revenue statistics"""
    total_revenue: float
    total_expense: float
    net_revenue: float
    total_transactions: int
    total_income_transactions: int
    total_expense_transactions: int
    today_revenue: float
    today_expense: float
    today_transactions: int
    today_income_transactions: int
    today_expense_transactions: int
    weekly_revenue: float
    monthly_revenue: float
    average_transaction_value: float
    
    # By bank
    revenue_by_bank: dict  # {bank_code: amount}
    transactions_by_bank: dict  # {bank_code: count}
    
    # Time series
    daily_revenue: List[dict]  # [{date, amount}]
    hourly_revenue: List[dict]  # [{hour, amount}]


class RevenueTrendResponse(BaseModel):
    """Response model for revenue trend"""
    date: str
    in_amount: float  # Incoming (deposits)
    out_amount: float  # Outgoing (purchases)
    net_amount: float  # Net (in - out)
    transaction_count: int


class RevenueTransactionItemResponse(BaseModel):
    """Response model for a real bank-backed revenue transaction row."""
    id: int
    account_id: int
    account_name: Optional[str]
    external_id: Optional[str]
    provider: str
    provider_label: str
    transaction_id: str
    transaction_type: Optional[str]
    direction: str
    amount: float
    currency: str
    description: Optional[str]
    status: str
    posted_at: datetime
    created_at: datetime


class RevenueTransactionsResponse(BaseModel):
    """Response model for the revenue transactions table."""
    total_count: int
    page: int = 1
    page_size: int = 0
    total_pages: int = 0
    transactions: List[RevenueTransactionItemResponse]


class TopupInfoResponse(BaseModel):
    provider: str
    bank_code: str
    bank_name: str
    qr_bank_id: str
    qr_template: str
    account_number: str
    account_name: str
    history_account_id: Optional[int] = None
    transfer_content: str
    transfer_content_template: str
    qr_image_url: str
    is_active: bool


class TopupSyncResponse(BaseModel):
    status: bool
    message: str
    synced_count: int
    matched_transaction_ids: List[str]
    transfer_content: str
    last_checked_at: datetime


class TopupSourceAccountResponse(BaseModel):
    id: int
    provider: str
    account_name: Optional[str]
    external_id: Optional[str]
    login_identifier: Optional[str]
    status: str
    user_id: int


class AdminTopupSettingsResponse(BaseModel):
    provider: str
    bank_code: str
    bank_name: str
    qr_bank_id: str
    qr_template: str
    account_number: str
    account_name: str
    history_account_id: Optional[int] = None
    transfer_content_template: str
    is_active: bool
    available_history_accounts: List[TopupSourceAccountResponse]


class AdminTopupSettingsUpdateRequest(BaseModel):
    provider: str = Field(..., min_length=1)
    bank_code: str = Field(..., min_length=1)
    bank_name: str = Field(..., min_length=1)
    qr_bank_id: str = Field(..., min_length=1)
    qr_template: str = Field(..., min_length=1)
    account_number: str = Field(..., min_length=1)
    account_name: str = Field(..., min_length=1)
    history_account_id: Optional[int] = None
    transfer_content_template: str = Field(..., min_length=1)
    is_active: bool = True
