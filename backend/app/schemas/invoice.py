from pydantic import BaseModel
from typing import Optional, List


class InvoiceResponse(BaseModel):
    """Invoice information"""
    id: int
    userId: int
    invoiceNumber: str
    subscriptionId: Optional[int]
    amount: float
    discountAmount: float
    taxAmount: float
    totalAmount: float
    currency: str
    status: str
    issueDate: Optional[str]
    dueDate: Optional[str]
    paymentDate: Optional[str]
    description: Optional[str]
    notes: Optional[str]
    couponCode: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """List of invoices"""
    invoices: List[InvoiceResponse]
    total: int
    message: str = "OK"


class InvoiceCreateRequest(BaseModel):
    """Manual invoice creation (admin)"""
    user_id: int
    amount: float
    description: Optional[str] = None
    subscription_id: Optional[int] = None
    discount_amount: float = 0
    tax_amount: float = 0
    coupon_code: Optional[str] = None


class BillingReportResponse(BaseModel):
    """Billing report"""
    date: str
    totalActiveSubscriptions: int
    estimatedDailyRevenue: float
    estimatedMonthlyRevenue: float
    planSummary: dict
