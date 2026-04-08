from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Invoice(Base):
    """Model for user invoices"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(3), default="VND")
    status = Column(String(20), default="draft")  # draft, sent, paid, overdue, cancelled
    issue_date = Column(DateTime, server_default=func.now())
    due_date = Column(DateTime, nullable=True)
    payment_date = Column(DateTime, nullable=True)
    description = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    coupon_code = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="invoices")
    subscription = relationship("Subscription", backref="invoices")

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "invoiceNumber": self.invoice_number,
            "subscriptionId": self.subscription_id,
            "amount": self.amount,
            "discountAmount": self.discount_amount,
            "taxAmount": self.tax_amount,
            "totalAmount": self.total_amount,
            "currency": self.currency,
            "status": self.status,
            "issueDate": self.issue_date.isoformat() if self.issue_date else None,
            "dueDate": self.due_date.isoformat() if self.due_date else None,
            "paymentDate": self.payment_date.isoformat() if self.payment_date else None,
            "description": self.description,
            "notes": self.notes,
            "couponCode": self.coupon_code,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
