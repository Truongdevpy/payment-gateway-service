from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Index, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timedelta
import enum


class SubscriptionPlan(str, enum.Enum):
    """Subscription plan types"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Subscription(Base):
    """Subscription/API Package model"""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Plan Information
    plan_type = Column(String(50), default=SubscriptionPlan.FREE, nullable=False)
    plan_name = Column(String(255), nullable=False)  # e.g., "MB Bank API - Monthly"
    
    # Pricing
    price = Column(Float, default=0.0)  # Price in VND
    currency = Column(String(3), default="VND")
    
    # Duration
    duration_days = Column(Integer, nullable=False)  # Duration in days (30, 90, 365, etc.)
    api_calls_limit = Column(Integer, nullable=True)  # Max API calls, None = unlimited
    api_calls_used = Column(Integer, default=0)  # Current API calls count
    
    # Dates
    purchased_at = Column(DateTime, server_default=func.now())
    starts_at = Column(DateTime, nullable=False, default=func.now)
    expires_at = Column(DateTime, nullable=False)  # Expiration date
    renewed_at = Column(DateTime, nullable=True)  # Last renewal date
    
    # Status
    is_active = Column(Boolean, default=True)
    is_auto_renew = Column(Boolean, default=False)  # Auto-renew when expired
    
    # Payment Information
    payment_method = Column(String(50), nullable=True)  # card, bank_transfer, wallet, etc.
    transaction_id = Column(String(255), nullable=True, unique=True)  # Payment gateway transaction ID
    payment_status = Column(String(50), default="pending")  # pending, completed, failed, refunded
    
    # Features
    features = Column(Text, nullable=True)  # JSON stored features (comma-separated or JSON)
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="subscriptions")
    
    # Indexes
    __table_args__ = (
        Index('idx_subscription_user_id', 'user_id'),
        Index('idx_subscription_expires_at', 'expires_at'),
        Index('idx_subscription_is_active', 'is_active'),
    )
    
    def is_expired(self) -> bool:
        """Check if subscription is expired"""
        return datetime.utcnow() > self.expires_at
    
    def days_remaining(self) -> int:
        """Get remaining days"""
        if self.is_expired():
            return 0
        remaining = (self.expires_at - datetime.utcnow()).days
        return max(0, remaining)
    
    def can_use_api(self) -> bool:
        """Check if API can be used (not expired and active)"""
        return self.is_active and not self.is_expired()
    
    def has_api_calls_remaining(self) -> bool:
        """Check if API calls are remaining"""
        if self.api_calls_limit is None:
            return True  # Unlimited
        return self.api_calls_used < self.api_calls_limit
    
    def use_api_call(self) -> bool:
        """Use one API call, returns True if successful"""
        if not self.can_use_api() or not self.has_api_calls_remaining():
            return False
        self.api_calls_used += 1
        return True
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'planType': self.plan_type,
            'planName': self.plan_name,
            'price': self.price,
            'currency': self.currency,
            'durationDays': self.duration_days,
            'apiCallsLimit': self.api_calls_limit,
            'apiCallsUsed': self.api_calls_used,
            'purchasedAt': self.purchased_at.isoformat() if self.purchased_at else None,
            'startsAt': self.starts_at.isoformat() if self.starts_at else None,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'renewedAt': self.renewed_at.isoformat() if self.renewed_at else None,
            'isActive': self.is_active,
            'isAutoRenew': self.is_auto_renew,
            'isExpired': self.is_expired(),
            'daysRemaining': self.days_remaining(),
            'canUseApi': self.can_use_api(),
            'hasApiCallsRemaining': self.has_api_calls_remaining(),
            'paymentMethod': self.payment_method,
            'transactionId': self.transaction_id,
            'paymentStatus': self.payment_status,
            'features': self.features,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        return f'<Subscription {self.plan_name}>'
