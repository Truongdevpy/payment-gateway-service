from pydantic import BaseModel, EmailStr
from typing import Optional, List


class EmailTestRequest(BaseModel):
    """Request to send a test email"""
    to_email: EmailStr
    template_key: str = "welcome"
    full_name: str = "Test User"


class EmailTemplateResponse(BaseModel):
    """Email template info"""
    key: str
    subject: str


class EmailTemplateListResponse(BaseModel):
    """List of available email templates"""
    templates: List[EmailTemplateResponse]


class EmailSendResponse(BaseModel):
    """Response after sending an email"""
    success: bool
    message: str


class EmailLogResponse(BaseModel):
    """Email log entry"""
    id: int
    recipientEmail: str
    subject: str
    templateKey: Optional[str]
    status: str
    errorMessage: Optional[str]
    createdAt: Optional[str]

    class Config:
        from_attributes = True
