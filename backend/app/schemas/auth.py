from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class UserBase(CamelModel):
    """Base user schema"""

    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    """User creation schema"""

    password: str
    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        if not value or len(value.strip()) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(value.strip()) > 120:
            raise ValueError("Full name must not exceed 120 characters")
        return value.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value or len(value) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(value) > 128:
            raise ValueError("Password must not exceed 128 characters")
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, value: str) -> str:
        if not value:
            raise ValueError("Confirm password is required")
        return value

    def validate_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")


class UserLogin(CamelModel):
    """User login schema"""

    email: EmailStr
    password: str
    otp: Optional[str] = None


class UserResponse(UserBase):
    """User response schema"""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: int
    is_active: bool
    is_admin: int = 0
    is_verified: bool
    two_factor_enabled: bool = False
    created_at: datetime
    updated_at: datetime


class TokenResponse(CamelModel):
    """Token response schema"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(CamelModel):
    """Authentication response schema"""

    message: str
    user: UserResponse
    token: str
    refresh_token: Optional[str] = None


class LoginResponse(CamelModel):
    """Login response schema with optional 2FA step."""

    message: str
    requires_2fa: bool = False
    user: Optional[UserResponse] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None


class ChangePasswordRequest(CamelModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not value or len(value) < 6:
            raise ValueError("New password must be at least 6 characters")
        if len(value) > 128:
            raise ValueError("New password must not exceed 128 characters")
        return value

    def validate_passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")


class MessageResponse(CamelModel):
    message: str


class TwoFactorStatusResponse(CamelModel):
    enabled: bool
    setup_pending: bool = False
    secret: Optional[str] = None
    provisioning_uri: Optional[str] = None
    message: Optional[str] = None


class TwoFactorCodeRequest(CamelModel):
    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        normalized = value.strip().replace(" ", "")
        if not normalized.isdigit() or len(normalized) != 6:
            raise ValueError("Authentication code must be 6 digits")
        return normalized


class TwoFactorDisableRequest(TwoFactorCodeRequest):
    current_password: str


class ErrorResponse(CamelModel):
    error: str
    details: Optional[dict] = None
