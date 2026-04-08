from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class UserBalance(Base):
    """Model for managing user account balance/wallet"""
    __tablename__ = "user_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    balance = Column(Float, default=0.0)  # Số dư hiện tại
    total_deposited = Column(Float, default=0.0)  # Tổng nạp
    total_spent = Column(Float, default=0.0)  # Tổng chi
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="balance")
    transactions = relationship("BalanceTransaction", back_populates="user_balance")

    def add_balance(self, amount: float):
        """Thêm tiền vào ví"""
        self.balance += amount
        self.total_deposited += amount
        self.updated_at = datetime.utcnow()

    def subtract_balance(self, amount: float):
        """Trừ tiền từ ví"""
        if self.balance >= amount:
            self.balance -= amount
            self.total_spent += amount
            self.updated_at = datetime.utcnow()
            return True
        return False

    def has_sufficient_balance(self, amount: float) -> bool:
        """Kiểm tra đủ tiền"""
        return self.balance >= amount


class BalanceTransaction(Base):
    """Model for tracking balance transactions"""
    __tablename__ = "balance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_balance_id = Column(Integer, ForeignKey("user_balances.id"), nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)  # deposit, purchase_subscription, purchase_api, withdraw
    amount = Column(Float, nullable=False)
    description = Column(Text)
    status = Column(String(20), default="completed")  # pending, completed, failed, cancelled
    reference_id = Column(String(100), index=True)  # subscription_id, order_id, etc.
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_balance = relationship("UserBalance", back_populates="transactions")


class BankAPI(Base):
    """Model for managing bank APIs"""
    __tablename__ = "bank_apis"

    id = Column(Integer, primary_key=True, index=True)
    bank_code = Column(String(50), unique=True, nullable=False, index=True)  # MBBANK, VCB, VPB, etc.
    bank_name = Column(String(255), nullable=False)
    bank_name_vi = Column(String(255), nullable=False)
    logo_url = Column(String(500))
    
    # API details
    api_name = Column(String(255), nullable=False)
    api_endpoint = Column(String(500))
    api_version = Column(String(20))
    
    # Status
    is_active = Column(String(20), default="active")  # active, inactive, maintenance
    description = Column(Text)
    
    # Pricing & Limits
    base_price_per_call = Column(Float, default=0.0)  # Giá tiêu chuẩn per API call
    monthly_call_limit = Column(Integer)  # Giới hạn call/tháng
    
    # Metadata
    supported_operations = Column(Text)  # JSON: login, get_balance, get_history, etc.
    authentication_type = Column(String(50))  # oauth2, basic_auth, api_key, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "bank_code": self.bank_code,
            "bank_name": self.bank_name,
            "bank_name_vi": self.bank_name_vi,
            "logo_url": self.logo_url,
            "api_name": self.api_name,
            "api_version": self.api_version,
            "is_active": self.is_active,
            "base_price_per_call": self.base_price_per_call,
            "monthly_call_limit": self.monthly_call_limit,
        }


class APIUsageTransaction(Base):
    """Model for tracking bank API usage transactions & revenue"""
    __tablename__ = "api_usage_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    bank_api_id = Column(Integer, ForeignKey("bank_apis.id"), nullable=False, index=True)
    
    # Transaction details
    transaction_type = Column(String(50), nullable=False)  # login, get_balance, get_history, etc.
    amount = Column(Float, default=0.0)  # Cost in VND
    
    # Status
    status = Column(String(20), default="completed")  # pending, completed, failed
    
    # Metadata
    description = Column(Text)
    external_reference = Column(String(100))  # Reference from bank/partner
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    bank_api = relationship("BankAPI")
