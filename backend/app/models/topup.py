from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class TopupConfig(Base):
    __tablename__ = "topup_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False, default="mbbank")
    bank_code = Column(String(50), nullable=False, default="MBBANK")
    bank_name = Column(String(255), nullable=False, default="Ngân hàng TMCP Quân đội")
    qr_bank_id = Column(String(50), nullable=False, default="970422")
    qr_template = Column(String(100), nullable=False, default="print")
    account_number = Column(String(50), nullable=False)
    account_name = Column(String(255), nullable=False)
    history_account_id = Column(Integer, ForeignKey("history_accounts.id"), nullable=True)
    transfer_content_template = Column(String(255), nullable=False, default="THUEAPI{user_id}")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    history_account = relationship("HistoryAccount")
