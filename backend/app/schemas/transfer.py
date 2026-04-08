from pydantic import BaseModel, Field
from typing import Optional, List


class TransferMomoRequest(BaseModel):
    """Request to transfer via Momo"""
    phone: str = Field(..., min_length=10, max_length=12)
    amount: float = Field(..., gt=0)
    message: str = ""


class TransferZaloPayRequest(BaseModel):
    """Request to transfer via ZaloPay"""
    phone: str = Field(..., min_length=10, max_length=12)
    amount: float = Field(..., gt=0)
    message: str = ""


class TransferVCBRequest(BaseModel):
    """Request to transfer via VCB"""
    account_number: str = Field(..., min_length=6, max_length=20)
    amount: float = Field(..., gt=0)
    message: str = ""


class OTPConfirmRequest(BaseModel):
    """Request to confirm OTP for VCB"""
    otp: str = Field(..., min_length=4, max_length=8)


class TransferResponse(BaseModel):
    """Transfer result"""
    success: bool
    transactionId: Optional[int] = None
    referenceId: Optional[str] = None
    requiresOtp: bool = False
    message: str
    payUrl: Optional[str] = None
    orderUrl: Optional[str] = None


class TransactionResponse(BaseModel):
    """Single transaction info"""
    id: int
    userId: int
    transactionType: str
    amount: float
    currency: str
    status: str
    paymentMethod: str
    referenceId: Optional[str]
    description: Optional[str]
    recipientAccount: Optional[str]
    recipientName: Optional[str]
    otpRequired: Optional[str]
    errorMessage: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]

    class Config:
        from_attributes = True


class TransactionHistoryResponse(BaseModel):
    """List of transactions"""
    transactions: List[TransactionResponse]
    total: int
    message: str = "OK"
