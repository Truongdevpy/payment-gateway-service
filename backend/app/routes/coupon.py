from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.providers.coupon_provider import CouponService
from app.schemas.coupon import (
    CouponValidateRequest,
    CouponValidateResponse,
    CouponCreateRequest,
    CouponUpdateRequest,
    CouponResponse,
    CouponListResponse,
)
from app.routes.auth import get_authenticated_user

router = APIRouter(prefix="/api/coupons", tags=["coupons"])


# ── Public endpoints ──────────────────────────────────────────────────

@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    payload: CouponValidateRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Validate a coupon code and get discount amount"""
    try:
        is_valid, discount_amount, message = CouponService.validate_coupon(
            code=payload.code,
            plan_type=payload.plan_type,
            amount=payload.amount,
            db=db,
        )
        return CouponValidateResponse(
            isValid=is_valid,
            discountAmount=discount_amount,
            message=message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi kiểm tra mã giảm giá: {str(e)}",
        )


@router.get("/active", response_model=CouponListResponse)
async def get_active_coupons(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get list of currently active coupons"""
    try:
        coupons = CouponService.list_active_coupons(db)
        return CouponListResponse(
            coupons=[CouponResponse(**c.to_dict()) for c in coupons],
            total=len(coupons),
            message="Danh sách mã giảm giá",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách mã: {str(e)}",
        )


# ── Admin endpoints ──────────────────────────────────────────────────

@router.post("/admin/create", response_model=CouponResponse)
async def create_coupon(
    payload: CouponCreateRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Create a new coupon (admin)"""
    try:
        coupon = CouponService.create_coupon(
            code=payload.code,
            discount_type=payload.discount_type,
            discount_value=payload.discount_value,
            expiry_date=payload.expiry_date,
            db=db,
            max_uses=payload.max_uses,
            applicable_plans=payload.applicable_plans,
            min_amount=payload.min_amount,
            description=payload.description,
        )
        return CouponResponse(**coupon.to_dict())
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tạo mã giảm giá: {str(e)}",
        )


@router.get("/admin/all", response_model=CouponListResponse)
async def get_all_coupons(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get all coupons (admin)"""
    try:
        coupons = CouponService.list_all_coupons(db)
        return CouponListResponse(
            coupons=[CouponResponse(**c.to_dict()) for c in coupons],
            total=len(coupons),
            message="Tất cả mã giảm giá",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách: {str(e)}",
        )


@router.patch("/admin/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    payload: CouponUpdateRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Update a coupon (admin)"""
    try:
        update_data = payload.model_dump(exclude_unset=True)
        coupon = CouponService.update_coupon(coupon_id, db, **update_data)
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mã giảm giá không tồn tại",
            )
        return CouponResponse(**coupon.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi cập nhật mã: {str(e)}",
        )


@router.delete("/admin/{coupon_id}")
async def delete_coupon(
    coupon_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Delete (deactivate) a coupon (admin)"""
    try:
        success = CouponService.delete_coupon(coupon_id, db)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mã giảm giá không tồn tại",
            )
        return {"status": True, "message": "Đã xóa mã giảm giá"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xóa mã: {str(e)}",
        )
