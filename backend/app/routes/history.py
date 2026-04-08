from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.subscription_middleware import check_api_access, consume_api_call
from app.models.history import HistoryAccount, TransactionRecord
from app.models.user import User
from app.providers.history_providers import (
    SUPPORTED_PROVIDERS,
    build_registration_payload,
    encrypt_payload,
    get_policy_document,
    get_provider,
    get_provider_catalog,
    get_provider_definition,
    load_napas_banks,
    load_session_payload,
    normalize_provider_name,
    _safe_datetime,
)
from app.routes.auth import get_authenticated_user
from app.schemas.history import (
    AccountActionResponse,
    AccountRegisterRequest,
    AccountRegisterResponse,
    BalanceResponse,
    HistoryAccountCreate,
    HistoryAccountResponse,
    HistoryAccountUpdate,
    MBBankBalanceResponse,
    MBBankStatisticsResponse,
    MBBankTransactionHistoryResponse,
    NapasBankResponse,
    PolicySectionResponse,
    ProviderDefinitionResponse,
    ProviderFieldResponse,
    ProviderPoliciesResponse,
    TransactionHistoryResponse,
    TransactionRecordResponse,
    TransactionStatsResponse,
)

router = APIRouter(prefix="/api/history", tags=["history"])


def _resolve_provider(provider: str) -> str:
    try:
        return normalize_provider_name(provider)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


