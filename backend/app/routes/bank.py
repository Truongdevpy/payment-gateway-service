"""
Bank Management Routes
Endpoints for managing multiple bank accounts
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.routes.auth import get_authenticated_user
from app.models.user import User
from app.models.bank import BankAccount
from app.providers.bank_provider import BankService
from app.schemas.bank import (
    BankAccountCreate,
    BankAccountResponse,
    BankAccountListResponse,
    BankLoginRequest,
    BankLoginResponse,
    BankTransactionListResponse,
    BankBalanceResponse,
    BankStatisticsResponse,
    BankListResponse,
)
from app.middleware.subscription_middleware import check_api_access, consume_api_call


router = APIRouter(prefix="/api/banks", tags=["banks"])


@router.get("/supported", response_model=BankListResponse)
async def get_supported_banks():
    """
    Get list of all supported banks and payment gateways
    
    Returns:
        List of supported banks with details
    """
    banks = BankService.get_supported_banks()
    return BankListResponse(
        banks=banks,
        total=len(banks),
        message="Danh sách ngân hàng được hỗ trợ"
    )


@router.post("/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    account_data: BankAccountCreate,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Add new bank account
    
    **Requires active subscription**
    
    Args:
        account_data: Bank account details
        
    Returns:
        Created bank account details
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        # Check if account already exists
        existing = db.query(BankAccount).filter(
            BankAccount.user_id == current_user.id,
            BankAccount.bank_type == account_data.bank_type,
            BankAccount.account_number == account_data.account_number
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tài khoản {account_data.bank_type} {account_data.account_number} đã tồn tại"
            )
        
        # Create account
        new_account = BankService.create_bank_account(
            user_id=current_user.id,
            bank_type=account_data.bank_type,
            account_number=account_data.account_number,
            phone=account_data.phone,
            password=account_data.password,
            account_name=account_data.account_name,
            db=db,
        )
        
        return BankAccountResponse.model_validate(new_account)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi thêm tài khoản ngân hàng: {str(e)}"
        )


@router.get("/accounts", response_model=BankAccountListResponse)
async def list_bank_accounts(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get all bank accounts for current user
    
    **Requires active subscription**
    
    Returns:
        List of user's bank accounts
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        accounts = BankService.get_user_accounts(current_user.id, db)
        
        return BankAccountListResponse(
            total=len(accounts),
            accounts=[BankAccountResponse.model_validate(acc) for acc in accounts],
            message="Danh sách tài khoản ngân hàng"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách tài khoản: {str(e)}"
        )


@router.get("/accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get specific bank account details
    
    **Requires active subscription**
    
    Args:
        account_id: Bank account ID
        
    Returns:
        Bank account details
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        account = BankService.get_account_by_id(account_id, current_user.id, db)
        
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài khoản ngân hàng không tìm thấy"
            )
        
        return BankAccountResponse.model_validate(account)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy chi tiết tài khoản: {str(e)}"
        )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_200_OK)
async def delete_bank_account(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Delete bank account
    
    **Requires active subscription**
    
    Args:
        account_id: Bank account ID
        
    Returns:
        Deletion status
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        success = BankService.delete_account(account_id, current_user.id, db)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài khoản ngân hàng không tìm thấy"
            )
        
        return {
            "status": True,
            "message": "Xóa tài khoản ngân hàng thành công"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xóa tài khoản: {str(e)}"
        )


@router.get("/accounts/{account_id}/transactions", response_model=BankTransactionListResponse)
async def get_bank_transactions(
    account_id: int,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get transactions for bank account
    
    **Requires active subscription**
    
    Args:
        account_id: Bank account ID
        days: Number of days to retrieve (1-365)
        
    Returns:
        List of transactions
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        transactions = BankService.get_transactions(account_id, current_user.id, days, db)
        
        return BankTransactionListResponse(
            total=len(transactions),
            transactions=[
                {
                    "id": t.id,
                    "transaction_id": t.transaction_id,
                    "transaction_date": t.transaction_date,
                    "amount": t.amount,
                    "currency": t.currency,
                    "transaction_type": t.transaction_type,
                    "description": t.description,
                    "counterparty_name": t.counterparty_name,
                    "counterparty_account": t.counterparty_account,
                    "balance_after": t.balance_after,
                }
                for t in transactions
            ],
            date_range={"start": datetime.utcnow().date(), "days": days},
            message=f"Danh sách giao dịch {days} ngày gần nhất"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy giao dịch: {str(e)}"
        )


@router.get("/accounts/{account_id}/statistics", response_model=BankStatisticsResponse)
async def get_bank_statistics(
    account_id: int,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get account statistics
    
    **Requires active subscription**
    
    Args:
        account_id: Bank account ID
        days: Number of days to analyze (1-365)
        
    Returns:
        Statistics summary
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        account = BankService.get_account_by_id(account_id, current_user.id, db)
        
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài khoản ngân hàng không tìm thấy"
            )
        
        stats = BankService.get_account_statistics(account_id, current_user.id, days, db)
        
        return BankStatisticsResponse(
            total_in=stats["total_in"],
            total_out=stats["total_out"],
            transaction_count=stats["transaction_count"],
            average_transaction=stats["average_transaction"],
            daily_average=stats["daily_average"],
            balance=0,  # Would be fetched from live API
            period=f"{days} ngày",
            status=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tính toán thống kê: {str(e)}"
        )


@router.post("/accounts/{account_id}/sync", status_code=status.HTTP_200_OK)
async def sync_bank_transactions(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Manually sync transactions for bank account
    
    **Requires active subscription**
    
    Args:
        account_id: Bank account ID
        
    Returns:
        Sync status
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        
        account = BankService.get_account_by_id(account_id, current_user.id, db)
        
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài khoản ngân hàng không tìm thấy"
            )
        
        # TODO: Implement bank API sync based on bank_type
        # For now, return simulated response
        
        return {
            "status": True,
            "message": "Đang đồng bộ giao dịch",
            "synced_count": 0,
            "account_id": account_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi đồng bộ giao dịch: {str(e)}"
        )
