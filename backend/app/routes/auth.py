from fastapi import APIRouter, Depends, Header, HTTPException, status, Body
from sqlalchemy.orm import Session

import pyotp

from app.config import config
from app.database import get_db
from app.models.user import User
from app.models.balance import UserBalance
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginResponse,
    MessageResponse,
    TokenResponse,
    TwoFactorCodeRequest,
    TwoFactorDisableRequest,
    TwoFactorStatusResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.utils import create_access_token, create_refresh_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_authenticated_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        ) from exc

    payload = verify_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


def require_admin_user(
    current_user: User = Depends(get_authenticated_user),
) -> User:
    if int(current_user.is_admin or 0) <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập khu vực quản trị",
        )

    return current_user


def verify_totp_code(user: User, code: str) -> bool:
    if not user.two_factor_secret:
        return False

    totp = pyotp.TOTP(user.two_factor_secret)
    return bool(totp.verify(code, valid_window=1))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    try:
        # Validate passwords match
        try:
            user_data.validate_passwords_match()
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(ve),
            ) from ve

        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered. Please use a different email or login instead.",
            )

        # Create new user
        new_user = User(
            full_name=user_data.full_name,
            email=user_data.email.lower(),
        )
        new_user.set_password(user_data.password)
        new_user.balance = UserBalance()

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        access_token = create_access_token(new_user.id)
        refresh_token = create_refresh_token(new_user.id)

        return AuthResponse(
            message="User registered successfully",
            user=UserResponse.model_validate(new_user),
            token=access_token,
            refresh_token=refresh_token,
        )
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        db.rollback()
        import traceback
        print(f"Registration error: {exc}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please check your input and try again.",
        ) from exc


@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    try:
        user = db.query(User).filter(User.email == credentials.email.lower()).first()

        if not user or not user.verify_password(credentials.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        if user.two_factor_enabled:
            if not credentials.otp:
                return LoginResponse(
                    message="Two-factor code required",
                    requires_2fa=True,
                )

            if not verify_totp_code(user, credentials.otp):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid two-factor code",
                )

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return LoginResponse(
            message="Login successful",
            requires_2fa=False,
            user=UserResponse.model_validate(user),
            token=access_token,
            refresh_token=refresh_token,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        ) from exc


@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: User = Depends(get_authenticated_user)):
    """Get current user info"""
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Change current user's password."""
    try:
        payload.validate_passwords_match()

        if not current_user.verify_password(payload.current_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        if payload.current_password == payload.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password",
            )

        current_user.set_password(payload.new_password)
        db.add(current_user)
        db.commit()

        return MessageResponse(message="Password updated successfully")
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password update failed",
        ) from exc


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
async def get_two_factor_status(current_user: User = Depends(get_authenticated_user)):
    """Return current 2FA status for the authenticated user."""
    setup_pending = bool(current_user.two_factor_secret and not current_user.two_factor_enabled)

    provisioning_uri = None
    secret = None

    if setup_pending:
        provisioning_uri = pyotp.TOTP(current_user.two_factor_secret).provisioning_uri(
            name=current_user.email,
            issuer_name=config.PROJECT_NAME,
        )
        secret = current_user.two_factor_secret

    return TwoFactorStatusResponse(
        enabled=bool(current_user.two_factor_enabled),
        setup_pending=setup_pending,
        secret=secret,
        provisioning_uri=provisioning_uri,
        message="Two-factor status loaded",
    )


@router.post("/2fa/setup", response_model=TwoFactorStatusResponse)
async def setup_two_factor(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Generate a TOTP secret and provisioning URI."""
    try:
        secret = pyotp.random_base32()
        provisioning_uri = pyotp.TOTP(secret).provisioning_uri(
            name=current_user.email,
            issuer_name=config.PROJECT_NAME,
        )

        current_user.two_factor_secret = secret
        current_user.two_factor_enabled = False
        db.add(current_user)
        db.commit()

        return TwoFactorStatusResponse(
            enabled=False,
            setup_pending=True,
            secret=secret,
            provisioning_uri=provisioning_uri,
            message="Two-factor secret generated successfully",
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize two-factor authentication",
        ) from exc


@router.post("/2fa/enable", response_model=TwoFactorStatusResponse)
async def enable_two_factor(
    payload: TwoFactorCodeRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Enable TOTP-based 2FA after verifying the first code."""
    try:
        if not current_user.two_factor_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor setup has not been initialized",
            )

        if not verify_totp_code(current_user, payload.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid authentication code",
            )

        current_user.two_factor_enabled = True
        db.add(current_user)
        db.commit()

        return TwoFactorStatusResponse(
            enabled=True,
            setup_pending=False,
            message="Two-factor authentication enabled successfully",
        )
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable two-factor authentication",
        ) from exc


@router.post("/2fa/disable", response_model=TwoFactorStatusResponse)
async def disable_two_factor(
    payload: TwoFactorDisableRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Disable TOTP-based 2FA after password and code verification."""
    try:
        if not current_user.two_factor_enabled or not current_user.two_factor_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Two-factor authentication is not enabled",
            )

        if not current_user.verify_password(payload.current_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        if not verify_totp_code(current_user, payload.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid authentication code",
            )

        current_user.two_factor_enabled = False
        current_user.two_factor_secret = None
        db.add(current_user)
        db.commit()

        return TwoFactorStatusResponse(
            enabled=False,
            setup_pending=False,
            message="Two-factor authentication disabled successfully",
        )
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable two-factor authentication",
        ) from exc


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    refresh_token_str: str = Body(..., alias="refresh_token"),
    db: Session = Depends(get_db),
):
    """Refresh access token"""
    try:
        payload = verify_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        user_id = payload.get("user_id")
        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or inactive",
            )

        new_access_token = create_access_token(user.id)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=refresh_token_str,
            expires_in=3600,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed",
        ) from exc


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """Logout user (client-side primarily)"""
    return MessageResponse(message="Logged out successfully")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "Auth service is running"}
