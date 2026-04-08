from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base


class Coupon(Base):
    """Model for discount coupons"""
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)  # 'percent' or 'fixed'
    discount_value = Column(Float, nullable=False)  # percentage or fixed VND amount
    max_uses = Column(Integer, default=-1)  # -1 = unlimited
    used_count = Column(Integer, default=0)
    expiry_date = Column(DateTime, nullable=False)
    applicable_plans = Column(Text, nullable=True)  # comma-separated plan types, empty = all
    min_amount = Column(Float, default=0)  # minimum order amount
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def is_valid(self) -> bool:
        """Check if coupon is still valid"""
        now = datetime.utcnow()
        if not self.is_active:
            return False
        if now > self.expiry_date:
            return False
        if self.max_uses != -1 and self.used_count >= self.max_uses:
            return False
        return True

    def is_applicable_to_plan(self, plan_type: str) -> bool:
        """Check if coupon applies to the given plan"""
        if not self.applicable_plans:
            return True  # applies to all plans
        plans = [p.strip() for p in self.applicable_plans.split(",")]
        return plan_type in plans

    def get_discount_amount(self, original_price: float) -> float:
        """Calculate discount amount"""
        if self.discount_type == "percent":
            return round((original_price * self.discount_value) / 100, 2)
        return min(self.discount_value, original_price)  # fixed, capped at original price

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "discountType": self.discount_type,
            "discountValue": self.discount_value,
            "maxUses": self.max_uses,
            "usedCount": self.used_count,
            "expiryDate": self.expiry_date.isoformat() if self.expiry_date else None,
            "applicablePlans": self.applicable_plans,
            "minAmount": self.min_amount,
            "description": self.description,
            "isActive": self.is_active,
            "isValid": self.is_valid(),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Coupon {self.code}>'
