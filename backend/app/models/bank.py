"""
Bank Account Management Models
Manages multiple bank accounts (MB Bank, VietCombank, TP Bank, ACB, Seabank, etc.)
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base
from app.models.user import User


class BankType(str, enum.Enum):
    """Supported bank types"""
    MBBANK = "mbbank"
    VIETCOMBANK = "vietcombank"
    TPBANK = "tpbank"
    ACB = "acb"
    SEABANK = "seabank"
    ZALOPAY = "zalopay"
    MOMO = "momo"
    VIETTEL = "viettel"
    TRUEMONEY = "truemoney"
    GACHTHE1S = "gachthe1s"


class BankAccount(Base):
    """
    Bank Account Model
    Stores encrypted credentials for various bank integrations
    """
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    bank_type = Column(String(50), nullable=False, index=True)  # mbbank, vietcombank, etc.
    account_number = Column(String(50), nullable=False)
    account_name = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Encrypted credentials
    password = Column(Text, nullable=False)  # Encrypted
    
    # Session/Token management
    session_id = Column(String(500), nullable=True)
    access_token = Column(Text, nullable=True)
    device_id = Column(String(255), nullable=True)
    browser_id = Column(String(255), nullable=True)
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # API usage tracking
    daily_limit = Column(Integer, default=100)  # API calls per day
    monthly_limit = Column(Integer, default=3000)  # API calls per month
    used_today = Column(Integer, default=0)
    used_this_month = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="bank_accounts")
    transactions = relationship("BankTransaction", back_populates="bank_account", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<BankAccount {self.bank_type}:{self.account_number}>"
    
    def is_session_valid(self) -> bool:
        """Check if session/token is still valid"""
        return bool(self.session_id and self.access_token and self.device_id)
    
    def can_use_api(self) -> bool:
        """Check if account can be used for API calls"""
        return self.is_active and self.is_session_valid()
    
    def has_daily_quota(self) -> bool:
        """Check if daily API limit not exceeded"""
        return self.used_today < self.daily_limit
    
    def has_monthly_quota(self) -> bool:
        """Check if monthly API limit not exceeded"""
        return self.used_this_month < self.monthly_limit
    
    def use_api_call(self):
        """Increment API call usage"""
        self.used_today += 1
        self.used_this_month += 1
        self.last_used_at = datetime.utcnow()


class BankTransaction(Base):
    """
    Bank Transaction Model
    Logs all transactions retrieved from bank APIs
    """
    __tablename__ = "bank_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), index=True, nullable=False)
    
    # Transaction details
    transaction_id = Column(String(100), nullable=True, index=True)
    transaction_date = Column(DateTime, nullable=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="VND")
    
    # Transaction type
    transaction_type = Column(String(20), nullable=False)  # IN, OUT, TRANSFER
    description = Column(Text, nullable=True)
    reference = Column(String(255), nullable=True)
    
    # Related party info
    counterparty_name = Column(String(255), nullable=True)
    counterparty_account = Column(String(100), nullable=True)
    counterparty_bank = Column(String(100), nullable=True)
    
    # Balance after transaction
    balance_after = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    synced_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bank_account = relationship("BankAccount", back_populates="transactions")
    
    def __repr__(self):
        return f"<Transaction {self.transaction_id} {self.amount} {self.currency}>"


# Update User model with relationship
User.bank_accounts = relationship("BankAccount", back_populates="user", cascade="all, delete-orphan")
