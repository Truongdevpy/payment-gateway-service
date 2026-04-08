import logging
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.invoice import Invoice
from app.models.subscription import Subscription

logger = logging.getLogger(__name__)


class InvoiceService:
    """Service for managing invoices"""

    @staticmethod
    def _generate_invoice_number(db: Session) -> str:
        """Generate unique invoice number like INV-2026-00001"""
        year = datetime.utcnow().year
        last_invoice = db.query(Invoice).filter(
            Invoice.invoice_number.like(f"INV-{year}-%")
        ).order_by(Invoice.id.desc()).first()

        if last_invoice:
            try:
                last_num = int(last_invoice.invoice_number.split("-")[-1])
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1

        return f"INV-{year}-{next_num:05d}"

    @staticmethod
    def create_invoice(
        user_id: int,
        amount: float,
        db: Session,
        subscription_id: Optional[int] = None,
        discount_amount: float = 0,
        tax_amount: float = 0,
        description: Optional[str] = None,
        coupon_code: Optional[str] = None,
        due_days: int = 0,
    ) -> Invoice:
        """Create a new invoice"""
        invoice_number = InvoiceService._generate_invoice_number(db)
        total_amount = amount - discount_amount + tax_amount
        now = datetime.utcnow()

        invoice = Invoice(
            user_id=user_id,
            invoice_number=invoice_number,
            subscription_id=subscription_id,
            amount=amount,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=max(0, total_amount),
            status="paid",
            issue_date=now,
            due_date=now + timedelta(days=due_days) if due_days > 0 else now,
            payment_date=now,
            description=description or "Thanh toán gói dịch vụ",
            coupon_code=coupon_code,
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        logger.info(f"Invoice created: {invoice_number} for user {user_id}")
        return invoice

    @staticmethod
    def create_invoice_for_subscription(
        user_id: int,
        subscription: Subscription,
        db: Session,
        discount_amount: float = 0,
        coupon_code: Optional[str] = None,
    ) -> Invoice:
        """Create an invoice linked to a subscription"""
        return InvoiceService.create_invoice(
            user_id=user_id,
            amount=subscription.price,
            db=db,
            subscription_id=subscription.id,
            discount_amount=discount_amount,
            description=f"Thanh toán gói {subscription.plan_name}",
            coupon_code=coupon_code,
        )

    @staticmethod
    def get_user_invoices(user_id: int, db: Session, limit: int = 50) -> List[Invoice]:
        """Get all invoices for a user"""
        return db.query(Invoice).filter(
            Invoice.user_id == user_id
        ).order_by(Invoice.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_invoice(invoice_id: int, db: Session) -> Optional[Invoice]:
        return db.query(Invoice).filter(Invoice.id == invoice_id).first()

    @staticmethod
    def get_invoice_by_number(invoice_number: str, db: Session) -> Optional[Invoice]:
        return db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()

    @staticmethod
    def mark_as_paid(invoice_id: int, db: Session) -> Optional[Invoice]:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return None
        invoice.status = "paid"
        invoice.payment_date = datetime.utcnow()
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def cancel_invoice(invoice_id: int, db: Session) -> Optional[Invoice]:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return None
        invoice.status = "cancelled"
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def get_all_invoices(db: Session, status: Optional[str] = None, limit: int = 100) -> List[Invoice]:
        """Admin: get all invoices with optional status filter"""
        query = db.query(Invoice)
        if status:
            query = query.filter(Invoice.status == status)
        return query.order_by(Invoice.created_at.desc()).limit(limit).all()

    @staticmethod
    def generate_pdf_bytes(invoice: Invoice) -> bytes:
        """
        Generate a simple PDF invoice. Falls back to a text representation
        if reportlab is not installed.
        """
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm
            from reportlab.pdfgen import canvas
            import io

            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            # Header
            c.setFont("Helvetica-Bold", 24)
            c.drawString(30 * mm, height - 30 * mm, "HÓA ĐƠN / INVOICE")

            c.setFont("Helvetica", 11)
            c.drawString(30 * mm, height - 42 * mm, f"Số: {invoice.invoice_number}")
            c.drawString(30 * mm, height - 48 * mm, f"Ngày: {invoice.issue_date.strftime('%d/%m/%Y') if invoice.issue_date else ''}")

            y = height - 65 * mm
            c.setFont("Helvetica-Bold", 12)
            c.drawString(30 * mm, y, "Mô tả")
            c.drawRightString(width - 30 * mm, y, "Số tiền (VND)")

            y -= 8 * mm
            c.setFont("Helvetica", 11)
            c.line(30 * mm, y + 3 * mm, width - 30 * mm, y + 3 * mm)

            c.drawString(30 * mm, y, invoice.description or "Dịch vụ")
            c.drawRightString(width - 30 * mm, y, f"{invoice.amount:,.0f}")

            if invoice.discount_amount:
                y -= 7 * mm
                c.drawString(30 * mm, y, "Giảm giá")
                c.drawRightString(width - 30 * mm, y, f"-{invoice.discount_amount:,.0f}")

            if invoice.tax_amount:
                y -= 7 * mm
                c.drawString(30 * mm, y, "Thuế VAT")
                c.drawRightString(width - 30 * mm, y, f"{invoice.tax_amount:,.0f}")

            y -= 10 * mm
            c.line(30 * mm, y + 3 * mm, width - 30 * mm, y + 3 * mm)
            c.setFont("Helvetica-Bold", 13)
            c.drawString(30 * mm, y, "TỔNG CỘNG")
            c.drawRightString(width - 30 * mm, y, f"{invoice.total_amount:,.0f} VND")

            y -= 15 * mm
            c.setFont("Helvetica", 10)
            c.drawString(30 * mm, y, f"Trạng thái: {invoice.status.upper()}")

            c.showPage()
            c.save()
            buf.seek(0)
            return buf.read()

        except ImportError:
            logger.warning("reportlab not installed – returning plain text invoice")
            text = (
                f"INVOICE {invoice.invoice_number}\n"
                f"Date: {invoice.issue_date}\n"
                f"Amount: {invoice.amount:,.0f} VND\n"
                f"Discount: -{invoice.discount_amount:,.0f} VND\n"
                f"Total: {invoice.total_amount:,.0f} VND\n"
                f"Status: {invoice.status}\n"
            )
            return text.encode("utf-8")
