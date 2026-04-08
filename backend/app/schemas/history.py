from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.providers.history_providers import SUPPORTED_PROVIDERS


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ProviderFieldResponse(CamelModel):
    key: str
    label: str
    required: bool
    input_type: str
    placeholder: str
    sensitive: bool
    help_text: str


class ProviderDefinitionResponse(CamelModel):
    key: str
    label: str
    category: str
    auth_mode: str
    description: str
    legacy_register_file: str
    legacy_history_file: str
    required_fields: List[str]
    fields: List[ProviderFieldResponse]
    supports_history: bool
    supports_balance: bool
    session_refresh_hint: str
    legacy_table: str


class PolicySectionResponse(CamelModel):
    title: str
    paragraphs: List[str]


class ProviderPoliciesResponse(CamelModel):
    title: str
    version: str
    consent_label: str
    sections: List[PolicySectionResponse]


class NapasBankResponse(CamelModel):
    bank_code: str
    bank_name: str
    short_bank_name: str
    white_lists: List[str] = Field(default_factory=list)
    available: bool = True


class HistoryAccountCreate(CamelModel):
    provider: str
    token: Optional[str] = None
    account_name: Optional[str] = None
    external_id: Optional[str] = None
    login_identifier: Optional[str] = None
    accept_policies: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        provider = value.strip().lower()
        if not provider:
            raise ValueError("Provider is required")
        return provider

    @field_validator("token")
    @classmethod
    def validate_token(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if len(cleaned) < 6:
            raise ValueError("Token must be at least 6 characters long")
        return cleaned


class AccountRegisterRequest(CamelModel):
    provider: str
    username: str
    password: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    cookie: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    session_id: Optional[str] = None
    device_id: Optional[str] = None
    id_token: Optional[str] = None
    imei: Optional[str] = None
    authorization: Optional[str] = None
    session_key: Optional[str] = None
    accept_policies: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("provider")
    @classmethod
    def validate_register_provider(cls, value: str) -> str:
        provider = value.strip().lower()
        if not provider:
            raise ValueError("Provider is required")
        return provider

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Username is required")
        return cleaned


class AccountRegisterResponse(CamelModel):
    success: bool
    token: str
    message: str
    account_id: Optional[int] = None
    provider: Optional[str] = None
    provider_label: Optional[str] = None


class HistoryAccountUpdate(CamelModel):
    account_name: Optional[str] = None
    external_id: Optional[str] = None
    login_identifier: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class HistoryAccountResponse(CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    user_id: int
    provider: str
    provider_label: Optional[str] = None
    token: str
    account_name: Optional[str] = None
    external_id: Optional[str] = None
    login_identifier: Optional[str] = None
    status: str
    terms_accepted: bool = False
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AccountActionResponse(CamelModel):
    success: bool
    message: str


class TransactionRecordResponse(CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    transaction_id: str
    transaction_type: Optional[str] = None
    amount: float
    currency: str = "VND"
    description: Optional[str] = None
    status: str = "completed"
    posted_at: datetime
    created_at: datetime


class TransactionHistoryResponse(CamelModel):
    provider: str
    account_id: int
    account_name: Optional[str] = None
    transactions: List[TransactionRecordResponse]


class BalanceResponse(CamelModel):
    provider: str
    account_id: int
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    balance: float
    currency: str = "VND"


class TransactionStatsResponse(CamelModel):
    provider: str
    account_id: int
    account_name: Optional[str] = None
    total_transactions: int
    total_incoming: float
    total_outgoing: float
    net_amount: float
    currency: str = "VND"


class MBBankTransactionDetail(CamelModel):
    transaction_id: str
    account_number: str
    posting_date: Optional[str] = None
    transaction_date: str
    credit_amount: float = 0.0
    debit_amount: float = 0.0
    transaction_amount: float
    transaction_type: str
    currency: str = "VND"
    description: Optional[str] = None
    beneficiary_account: Optional[str] = None
    available_balance: Optional[float] = None


class MBBankTransactionHistoryResponse(CamelModel):
    status: bool
    message: str
    transactions: List[MBBankTransactionDetail]
    total: int


class MBBankStatistics(CamelModel):
    total_transactions: int
    total_income: float
    total_expense: float
    net_change: float
    transactions_by_type: Dict[str, Any]
    average_income: float
    average_expense: float
    max_income: float
    max_expense: float
    min_income: float
    min_expense: float
    transactions_by_date: Dict[str, Any]
    transactions_by_description: Dict[str, Any]
    transactions_by_day: Dict[str, Any]


class MBBankBalanceResponse(CamelModel):
    status: bool
    message: str
    account_number: str
    account_name: str
    available_balance: float
    balance: float
    currency: str


class MBBankStatisticsResponse(CamelModel):
    status: bool
    message: str
    statistics: MBBankStatistics