def _build_account_response(account: HistoryAccount) -> HistoryAccountResponse:
    definition = get_provider_definition(account.provider)
    return HistoryAccountResponse(
        id=account.id,
        user_id=account.user_id,
        provider=account.provider,
        provider_label=definition.label,
        token=account.token,
        account_name=account.account_name,
        external_id=account.external_id,
        login_identifier=account.login_identifier,
        status=account.status,
        terms_accepted=bool(account.terms_accepted),
        last_synced_at=account.last_synced_at,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


def _ensure_owner_access(account: HistoryAccount, db: Session) -> None:
    owner = db.query(User).filter(User.id == account.user_id).first()
    if owner:
        check_api_access(owner, db)
        consume_api_call(owner, db)


def _get_owned_account(account_id: int, current_user: User, db: Session) -> HistoryAccount:
    account = db.query(HistoryAccount).filter(HistoryAccount.id == account_id).first()
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


import os
import requests

def _sync_legacy_history(account: HistoryAccount, db: Session):
    try:
        from app.providers.history_providers import get_provider_definition
        definition = get_provider_definition(account.provider)
        
        legacy_base_url = os.getenv("LEGACY_API_URL", "http://localhost/assets/ajaxs")
        legacy_url = f"{legacy_base_url.rstrip('/')}/{definition.legacy_history_file}"
        
        # Gọi PHP API để lấy giao dịch mới nhất (mô phỏng như client banking_api.py)
        resp = requests.get(legacy_url, params={"token": account.token}, timeout=15)
        if resp.status_code != 200:
            return
            
        data = resp.json()
        raw_txs = data.get("TranList") or data.get("tranList") or data.get("transactions") or []
        
        if not raw_txs:
            # Maybe the history is empty or PHP failed
            return
            
        new_records = []
        for tx in raw_txs:
            # Thích ứng với nhiều định dạng trả về của webhook/API cũ
            tx_id = str(tx.get("transaction_id") or tx.get("tranid") or tx.get("trans_id") or tx.get("transactionId") or f"{account.provider}-{account.id}-{tx.get('amount')}")
            
            existing = db.query(TransactionRecord).filter(TransactionRecord.transaction_id == tx_id).first()
            if not existing:
                amount = float(tx.get("amount", 0) or 0)
                tx_type = tx.get("transaction_type") or tx.get("type") or "+"
                
                record = TransactionRecord(
                    account_id=account.id,
                    transaction_id=tx_id,
                    transaction_type=tx_type,
                    amount=amount,
                    currency=tx.get("currency", "VND"),
                    description=tx.get("description") or tx.get("comment") or tx.get("message") or "",
                    status="completed",
                    posted_at=_safe_datetime(tx.get("transactionDate") or tx.get("posted_at") or tx.get("transaction_date") or tx.get("ngay_tao")),
                )
                db.add(record)
                new_records.append(record)
                
        if new_records:
            db.commit()
    except Exception:
        db.rollback()

def _load_transactions(account: HistoryAccount, db: Session, limit: int) -> List[Dict[str, Any]]:
    # Tự động sync dữ liệu từ server cũ mỗi khi có request lấy lịch sử
    _sync_legacy_history(account, db)

    cached_records = (
        db.query(TransactionRecord)
        .filter(TransactionRecord.account_id == account.id)
        .order_by(TransactionRecord.posted_at.desc())
        .limit(limit)
        .all()
    )

    if cached_records:
        return [
            {
                "transaction_id": record.transaction_id,
                "transaction_type": record.transaction_type,
                "amount": float(record.amount),
                "currency": record.currency,
                "description": record.description,
                "status": record.status,
                "posted_at": record.posted_at,
                "created_at": record.created_at or record.posted_at,
            }
            for record in cached_records
        ]

    provider = get_provider(account.provider)
    return provider.fetch_history(account, limit=limit)


def _build_transaction_response(
    provider: str,
    account: HistoryAccount,
    transactions: List[Dict[str, Any]],
) -> TransactionHistoryResponse:
    return TransactionHistoryResponse(
        provider=provider,
        account_id=account.id,
        account_name=account.account_name,
        transactions=[
            TransactionRecordResponse(
                transaction_id=str(item["transaction_id"]),
                transaction_type=item.get("transaction_type"),
                amount=float(item.get("amount", 0) or 0),
                currency=item.get("currency", "VND"),
                description=item.get("description"),
                status=item.get("status", "completed"),
                posted_at=item.get("posted_at") or datetime.utcnow(),
                created_at=item.get("created_at") or item.get("posted_at") or datetime.utcnow(),
            )
            for item in transactions
        ],
    )


def _build_stats(provider: str, account: HistoryAccount, transactions: List[Dict[str, Any]]) -> TransactionStatsResponse:
    incoming_types = {"transfer_in", "in", "credit", "income", "+", "nhan tien", "IN", "CREDIT"}
    outgoing_types = {"transfer_out", "out", "debit", "expense", "-", "chuyen tien", "OUT", "DEBIT"}

    total_incoming = 0.0
    total_outgoing = 0.0

    for item in transactions:
        tx_type = str(item.get("transaction_type") or "").strip()
        amount = float(item.get("amount", 0) or 0)
        if tx_type in incoming_types:
            total_incoming += amount
        elif tx_type in outgoing_types:
            total_outgoing += amount

    return TransactionStatsResponse(
        provider=provider,
        account_id=account.id,
        account_name=account.account_name,
        total_transactions=len(transactions),
        total_incoming=total_incoming,
        total_outgoing=total_outgoing,
        net_amount=total_incoming - total_outgoing,
        currency="VND",
    )


def _persist_transactions(account: HistoryAccount, db: Session, transactions: List[Dict[str, Any]]) -> None:
    if not transactions:
        return

    for item in transactions:
        transaction_id = str(item.get("transaction_id") or "")
        if not transaction_id:
            continue

        existing = (
            db.query(TransactionRecord)
            .filter(
                TransactionRecord.account_id == account.id,
                TransactionRecord.transaction_id == transaction_id,
            )
            .first()
        )
        if existing:
            continue

        db.add(
            TransactionRecord(
                account_id=account.id,
                transaction_id=transaction_id,
                transaction_type=item.get("transaction_type"),
                amount=float(item.get("amount", 0) or 0),
                currency=item.get("currency", "VND"),
                description=item.get("description"),
                status=item.get("status", "completed"),
                posted_at=item.get("posted_at") or datetime.utcnow(),
            )
        )

    account.updated_at = datetime.utcnow()
    db.add(account)
    db.commit()
    db.refresh(account)


def _load_cached_transactions(account: HistoryAccount, db: Session, limit: int) -> List[Dict[str, Any]]:
    cached_records = (
        db.query(TransactionRecord)
        .filter(TransactionRecord.account_id == account.id)
        .order_by(TransactionRecord.posted_at.desc())
        .limit(limit)
        .all()
    )

    if not cached_records:
        return []

    return [
        {
            "transaction_id": record.transaction_id,
            "transaction_type": record.transaction_type,
            "amount": float(record.amount),
            "currency": record.currency,
            "description": record.description,
            "status": record.status,
            "posted_at": record.posted_at,
            "created_at": record.created_at or record.posted_at,
        }
        for record in cached_records
    ]


def _load_transactions(
    account: HistoryAccount,
    db: Session,
    limit: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    provider = get_provider(account.provider)
    live_error: Optional[Exception] = None

    try:
        live_transactions = provider.fetch_history(
            account,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
        )
        if live_transactions:
            _persist_transactions(account, db, live_transactions)
            return live_transactions[:limit]
        db.add(account)
        db.commit()
        db.refresh(account)
    except Exception as exc:
        live_error = exc

    if account.provider != "mbbank":
        _sync_legacy_history(account, db)

    cached_transactions = _load_cached_transactions(account, db, limit)
    if cached_transactions:
        return cached_transactions

    if live_error is not None:
        raise live_error

    return []


def _parse_query_date(value: Optional[str], field_name: str) -> Optional[datetime]:
    if not value:
        return None

    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid {field_name} format (use YYYY-MM-DD)",
    )


def _get_owned_mbbank_account(account_id: int, current_user: User, db: Session) -> HistoryAccount:
    account = _get_owned_account(account_id, current_user, db)
    if account.provider != "mbbank":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tai khoan MB Bank khong tim thay")
    return account


def _to_mbbank_transaction_detail(item: Dict[str, Any], fallback_account_number: Optional[str]) -> Dict[str, Any]:
    posted_at = item.get("posted_at") or datetime.utcnow()
    transaction_date = item.get("transaction_date") or posted_at.strftime("%Y-%m-%d %H:%M:%S")
    return {
        "transaction_id": str(item.get("transaction_id")),
        "account_number": item.get("account_number") or fallback_account_number or "",
        "posting_date": item.get("posting_date"),
        "transaction_date": str(transaction_date),
        "credit_amount": float(item.get("credit_amount", 0) or 0),
        "debit_amount": float(item.get("debit_amount", 0) or 0),
        "transaction_amount": float(item.get("transaction_amount", item.get("amount", 0)) or 0),
        "transaction_type": item.get("transaction_type") or "unknown",
        "currency": item.get("currency", "VND"),
        "description": item.get("description"),
        "beneficiary_account": item.get("beneficiary_account"),
        "available_balance": item.get("available_balance"),
    }


def _build_mbbank_statistics(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    stats = {
        "total_transactions": len(transactions),
        "total_income": 0.0,
        "total_expense": 0.0,
        "net_change": 0.0,
        "transactions_by_type": {"income": 0, "expense": 0},
        "average_income": 0.0,
        "average_expense": 0.0,
        "max_income": 0.0,
        "max_expense": 0.0,
        "min_income": float("inf"),
        "min_expense": float("inf"),
        "transactions_by_date": {},
        "transactions_by_description": {},
        "transactions_by_day": {},
    }

    income_amounts: List[float] = []
    expense_amounts: List[float] = []

    for item in transactions:
        amount = float(item.get("transaction_amount", item.get("amount", 0)) or 0)
        credit_amount = float(item.get("credit_amount", 0) or 0)
        transaction_type = str(item.get("transaction_type") or "").lower()
        is_income = credit_amount > 0 or transaction_type in {"credit", "+", "in", "income"}
        bucket = "income" if is_income else "expense"

        if is_income:
            stats["total_income"] += amount
            stats["transactions_by_type"]["income"] += 1
            income_amounts.append(amount)
            stats["max_income"] = max(stats["max_income"], amount)
            stats["min_income"] = min(stats["min_income"], amount)
        else:
            stats["total_expense"] += amount
            stats["transactions_by_type"]["expense"] += 1
            expense_amounts.append(amount)
            stats["max_expense"] = max(stats["max_expense"], amount)
            stats["min_expense"] = min(stats["min_expense"], amount)

        date_key = str(item.get("transaction_date") or item.get("posted_at") or "").split()[0] or "unknown"
        stats["transactions_by_date"].setdefault(date_key, {"income": 0, "expense": 0, "count": 0})
        stats["transactions_by_date"][date_key][bucket] += amount
        stats["transactions_by_date"][date_key]["count"] += 1

        description = item.get("description") or "Khong ro noi dung"
        stats["transactions_by_description"].setdefault(description, {"count": 0, "amount": 0, "type": []})
        stats["transactions_by_description"][description]["count"] += 1
        stats["transactions_by_description"][description]["amount"] += amount
        if bucket not in stats["transactions_by_description"][description]["type"]:
            stats["transactions_by_description"][description]["type"].append(bucket)

        weekday = "Unknown"
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                weekday = datetime.strptime(date_key, fmt).strftime("%A")
                break
            except ValueError:
                continue
        stats["transactions_by_day"].setdefault(weekday, {"income": 0, "expense": 0, "count": 0})
        stats["transactions_by_day"][weekday][bucket] += amount
        stats["transactions_by_day"][weekday]["count"] += 1

    stats["net_change"] = stats["total_income"] - stats["total_expense"]
    if income_amounts:
        stats["average_income"] = sum(income_amounts) / len(income_amounts)
    if expense_amounts:
        stats["average_expense"] = sum(expense_amounts) / len(expense_amounts)
    if stats["min_income"] == float("inf"):
        stats["min_income"] = 0.0
    if stats["min_expense"] == float("inf"):
        stats["min_expense"] = 0.0

    return stats


@router.get("/providers", response_model=List[str])
async def list_supported_providers():
    return SUPPORTED_PROVIDERS


@router.get("/providers/catalog", response_model=List[ProviderDefinitionResponse])
async def get_provider_catalog_endpoint():
    catalog = get_provider_catalog()
    return [ProviderDefinitionResponse(**item) for item in catalog]


@router.get("/providers/policies/current", response_model=ProviderPoliciesResponse)
async def get_provider_policy_document():
    document = get_policy_document()
    return ProviderPoliciesResponse(
        title=document["title"],
        version=document["version"],
        consent_label=document["consent_label"],
        sections=[PolicySectionResponse(**section) for section in document["sections"]],
    )


@router.get("/banks/napas", response_model=List[NapasBankResponse])
async def get_napas_banks():
    return [
        NapasBankResponse(
            bank_code=item.get("bankCode", ""),
            bank_name=item.get("bankName", ""),
            short_bank_name=item.get("shortBankName", ""),
            white_lists=item.get("whiteLists", []) or [],
            available=bool(item.get("available", True)),
        )
        for item in load_napas_banks()
    ]


@router.post("/accounts", response_model=HistoryAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_history_account(
    payload: HistoryAccountCreate,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    provider = _resolve_provider(payload.provider)
    token = payload.token or secrets.token_urlsafe(16)

    duplicate = (
        db.query(HistoryAccount)
        .filter(
            HistoryAccount.user_id == current_user.id,
            HistoryAccount.provider == provider,
            HistoryAccount.token == token,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with the same provider and token already exists")

    account = HistoryAccount(
        user_id=current_user.id,
        provider=provider,
        token=token,
        account_name=payload.account_name,
        external_id=payload.external_id,
        login_identifier=payload.login_identifier,
        status="manual_token",
        terms_accepted=payload.accept_policies,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _build_account_response(account)


@router.post("/register-account", response_model=AccountRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_account_with_credentials(
    payload: AccountRegisterRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    provider = _resolve_provider(payload.provider)
    definition = get_provider_definition(provider)

    if not payload.accept_policies:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Policy consent is required")

    field_map = {
        "username": payload.username,
        "password": payload.password,
        "account_number": payload.account_number,
        "cookie": payload.cookie,
    }
    missing = [field for field in definition.required_fields if not field_map.get(field)]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required fields for {definition.label}: {', '.join(missing)}",
        )

    credential_payload, session_payload, status_value = build_registration_payload(
        provider,
        username=payload.username,
        password=payload.password,
        account_number=payload.account_number,
        cookie=payload.cookie,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        session_id=payload.session_id,
        device_id=payload.device_id,
        id_token=payload.id_token,
        imei=payload.imei,
        authorization=payload.authorization,
        session_key=payload.session_key,
        metadata=payload.metadata,
    )

    try:
        prepared = get_provider(provider).prepare_registration(credential_payload, session_payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khong the khoi tao ket noi {definition.label}: {str(exc)}",
        ) from exc

    credential_payload = prepared["credential_payload"]
    session_payload = prepared["session_payload"]
    status_value = prepared["status"]
    resolved_account_number = prepared.get("account_number") or payload.account_number
    resolved_account_name = prepared.get("account_name") or payload.account_name

    duplicate = (
        db.query(HistoryAccount)
        .filter(
            HistoryAccount.user_id == current_user.id,
            HistoryAccount.provider == provider,
            HistoryAccount.login_identifier == payload.username,
            HistoryAccount.external_id == resolved_account_number,
        )
        .first()
    )
    if duplicate:
        duplicate.account_name = resolved_account_name or duplicate.account_name or definition.label
        duplicate.external_id = resolved_account_number or duplicate.external_id
        duplicate.login_identifier = payload.username
        duplicate.credential_payload = encrypt_payload(credential_payload)
        duplicate.session_payload = encrypt_payload(session_payload)
        duplicate.status = status_value
        duplicate.terms_accepted = True
        duplicate.last_synced_at = datetime.utcnow()
        duplicate.updated_at = datetime.utcnow()
        db.add(duplicate)
        db.commit()
        db.refresh(duplicate)

        return AccountRegisterResponse(
            success=True,
            token=duplicate.token,
            message=f"Da cap nhat thong tin {definition.label} thanh cong",
            account_id=duplicate.id,
            provider=provider,
            provider_label=definition.label,
        )

    account = HistoryAccount(
        user_id=current_user.id,
        provider=provider,
        token=secrets.token_urlsafe(24),
        account_name=resolved_account_name or definition.label,
        external_id=resolved_account_number,
        login_identifier=payload.username,
        credential_payload=encrypt_payload(credential_payload),
        session_payload=encrypt_payload(session_payload),
        status=status_value,
        terms_accepted=True,
        last_synced_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return AccountRegisterResponse(
        success=True,
        token=account.token,
        message=f"Da luu thong tin {definition.label} thanh cong",
        account_id=account.id,
        provider=provider,
        provider_label=definition.label,
    )


@router.get("/accounts", response_model=List[HistoryAccountResponse])
async def list_history_accounts(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    accounts = (
        db.query(HistoryAccount)
        .filter(HistoryAccount.user_id == current_user.id)
        .order_by(HistoryAccount.created_at.desc())
        .all()
    )
    return [_build_account_response(account) for account in accounts]


@router.get("/accounts/{account_id}", response_model=HistoryAccountResponse)
async def get_history_account(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    return _build_account_response(_get_owned_account(account_id, current_user, db))


@router.delete("/accounts/{account_id}", response_model=AccountActionResponse)
async def delete_history_account(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)
    db.delete(account)
    db.commit()
    return AccountActionResponse(success=True, message="Linked account deleted successfully")


@router.patch("/accounts/{account_id}", response_model=HistoryAccountResponse)
async def update_history_account(
    account_id: int,
    payload: HistoryAccountUpdate,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)

    if payload.account_name is not None:
        account.account_name = payload.account_name
    if payload.external_id is not None:
        account.external_id = payload.external_id
    if payload.login_identifier is not None:
        account.login_identifier = payload.login_identifier
    if payload.status is not None:
        account.status = payload.status
    if payload.metadata is not None:
        current_session = load_session_payload(account)
        current_session["metadata"] = payload.metadata
        account.session_payload = encrypt_payload(current_session)

    account.updated_at = datetime.utcnow()
    db.add(account)
    db.commit()
    db.refresh(account)
    return _build_account_response(account)


@router.post("/accounts/{account_id}/renew", response_model=HistoryAccountResponse)
async def renew_history_account_token(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)
    if account.provider == "mbbank":
        try:
            get_provider("mbbank").fetch_balance(account)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Khong the lam moi session MB Bank: {str(exc)}",
            ) from exc
    account.token = secrets.token_urlsafe(16)
    account.last_synced_at = datetime.utcnow()
    account.updated_at = datetime.utcnow()
    db.add(account)
    db.commit()
    db.refresh(account)
    return _build_account_response(account)


@router.get("/accounts/{account_id}/transactions", response_model=TransactionHistoryResponse)
async def get_account_transactions(
    account_id: int,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)
    _ensure_owner_access(account, db)
    transactions = _load_transactions(account, db, limit)
    return _build_transaction_response(account.provider, account, transactions)


@router.get("/accounts/{account_id}/balance", response_model=BalanceResponse)
async def get_account_balance(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)
    _ensure_owner_access(account, db)
    balance_info = get_provider(account.provider).fetch_balance(account)
    db.add(account)
    db.commit()
    db.refresh(account)
    return BalanceResponse(**balance_info)


@router.get("/accounts/{account_id}/stats", response_model=TransactionStatsResponse)
async def get_account_stats(
    account_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)
    _ensure_owner_access(account, db)
    transactions = _load_transactions(account, db, limit)
    return _build_stats(account.provider, account, transactions)


@router.get("/accounts/statistics", response_model=dict)
async def get_history_statistics(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    total_accounts = db.query(HistoryAccount).filter(HistoryAccount.user_id == current_user.id).count()
    providers = (
        db.query(HistoryAccount.provider, func.count(HistoryAccount.id))
        .filter(HistoryAccount.user_id == current_user.id)
        .group_by(HistoryAccount.provider)
        .all()
    )
    return {
        "total_accounts": total_accounts,
        "accounts_per_provider": {provider: count for provider, count in providers},
    }


def _lookup_account_by_token(provider: str, token: str, db: Session) -> HistoryAccount:
    normalized_provider = _resolve_provider(provider)
    account = (
        db.query(HistoryAccount)
        .filter(HistoryAccount.provider == normalized_provider, HistoryAccount.token == token)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")
    _ensure_owner_access(account, db)
    return account


@router.get("/providers/{provider}/transactions", response_model=TransactionHistoryResponse)
async def get_provider_transactions_by_token(
    provider: str,
    token: str = Query(..., min_length=6),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    account = _lookup_account_by_token(provider, token, db)
    try:
        transactions = _load_transactions(account, db, limit)
        return _build_transaction_response(account.provider, account, transactions)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Loi lay lich su giao dich {account.provider}: {str(exc)}",
        ) from exc


@router.get("/providers/{provider}/balance", response_model=BalanceResponse)
async def get_provider_balance_by_token(
    provider: str,
    token: str = Query(..., min_length=6),
    db: Session = Depends(get_db),
):
    account = _lookup_account_by_token(provider, token, db)
    try:
        balance_info = get_provider(account.provider).fetch_balance(account)
        db.add(account)
        db.commit()
        db.refresh(account)
        return BalanceResponse(**balance_info)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Loi lay so du {account.provider}: {str(exc)}",
        ) from exc


@router.get("/providers/{provider}/stats", response_model=TransactionStatsResponse)
async def get_provider_stats_by_token(
    provider: str,
    token: str = Query(..., min_length=6),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=200),
):
    account = _lookup_account_by_token(provider, token, db)
    try:
        transactions = _load_transactions(account, db, limit)
        return _build_stats(account.provider, account, transactions)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Loi tinh thong ke {account.provider}: {str(exc)}",
        ) from exc


@router.get("/mbbank/transaction-history/{account_id}", response_model=MBBankTransactionHistoryResponse)
async def get_mbbank_transaction_history(
    account_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    check_api_access(current_user, db)
    consume_api_call(current_user, db)

    account = _get_owned_mbbank_account(account_id, current_user, db)
    parsed_start = _parse_query_date(start_date, "start_date")
    parsed_end = _parse_query_date(end_date, "end_date")

    try:
        transactions = _load_transactions(
            account,
            db,
            limit=200,
            start_date=parsed_start,
            end_date=parsed_end,
        )
        return MBBankTransactionHistoryResponse(
            status=True,
            message="Lay lich su giao dich thanh cong",
            transactions=[
                _to_mbbank_transaction_detail(item, account.external_id)
                for item in transactions
            ],
            total=len(transactions),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Loi lay lich su giao dich: {str(exc)}") from exc


@router.get("/mbbank/balance/{account_id}", response_model=MBBankBalanceResponse)
async def get_mbbank_balance(
    account_id: int,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    check_api_access(current_user, db)
    consume_api_call(current_user, db)

    account = _get_owned_mbbank_account(account_id, current_user, db)

    try:
        balance_info = get_provider("mbbank").fetch_balance(account)
        db.add(account)
        db.commit()
        db.refresh(account)
        return MBBankBalanceResponse(
            status=True,
            message="Lay so du thanh cong",
            account_number=balance_info.get("account_number") or "",
            account_name=balance_info.get("account_name") or account.account_name or "",
            available_balance=float(balance_info.get("balance", 0) or 0),
            balance=float(balance_info.get("balance", 0) or 0),
            currency=balance_info.get("currency", "VND"),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Loi lay so du tai khoan: {str(exc)}") from exc


@router.get("/mbbank/statistics/{account_id}", response_model=MBBankStatisticsResponse)
async def get_mbbank_transaction_statistics(
    account_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    check_api_access(current_user, db)
    consume_api_call(current_user, db)

    account = _get_owned_mbbank_account(account_id, current_user, db)
    parsed_start = _parse_query_date(start_date, "start_date")
    parsed_end = _parse_query_date(end_date, "end_date")

    try:
        transactions = _load_transactions(
            account,
            db,
            limit=200,
            start_date=parsed_start,
            end_date=parsed_end,
        )
        return MBBankStatisticsResponse(
            status=True,
            message="Tinh toan thong ke thanh cong",
            statistics=_build_mbbank_statistics(transactions),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Loi tinh toan thong ke: {str(exc)}") from exc
