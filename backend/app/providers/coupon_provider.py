import logging
from typing import Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.coupon import Coupon

logger = logging.getLogger(__name__)


class CouponService:
    """Service for managing discount coupons"""

    @staticmethod
    def validate_coupon(code: str, plan_type: str, amount: float, db: Session) -> Tuple[bool, float, str]:
        """
        Validate a coupon code and calculate discount.

        Returns:
            Tuple of (is_valid, discount_amount, message)
        """
        coupon = db.query(Coupon).filter(Coupon.code == code.upper()).first()

        if not coupon:
            return False, 0, "Mã giảm giá không tồn tại"

        if not coupon.is_valid():
            if not coupon.is_active:
                return False, 0, "Mã giảm giá đã bị vô hiệu hóa"
            if datetime.utcnow() > coupon.expiry_date:
                return False, 0, "Mã giảm giá đã hết hạn"
            if coupon.max_uses != -1 and coupon.used_count >= coupon.max_uses:
                return False, 0, "Mã giảm giá đã hết lượt sử dụng"

        if not coupon.is_applicable_to_plan(plan_type):
            return False, 0, f"Mã giảm giá không áp dụng cho gói {plan_type}"

        if amount < coupon.min_amount:
            return False, 0, f"Đơn hàng tối thiểu {coupon.min_amount:,.0f} VND để sử dụng mã này"

        discount_amount = coupon.get_discount_amount(amount)
        discount_desc = (
            f"{coupon.discount_value}%" if coupon.discount_type == "percent"
            else f"{coupon.discount_value:,.0f} VND"
        )
        return True, discount_amount, f"Giảm {discount_desc} (tiết kiệm {discount_amount:,.0f} VND)"

    @staticmethod
    def apply_coupon(code: str, db: Session) -> bool:
        """Increment the used count for a coupon after purchase"""
        coupon = db.query(Coupon).filter(Coupon.code == code.upper()).first()
        if not coupon:
            return False
        coupon.used_count += 1
        db.commit()
        return True

    @staticmethod
    def create_coupon(
        code: str,
        discount_type: str,
        discount_value: float,
        expiry_date: datetime,
        db: Session,
        max_uses: int = -1,
        applicable_plans: Optional[str] = None,
        min_amount: float = 0,
        description: Optional[str] = None,
    ) -> Coupon:
        """Create a new coupon"""
        coupon = Coupon(
            code=code.upper(),
            discount_type=discount_type,
            discount_value=discount_value,
            expiry_date=expiry_date,
            max_uses=max_uses,
            applicable_plans=applicable_plans,
            min_amount=min_amount,
            description=description,
            is_active=True,
        )
        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        logger.info(f"Coupon created: {coupon.code}")
        return coupon

    @staticmethod
    def list_active_coupons(db: Session) -> list:
        """List all currently valid coupons"""
        now = datetime.utcnow()
        coupons = db.query(Coupon).filter(
            Coupon.is_active == True,
            Coupon.expiry_date > now,
        ).order_by(Coupon.created_at.desc()).all()
        return [c for c in coupons if c.is_valid()]

    @staticmethod
    def list_all_coupons(db: Session) -> list:
        """List all coupons (admin)"""
        return db.query(Coupon).order_by(Coupon.created_at.desc()).all()

    @staticmethod
    def get_coupon_by_id(coupon_id: int, db: Session) -> Optional[Coupon]:
        return db.query(Coupon).filter(Coupon.id == coupon_id).first()

    @staticmethod
    def update_coupon(coupon_id: int, db: Session, **kwargs) -> Optional[Coupon]:
        """Update coupon fields"""
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if not coupon:
            return None
        for key, value in kwargs.items():
            if hasattr(coupon, key):
                setattr(coupon, key, value)
        db.commit()
        db.refresh(coupon)
        return coupon

    @staticmethod
    def delete_coupon(coupon_id: int, db: Session) -> bool:
        """Soft-delete a coupon (deactivate)"""
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if not coupon:
            return False
        coupon.is_active = False
        db.commit()
        return True
