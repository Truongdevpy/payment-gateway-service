from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class SubscriptionPlanEnum(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionPlanInfo(BaseModel):
    """Subscription plan information"""
    planType: SubscriptionPlanEnum
    planName: str
    price: float
    currency: str = "VND"
    durationDays: int
    apiCallsLimit: Optional[int] = None
    features: List[str]
    description: str


class SubscriptionCreate(BaseModel):
    """Create subscription request"""
    plan_type: SubscriptionPlanEnum = Field(..., description="Plan type to purchase")
    duration_days: int = Field(..., description="Duration in days")


class SubscriptionRenew(BaseModel):
    """Renew subscription request"""
    plan_type: SubscriptionPlanEnum = Field(..., description="Plan type to renew")
    duration_days: int = Field(..., description="Duration in days")


class SubscriptionResponse(BaseModel):
    """Subscription response"""
    id: int
    userId: int
    planType: str
    planName: str
    price: float
    currency: str
    durationDays: int
    apiCallsLimit: Optional[int]
    apiCallsUsed: int
    purchasedAt: Optional[str]
    startsAt: Optional[str]
    expiresAt: Optional[str]
    renewedAt: Optional[str]
    isActive: bool
    isAutoRenew: bool
    isExpired: bool
    daysRemaining: int
    canUseApi: bool
    hasApiCallsRemaining: bool
    paymentMethod: Optional[str]
    transactionId: Optional[str]
    paymentStatus: str
    features: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]
    
    class Config:
        from_attributes = True


class SubscriptionListResponse(BaseModel):
    """List subscriptions response"""
    message: str
    subscriptions: List[SubscriptionResponse]
    currentSubscription: Optional[SubscriptionResponse]
    total: int


class PaymentRequest(BaseModel):
    """Payment request"""
    plan_type: SubscriptionPlanEnum
    duration_days: int
    payment_method: str = Field(..., description="card, bank_transfer, wallet, etc.")


class PaymentResponse(BaseModel):
    """Payment response"""
    status: bool
    message: str
    subscription: Optional[SubscriptionResponse]
    paymentUrl: Optional[str] = None  # For redirect payment methods
    transaction_id: Optional[str] = None


class UpgradeResponse(BaseModel):
    """Upgrade subscription response"""
    status: bool
    message: str
    oldSubscription: Optional[SubscriptionResponse]
    newSubscription: SubscriptionResponse


class ApiUsageResponse(BaseModel):
    """API usage statistics"""
    status: bool
    subscription: SubscriptionResponse
    usage: dict
    message: str


class AvailablePlansResponse(BaseModel):
    """Available subscription plans"""
    plans: List[SubscriptionPlanInfo]
    currentSubscription: Optional[SubscriptionResponse]
