from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.sql import func
from app.database import Base


class HistoryAccount(Base):
    __tablename__ = "history_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)
    token = Column(String(255), nullable=False, index=True)
    account_name = Column(String(255), nullable=True)
    external_id = Column(String(255), nullable=True)
    login_identifier = Column(String(255), nullable=True)
    credential_payload = Column(Text, nullable=True)
    session_payload = Column(Text, nullable=True)
    status = Column(String(50), default="active", nullable=False)
    terms_accepted = Column(Boolean, default=False, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_history_account_user_provider", "user_id", "provider"),
        Index("idx_history_account_provider_token", "provider", "token"),
        Index("idx_history_account_provider_external", "provider", "external_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "provider": self.provider,
            "token": self.token,
            "accountName": self.account_name,
            "externalId": self.external_id,
            "loginIdentifier": self.login_identifier,
            "status": self.status,
            "termsAccepted": self.terms_accepted,
            "lastSyncedAt": self.last_synced_at.isoformat() if self.last_synced_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class TransactionRecord(Base):
    __tablename__ = "transaction_records"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("history_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(String(255), nullable=False, index=True)
    transaction_type = Column(String(100), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="VND", nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="completed")
    posted_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_transaction_account_id", "account_id"),
        Index("idx_transaction_account_posted_at", "account_id", "posted_at"),
        Index("idx_transaction_account_transaction", "account_id", "transaction_id"),
        Index("idx_transaction_created_at", "created_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "transactionId": self.transaction_id,
            "transactionType": self.transaction_type,
            "amount": self.amount,
            "currency": self.currency,
            "description": self.description,
            "status": self.status,
            "postedAt": self.posted_at.isoformat() if self.posted_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
