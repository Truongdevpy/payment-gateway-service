from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class PaymentTransaction(Base):
    """Model for tracking payment/transfer transactions"""
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)  # topup, debit, transfer, refund
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="VND")
    status = Column(String(50), default="pending")  # pending, completed, failed, cancelled
    payment_method = Column(String(50), nullable=False)  # momo, zalopay, vcb, bank_transfer
    reference_id = Column(String(255), nullable=True, index=True)  # external ref from provider
    description = Column(String(255), nullable=True)
    recipient_account = Column(String(255), nullable=True)  # phone/account number
    recipient_name = Column(String(255), nullable=True)
    provider_response = Column(Text, nullable=True)  # JSON response from payment provider
    error_message = Column(Text, nullable=True)
    otp_required = Column(String(10), default="no")  # yes, no, verified
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="payment_transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "transactionType": self.transaction_type,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "paymentMethod": self.payment_method,
            "referenceId": self.reference_id,
            "description": self.description,
            "recipientAccount": self.recipient_account,
            "recipientName": self.recipient_name,
            "otpRequired": self.otp_required,
            "errorMessage": self.error_message,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<PaymentTransaction {self.id} - {self.payment_method} - {self.status}>'
