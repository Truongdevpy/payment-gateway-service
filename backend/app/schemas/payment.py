from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class MomoUserInfo(BaseModel):
    name: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: Optional[str] = None


class MomoDeliveryInfo(BaseModel):
    deliveryAddress: Optional[str] = None
    deliveryFee: Optional[int] = None
    quantity: Optional[int] = None


class MomoItem(BaseModel):
    id: str
    name: str
    price: int = Field(..., ge=0)
    currency: str = "VND"
    quantity: int = Field(default=1, ge=1)
    description: Optional[str] = None
    category: Optional[str] = None
    imageUrl: Optional[str] = None
    manufacturer: Optional[str] = None
    totalPrice: Optional[int] = Field(default=None, ge=0)


class MomoCreatePaymentRequest(BaseModel):
    amount: int = Field(..., ge=1000, le=50_000_000)
    orderInfo: str = Field(..., min_length=1, max_length=255)
    orderId: Optional[str] = Field(default=None, min_length=1, max_length=50)
    redirectUrl: Optional[str] = None
    ipnUrl: Optional[str] = None
    extraData: dict[str, Any] = Field(default_factory=dict)
    requestType: Optional[str] = None
    autoCapture: bool = True
    lang: Optional[str] = None
    userInfo: Optional[MomoUserInfo] = None
    deliveryInfo: Optional[MomoDeliveryInfo] = None
    items: list[MomoItem] = Field(default_factory=list)


class MomoCreatePaymentResponse(BaseModel):
    success: bool
    transactionId: int
    orderId: str
    requestId: str
    amount: int
    resultCode: int
    message: str
    payUrl: Optional[str] = None
    deeplink: Optional[str] = None
    qrCodeUrl: Optional[str] = None
    deeplinkMiniApp: Optional[str] = None
    rawResponse: dict[str, Any] = Field(default_factory=dict)


class MomoQueryPaymentResponse(BaseModel):
    success: bool
    transactionId: int
    orderId: str
    status: str
    resultCode: Optional[int] = None
    message: str
    transId: Optional[int] = None
    amount: Optional[int] = None
    payType: Optional[str] = None
    responseTime: Optional[int] = None
    rawResponse: dict[str, Any] = Field(default_factory=dict)


class MomoIPNPayload(BaseModel):
    partnerCode: str
    orderId: str
    requestId: str
    amount: int
    orderInfo: str
    orderType: str
    transId: int
    resultCode: int
    message: str
    payType: str
    responseTime: int
    extraData: str = ""
    signature: str
    partnerUserId: Optional[str] = None


class PaymentTransactionResponse(BaseModel):
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


class PaymentTransactionListResponse(BaseModel):
    transactions: list[PaymentTransactionResponse]
    total: int
    message: str = "OK"
