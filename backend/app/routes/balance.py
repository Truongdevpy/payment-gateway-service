from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import get_authenticated_user, require_admin_user
from app.models.user import User
from app.providers.balance_provider import BalanceService, BankAPIService, RevenueService
from app.providers.topup_provider import TopupService
from app.schemas.balance import (
    AdminTopupSettingsResponse,
    AdminTopupSettingsUpdateRequest,
    BalanceResponse,
    DepositRequest,
    DepositResponse,
    BalanceHistoryResponse,
    BankAPIListResponse,
    RevenueStatsResponse,
    RevenueTrendResponse,
    RevenueTransactionsResponse,
    TopupInfoResponse,
    TopupSyncResponse,
)

router = APIRouter(prefix="/api/balance", tags=["balance"])


@router.get("/current", response_model=BalanceResponse)
async def get_current_balance(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get current user balance
    
    Returns:
        BalanceResponse: User's current balance information
    """
    try:
        balance = BalanceService.get_balance(current_user.id, db)
        return balance
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy số dư: {str(e)}"
        )


@router.post("/deposit", response_model=DepositResponse)
async def deposit_balance(
    payload: DepositRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Deposit money into user account
    
    Args:
        payload: DepositRequest containing amount and payment method
        
    Returns:
        DepositResponse: Deposit status and updated balance
    """
    try:
        if payload.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số tiền phải lớn hơn 0"
            )

        # Demo mode: always succeed
        if payload.payment_method == "demo":
            success, message, balance = BalanceService.deposit_balance(
                current_user.id,
                payload.amount,
                db,
                payment_method="demo"
            )
        else:
            # TODO: Implement real payment gateway integration
            success, message, balance = BalanceService.deposit_balance(
                current_user.id,
                payload.amount,
                db,
                payment_method=payload.payment_method
            )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )

        return DepositResponse(
            status=True,
            message=message,
            balance=balance
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi nạp tiền: {str(e)}"
        )


