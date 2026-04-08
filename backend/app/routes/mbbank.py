from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.models.user import User
from app.models.mbbank_account import MBBankAccount
from app.schemas.mbbank import (
    MBBankLoginRequest,
    MBBankAccountResponse,
    MBBankLoginResponse,
    MBBankAccountListResponse,
    MBBankAccountDeleteResponse,
)
from app.providers.mbbank_provider import MBBankService
from app.providers.subscription_provider import SubscriptionService
from app.routes.auth import get_authenticated_user
from app.utils import create_access_token
from app.middleware.subscription_middleware import check_api_access, consume_api_call

router = APIRouter(prefix="/api/mbbank", tags=["mbbank"])
mbbank_service = MBBankService()


@router.post("/get-captcha")
async def get_captcha():
    """
    Get captcha image from MB Bank
    
    Returns:
        dict: Captcha image data (base64), captcha_id, etc.
    """
    try:
        captcha_data = mbbank_service.get_captcha()
        return {
            "status": True,
            "message": "Lấy captcha thành công",
            "data": captcha_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy captcha: {str(e)}"
        )


@router.post("/login", response_model=MBBankLoginResponse)
async def login_mbbank(
    credentials: MBBankLoginRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Login to MB Bank and store account credentials
    
    **Requires active subscription**
    
    This endpoint:
    1. Checks if user has active subscription
    2. Gets captcha from MB Bank
    3. Solves captcha
    4. Performs login with credentials
    5. Stores account info in database
    6. Returns access token for payment operations
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        # Step 1: Get captcha
        captcha_data = mbbank_service.get_captcha()
        captcha_image = captcha_data.get('image_data', '')
        
        # Step 2: Solve captcha
        captcha_code = mbbank_service.solve_captcha(captcha_image)
        
        # Step 3: Login to MB Bank
        login_response = mbbank_service.login(
            phone=credentials.phone,
            password=credentials.password,
            captcha_code=captcha_code
        )
        
        # Step 4: Validate response
        is_success, message, data = mbbank_service.validate_login_response(login_response)
        
        if not is_success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=message
            )
        
        # Step 5: Check if account already exists
        existing_account = db.query(MBBankAccount).filter(
            MBBankAccount.user_id == current_user.id,
            MBBankAccount.phone == credentials.phone
        ).first()
        
        # Encrypt password before storing
        encrypted_password = mbbank_service.encrypt_password(credentials.password)
        
        if existing_account:
            # Update existing account
            existing_account.session_id = data.get('sessionId')
            existing_account.device_id = mbbank_service.generate_device_id()
            existing_account.last_login_at = datetime.utcnow()
            existing_account.access_token = create_access_token(current_user.id)
            db.commit()
            db.refresh(existing_account)
            account = existing_account
        else:
            # Create new account
            new_account = MBBankAccount(
                user_id=current_user.id,
                phone=credentials.phone,
                account_number=credentials.account_number,
                account_name=data.get('customerName', 'Unknown'),
                password=encrypted_password,
                session_id=data.get('sessionId'),
                device_id=mbbank_service.generate_device_id(),
                access_token=create_access_token(current_user.id),
                last_login_at=datetime.utcnow(),
            )
            db.add(new_account)
            db.commit()
            db.refresh(new_account)
            account = new_account
        
        return MBBankLoginResponse(
            message="Đăng nhập tài khoản MB Bank thành công",
            status=True,
            account=MBBankAccountResponse.model_validate(account),
            token=account.access_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi đăng nhập MB Bank: {str(e)}"
        )


@router.get("/accounts", response_model=MBBankAccountListResponse)
async def list_mbbank_accounts(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get all MB Bank accounts linked to current user
    
    **Requires active subscription**
    
    Returns:
        MBBankAccountListResponse: List of MB Bank accounts
    """
    try:
        # Check API access
        check_api_access(current_user, db)
        
        # Consume API call
        consume_api_call(current_user, db)
        accounts = db.query(MBBankAccount).filter(
            MBBankAccount.user_id == current_user.id
        ).all()
        
        return MBBankAccountListResponse(
            message="Danh sách tài khoản MB Bank",
            accounts=[MBBankAccountResponse.model_validate(acc) for acc in accounts],
            total=len(accounts)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách tài khoản: {str(e)}"
        )


@router.get("/accounts/{account_id}", response_model=MBBankAccountResponse)
async def get_mbbank_account(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Get specific MB Bank account details
    
    **Requires active subscription**
    
    Args:
        account_id: ID of the MB Bank account
        
    Returns:
        MBBankAccountResponse: Account details
    """
    # Check API access
    check_api_access(current_user, db)
    
    # Consume API call
    consume_api_call(current_user, db)
    account = db.query(MBBankAccount).filter(
        MBBankAccount.id == account_id,
        MBBankAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản MB Bank không tìm thấy"
        )
    
    return MBBankAccountResponse.model_validate(account)


@router.delete("/accounts/{account_id}", response_model=MBBankAccountDeleteResponse)
async def delete_mbbank_account(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Delete a linked MB Bank account
    
    **Requires active subscription**
    
    Args:
        account_id: ID of the MB Bank account
        
    Returns:
        MBBankAccountDeleteResponse: Deletion status
    """
    # Check API access
    check_api_access(current_user, db)
    
    # Consume API call
    consume_api_call(current_user, db)
    account = db.query(MBBankAccount).filter(
        MBBankAccount.id == account_id,
        MBBankAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản MB Bank không tìm thấy"
        )
    
    try:
        db.delete(account)
        db.commit()
        
        return MBBankAccountDeleteResponse(
            message="Xóa tài khoản MB Bank thành công",
            status=True
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xóa tài khoản: {str(e)}"
        )


@router.post("/refresh-session/{account_id}")
async def refresh_mbbank_session(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Refresh MB Bank session if expired
    
    **Requires active subscription**
    
    Args:
        account_id: ID of the MB Bank account
        
    Returns:
        dict: Updated session info
    """
    # Check API access
    check_api_access(current_user, db)
    
    # Consume API call
    consume_api_call(current_user, db)
    account = db.query(MBBankAccount).filter(
        MBBankAccount.id == account_id,
        MBBankAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản MB Bank không tìm thấy"
        )
    
    try:
        # Decrypt password
        password = mbbank_service.decrypt_password(account.password)
        
        # Get new captcha and login
        captcha_data = mbbank_service.get_captcha()
        captcha_image = captcha_data.get('image_data', '')
        captcha_code = mbbank_service.solve_captcha(captcha_image)
        
        login_response = mbbank_service.login(
            phone=account.phone,
            password=password,
            captcha_code=captcha_code
        )
        
        is_success, message, data = mbbank_service.validate_login_response(login_response)
        
        if not is_success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=message
            )
        
        # Update session info
        account.session_id = data.get('sessionId')
        account.device_id = mbbank_service.generate_device_id()
        account.last_login_at = datetime.utcnow()
        db.commit()
        db.refresh(account)
        
        return {
            "status": True,
            "message": "Làm mới phiên đăng nhập thành công",
            "account": MBBankAccountResponse.model_validate(account)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi làm mới phiên: {str(e)}"
        )
