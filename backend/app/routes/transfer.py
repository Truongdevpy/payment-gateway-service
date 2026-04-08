from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.providers.transfer_provider import TransferService
from app.schemas.transfer import (
    TransferMomoRequest,
    TransferZaloPayRequest,
    TransferVCBRequest,
    OTPConfirmRequest,
    TransferResponse,
    TransactionResponse,
    TransactionHistoryResponse,
)
from app.routes.auth import get_authenticated_user

router = APIRouter(prefix="/api/transfer", tags=["transfer"])


@router.post("/momo", response_model=TransferResponse)
async def transfer_momo(
    payload: TransferMomoRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Initiate a Momo transfer"""
    try:
        result = TransferService.send_money_momo(
            user_id=current_user.id,
            phone=payload.phone,
            amount=payload.amount,
            message=payload.message,
            db=db,
        )
        return TransferResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi chuyển tiền Momo: {str(e)}",
        )


@router.post("/zalopay", response_model=TransferResponse)
async def transfer_zalopay(
    payload: TransferZaloPayRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Initiate a ZaloPay transfer"""
    try:
        result = TransferService.send_money_zalopay(
            user_id=current_user.id,
            phone=payload.phone,
            amount=payload.amount,
            message=payload.message,
            db=db,
        )
        return TransferResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi chuyển tiền ZaloPay: {str(e)}",
        )


@router.post("/vcb", response_model=TransferResponse)
async def transfer_vcb(
    payload: TransferVCBRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Initiate a VCB transfer (step 1: request OTP)"""
    try:
        result = TransferService.send_money_vcb(
            user_id=current_user.id,
            account_number=payload.account_number,
            amount=payload.amount,
            message=payload.message,
            db=db,
        )
        return TransferResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi chuyển khoản VCB: {str(e)}",
        )


@router.post("/{transaction_id}/confirm", response_model=TransferResponse)
async def confirm_transfer_otp(
    transaction_id: int,
    payload: OTPConfirmRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Confirm a VCB transfer with OTP (step 2)"""
    try:
        result = TransferService.verify_otp_vcb(
            transaction_id=transaction_id,
            otp=payload.otp,
            db=db,
        )
        return TransferResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xác thực OTP: {str(e)}",
        )


@router.get("/{transaction_id}")
async def get_transfer_status(
    transaction_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Check the status of a transfer"""
    try:
        result = TransferService.get_transaction_status(transaction_id, db)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Giao dịch không tìm thấy",
            )
        return {"status": True, "transaction": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi kiểm tra giao dịch: {str(e)}",
        )


@router.get("/history/all", response_model=TransactionHistoryResponse)
async def get_transfer_history(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get transfer history for current user"""
    try:
        transactions = TransferService.get_user_transfer_history(current_user.id, db)
        return TransactionHistoryResponse(
            transactions=[TransactionResponse(**t) for t in transactions],
            total=len(transactions),
            message="Lịch sử giao dịch",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy lịch sử: {str(e)}",
        )
