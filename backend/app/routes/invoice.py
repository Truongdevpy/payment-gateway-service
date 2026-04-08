from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.providers.invoice_provider import InvoiceService
from app.providers.billing_provider import BillingService
from app.schemas.invoice import (
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceCreateRequest,
    BillingReportResponse,
)
from app.routes.auth import get_authenticated_user

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


# ── User endpoints ────────────────────────────────────────────────────

@router.get("", response_model=InvoiceListResponse)
async def get_my_invoices(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get all invoices for current user"""
    try:
        invoices = InvoiceService.get_user_invoices(current_user.id, db)
        return InvoiceListResponse(
            invoices=[InvoiceResponse(**inv.to_dict()) for inv in invoices],
            total=len(invoices),
            message="Danh sách hóa đơn",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách hóa đơn: {str(e)}",
        )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get invoice details"""
    try:
        invoice = InvoiceService.get_invoice(invoice_id, db)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hóa đơn không tìm thấy",
            )
        if invoice.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem hóa đơn này",
            )
        return InvoiceResponse(**invoice.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy hóa đơn: {str(e)}",
        )


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Download invoice as PDF"""
    try:
        invoice = InvoiceService.get_invoice(invoice_id, db)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hóa đơn không tìm thấy",
            )
        if invoice.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền tải hóa đơn này",
            )

        pdf_bytes = InvoiceService.generate_pdf_bytes(invoice)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tạo PDF: {str(e)}",
        )


# ── Admin endpoints ──────────────────────────────────────────────────

@router.post("/admin/create", response_model=InvoiceResponse)
async def create_manual_invoice(
    payload: InvoiceCreateRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Create a manual invoice (admin)"""
    try:
        invoice = InvoiceService.create_invoice(
            user_id=payload.user_id,
            amount=payload.amount,
            db=db,
            subscription_id=payload.subscription_id,
            discount_amount=payload.discount_amount,
            tax_amount=payload.tax_amount,
            description=payload.description,
            coupon_code=payload.coupon_code,
        )
        return InvoiceResponse(**invoice.to_dict())
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tạo hóa đơn: {str(e)}",
        )


@router.patch("/admin/{invoice_id}/paid")
async def mark_invoice_paid(
    invoice_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Mark an invoice as paid (admin)"""
    try:
        invoice = InvoiceService.mark_as_paid(invoice_id, db)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hóa đơn không tìm thấy",
            )
        return {"status": True, "message": "Đã đánh dấu thanh toán", "invoice": invoice.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi cập nhật hóa đơn: {str(e)}",
        )


@router.get("/admin/billing-report", response_model=BillingReportResponse)
async def get_billing_report(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get daily billing report (admin)"""
    try:
        report = BillingService.generate_daily_billing_report(db)
        return BillingReportResponse(**report)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tạo báo cáo: {str(e)}",
        )
