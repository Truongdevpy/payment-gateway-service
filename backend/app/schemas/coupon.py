from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CouponValidateRequest(BaseModel):
    """Request to validate a coupon"""
    code: str = Field(..., min_length=1, max_length=50)
    plan_type: str
    amount: float


class CouponValidateResponse(BaseModel):
    """Response for coupon validation"""
    isValid: bool
    discountAmount: float = 0
    message: str


class CouponCreateRequest(BaseModel):
    """Request to create a coupon (admin)"""
    code: str = Field(..., min_length=2, max_length=50)
    discount_type: str = Field(..., pattern="^(percent|fixed)$")
    discount_value: float = Field(..., gt=0)
    expiry_date: datetime
    max_uses: int = -1
    applicable_plans: Optional[str] = None
    min_amount: float = 0
    description: Optional[str] = None


class CouponUpdateRequest(BaseModel):
    """Request to update a coupon (admin)"""
    discount_value: Optional[float] = None
    expiry_date: Optional[datetime] = None
    max_uses: Optional[int] = None
    applicable_plans: Optional[str] = None
    min_amount: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CouponResponse(BaseModel):
    """Coupon response"""
    id: int
    code: str
    discountType: str
    discountValue: float
    maxUses: int
    usedCount: int
    expiryDate: Optional[str]
    applicablePlans: Optional[str]
    minAmount: float
    description: Optional[str]
    isActive: bool
    isValid: bool
    createdAt: Optional[str]
    updatedAt: Optional[str]

    class Config:
        from_attributes = True


class CouponListResponse(BaseModel):
    """List of coupons"""
    coupons: List[CouponResponse]
    total: int
    message: str = "OK"
