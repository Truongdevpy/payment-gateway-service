from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.providers.email_provider import EmailService
from app.schemas.email import (
    EmailTestRequest,
    EmailSendResponse,
    EmailTemplateListResponse,
    EmailTemplateResponse,
)
from app.routes.auth import get_authenticated_user

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/test", response_model=EmailSendResponse)
async def send_test_email(
    payload: EmailTestRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Send a test email using a specified template.
    Requires authentication.
    """
    try:
        # Create a mock user-like object for rendering
        class MockUser:
            def __init__(self, email, full_name):
                self.email = email
                self.full_name = full_name

        mock = MockUser(email=payload.to_email, full_name=payload.full_name)

        template_key = payload.template_key

        if template_key == "welcome":
            success = EmailService.send_welcome_email(mock, db)
        elif template_key == "verification":
            success = EmailService.send_verification_email(mock, "123456", db)
        elif template_key == "password_reset":
            success = EmailService.send_password_reset(mock, "http://localhost:5173/reset?token=test123", db)
        elif template_key == "api_token":
            success = EmailService.send_api_token(mock, "test-api-token-xyz-123", db)
        elif template_key == "renewal_reminder":
            success = EmailService.send_renewal_reminder(mock, "Gói Cơ Bản", 3, db)
        elif template_key == "subscription_confirmation":
            success = EmailService.send_subscription_confirmation(
                mock, "Gói Cơ Bản", 49000, "2026-04-07", "2026-05-07", db
            )
        elif template_key == "payment_receipt":
            success = EmailService.send_payment_receipt(
                mock, "INV-2026-00001", "Gói Cơ Bản", 49000, 0, 49000, "2026-04-07", db
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template '{template_key}' không tồn tại",
            )

        if success:
            return EmailSendResponse(success=True, message=f"Email '{template_key}' đã được gửi đến {payload.to_email}")
        else:
            return EmailSendResponse(success=False, message="Gửi email thất bại. Kiểm tra cấu hình SMTP.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi gửi email: {str(e)}",
        )


@router.get("/templates", response_model=EmailTemplateListResponse)
async def get_email_templates(
    current_user: User = Depends(get_authenticated_user),
):
    """Get list of available email templates"""
    templates = EmailService.get_available_templates()
    return EmailTemplateListResponse(
        templates=[EmailTemplateResponse(key=t["key"], subject=t["subject"]) for t in templates]
    )
