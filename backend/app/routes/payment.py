from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.providers.payment_provider import MomoPaymentService
from app.routes.auth import get_authenticated_user
from app.schemas.payment import (
    MomoCreatePaymentRequest,
    MomoCreatePaymentResponse,
    MomoIPNPayload,
    MomoQueryPaymentResponse,
    PaymentTransactionListResponse,
    PaymentTransactionResponse,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/momo/create", response_model=MomoCreatePaymentResponse)
async def create_momo_payment(
    payload: MomoCreatePaymentRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    try:
        result = MomoPaymentService.create_payment(
            user_id=current_user.id,
            amount=payload.amount,
            order_info=payload.orderInfo,
            db=db,
            order_id=payload.orderId,
            redirect_url=payload.redirectUrl,
            ipn_url=payload.ipnUrl,
            extra_data=payload.extraData,
            request_type=payload.requestType,
            auto_capture=payload.autoCapture,
            lang=payload.lang,
            user_info=payload.userInfo.model_dump(exclude_none=True) if payload.userInfo else None,
            delivery_info=payload.deliveryInfo.model_dump(exclude_none=True) if payload.deliveryInfo else None,
            items=[item.model_dump(exclude_none=True) for item in payload.items],
        )
        return MomoCreatePaymentResponse(**result)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"MoMo create payment failed: {str(exc)}",
        ) from exc


@router.post("/momo/{transaction_id}/query", response_model=MomoQueryPaymentResponse)
async def query_momo_payment(
    transaction_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    try:
        result = MomoPaymentService.query_payment(
            transaction_id=transaction_id,
            user_id=current_user.id,
            db=db,
        )
        return MomoQueryPaymentResponse(**result)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"MoMo query failed: {str(exc)}",
        ) from exc


@router.post("/momo/ipn", status_code=status.HTTP_204_NO_CONTENT)
async def momo_ipn(
    payload: MomoIPNPayload = Body(...),
    db: Session = Depends(get_db),
):
    try:
        MomoPaymentService.handle_ipn(payload.model_dump(), db)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MoMo IPN handling failed: {str(exc)}",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/momo/history", response_model=PaymentTransactionListResponse)
async def get_momo_payment_history(
    limit: int = 20,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    try:
        items = MomoPaymentService.get_user_transactions(
            user_id=current_user.id,
            db=db,
            limit=max(1, min(limit, 100)),
        )
        return PaymentTransactionListResponse(
            transactions=[PaymentTransactionResponse(**item.to_dict()) for item in items],
            total=len(items),
            message="Lịch sử giao dịch MoMo",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cannot load MoMo payments: {str(exc)}",
        ) from exc
