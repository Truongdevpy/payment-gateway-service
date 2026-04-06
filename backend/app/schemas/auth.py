from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    """User creation schema"""
    password: str
    confirm_password: str
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        """Validate full name"""
        if not v or len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters')
        if len(v.strip()) > 120:
            raise ValueError('Full name must not exceed 120 characters')
        return v.strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password"""
        if not v or len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 128:
            raise ValueError('Password must not exceed 128 characters')
        return v
    
    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v):
        """Validate confirm password"""
        if not v:
            raise ValueError('Confirm password is required')
        return v
    
    def validate_passwords_match(self):
        """Check if passwords match"""
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """User response schema"""
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    """Authentication response schema"""
    message: str
    user: UserResponse
    token: str
    refresh_token: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response schema"""
    error: str
    details: Optional[dict] = None