@router.get("/history", response_model=BalanceHistoryResponse)
async def get_balance_history(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Get user balance transaction history
    
    Args:
        page: Page number (default: 1)
        page_size: Items per page (default: 20)
        
    Returns:
        BalanceHistoryResponse: List of balance transactions
    """
    try:
        history = BalanceService.get_transaction_history(
            current_user.id,
            db,
            page=page,
            page_size=page_size
        )
        
        return BalanceHistoryResponse(**history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy lịch sử: {str(e)}"
        )


@router.get("/topup/info", response_model=TopupInfoResponse)
async def get_topup_info(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    try:
        payload = TopupService.build_topup_info(current_user, db)
        return TopupInfoResponse(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy thông tin nạp tiền: {str(e)}"
        )


@router.post("/topup/sync", response_model=TopupSyncResponse)
async def sync_topup_transactions(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    try:
        payload = TopupService.sync_user_topups(current_user, db)
        return TopupSyncResponse(**payload)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi rà soát giao dịch nạp tiền: {str(e)}"
        )


@router.get("/admin/topup-settings", response_model=AdminTopupSettingsResponse)
async def get_admin_topup_settings(
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    try:
        payload = TopupService.build_admin_settings_payload(db)
        return AdminTopupSettingsResponse(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy cấu hình nạp tiền: {str(e)}"
        )


@router.put("/admin/topup-settings", response_model=AdminTopupSettingsResponse)
async def update_admin_topup_settings(
    payload: AdminTopupSettingsUpdateRequest,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    try:
        TopupService.update_config(
            db,
            provider=payload.provider,
            bank_code=payload.bank_code,
            bank_name=payload.bank_name,
            qr_bank_id=payload.qr_bank_id,
            qr_template=payload.qr_template,
            account_number=payload.account_number,
            account_name=payload.account_name,
            history_account_id=payload.history_account_id,
            transfer_content_template=payload.transfer_content_template,
            is_active=payload.is_active,
        )
        refreshed = TopupService.build_admin_settings_payload(db)
        return AdminTopupSettingsResponse(**refreshed)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi cập nhật cấu hình nạp tiền: {str(e)}"
        )


@router.get("/banks", response_model=BankAPIListResponse)
async def get_available_banks(
    db: Session = Depends(get_db),
):
    """
    Get list of available banks and their APIs
    
    Returns:
        BankAPIListResponse: List of bank APIs with details
    """
    try:
        # Initialize default banks if not exist
        BankAPIService.initialize_default_banks(db)
        
        banks = BankAPIService.get_all_banks(db)
        return BankAPIListResponse(
            total=len(banks),
            banks=banks
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách ngân hàng: {str(e)}"
        )


@router.get("/revenue/stats", response_model=RevenueStatsResponse)
async def get_revenue_stats(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
    days: int = Query(0, description="Days to look back (0 = all time)"),
):
    """
    Get revenue statistics
    
    Args:
        days: Number of days to look back (0 for all time)
        
    Returns:
        RevenueStatsResponse: Revenue statistics
    """
    try:
        total_stats = RevenueService.get_total_revenue(db, current_user.id, days)
        bank_stats = RevenueService.get_revenue_by_bank(db, current_user.id, days)
        daily_revenue = RevenueService.get_daily_revenue(db, current_user.id, days if days > 0 else 30)
        
        # Calculate weekly and monthly revenue
        weekly_revenue = RevenueService.get_total_revenue(db, current_user.id, days=7)["total_revenue"]
        monthly_revenue = RevenueService.get_total_revenue(db, current_user.id, days=30)["total_revenue"]
        
        return RevenueStatsResponse(
            total_revenue=total_stats["total_revenue"],
            total_expense=total_stats["total_expense"],
            net_revenue=total_stats["net_revenue"],
            total_transactions=total_stats["total_transactions"],
            total_income_transactions=total_stats["total_income_transactions"],
            total_expense_transactions=total_stats["total_expense_transactions"],
            today_revenue=total_stats["today_revenue"],
            today_expense=total_stats["today_expense"],
            today_transactions=total_stats["today_transactions"],
            today_income_transactions=total_stats["today_income_transactions"],
            today_expense_transactions=total_stats["today_expense_transactions"],
            weekly_revenue=weekly_revenue,
            monthly_revenue=monthly_revenue,
            average_transaction_value=total_stats["average_transaction_value"],
            revenue_by_bank=bank_stats["revenue_by_bank"],
            transactions_by_bank=bank_stats["transactions_by_bank"],
            daily_revenue=daily_revenue,
            hourly_revenue=[]  # TODO: Implement hourly stats
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy thống kê doanh thu: {str(e)}"
        )


@router.get("/revenue/trends", response_model=list[RevenueTrendResponse])
async def get_revenue_trends(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
    days: int = Query(7, description="Number of days to show"),
):
    """
    Get revenue trends (deposits vs withdrawals)
    
    Args:
        days: Number of days to show
        
    Returns:
        List of RevenueTrendResponse: Revenue trends over time
    """
    try:
        trends = RevenueService.get_revenue_trends(db, current_user.id, days)
        return trends
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy xu hướng doanh thu: {str(e)}"
        )


@router.get("/revenue/transactions", response_model=RevenueTransactionsResponse)
async def get_revenue_transactions(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
    days: int = Query(30, description="Days to look back for the transactions table"),
    limit: int = Query(300, ge=1, le=1000, description="Maximum number of rows to return"),
    page: int = Query(1, ge=1, description="Page number for paginated transaction results"),
    page_size: int = Query(100, ge=1, le=200, description="Rows per page for paginated transaction results"),
):
    """
    Get recent real-bank transactions for the revenue dashboard table.
    """
    try:
        payload = RevenueService.get_revenue_transactions(
            db,
            current_user.id,
            days,
            limit=limit,
            page=page,
            page_size=page_size,
        )
        return RevenueTransactionsResponse(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy giao dịch doanh thu: {str(e)}"
        )
