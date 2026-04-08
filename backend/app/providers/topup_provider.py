from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import urlencode

from sqlalchemy.orm import Session

from app.config import config
from app.models.balance import BalanceTransaction
from app.models.history import HistoryAccount, TransactionRecord
from app.models.topup import TopupConfig
from app.models.user import User
from app.providers.balance_provider import BalanceService
from app.providers.history_providers import get_provider


class TopupService:
    _INCOMING_TYPES = {"credit", "+", "in", "income", "transfer_in"}

    @classmethod
    def get_or_create_config(cls, db: Session) -> TopupConfig:
        config_row = db.query(TopupConfig).order_by(TopupConfig.id.asc()).first()
        if config_row:
            return config_row

        history_account = cls._find_history_account_by_target(
            db,
            provider=config.TOPUP_PROVIDER,
            account_number=config.TOPUP_ACCOUNT_NUMBER,
        )
        config_row = TopupConfig(
            provider=config.TOPUP_PROVIDER,
            bank_code=config.TOPUP_BANK_CODE,
            bank_name=config.TOPUP_BANK_NAME,
            qr_bank_id=config.TOPUP_QR_BANK_ID,
            qr_template=config.TOPUP_QR_TEMPLATE,
            account_number=config.TOPUP_ACCOUNT_NUMBER,
            account_name=config.TOPUP_ACCOUNT_NAME,
            history_account_id=history_account.id if history_account else None,
            transfer_content_template=config.TOPUP_CONTENT_TEMPLATE,
            is_active=True,
        )
        db.add(config_row)
        db.commit()
        db.refresh(config_row)
        return config_row

    @classmethod
    def list_source_accounts(cls, db: Session) -> list[HistoryAccount]:
        return (
            db.query(HistoryAccount)
            .order_by(HistoryAccount.provider.asc(), HistoryAccount.external_id.asc(), HistoryAccount.id.asc())
            .all()
        )

    @classmethod
    def update_config(
        cls,
        db: Session,
        *,
        provider: str,
        bank_code: str,
        bank_name: str,
        qr_bank_id: str,
        qr_template: str,
        account_number: str,
        account_name: str,
        history_account_id: int | None,
        transfer_content_template: str,
        is_active: bool,
    ) -> TopupConfig:
        if "{user_id}" not in transfer_content_template:
            raise ValueError("Mẫu nội dung chuyển khoản phải chứa {user_id}")

        config_row = cls.get_or_create_config(db)
        config_row.provider = provider.strip().lower()
        config_row.bank_code = bank_code.strip().upper()
        config_row.bank_name = bank_name.strip()
        config_row.qr_bank_id = qr_bank_id.strip()
        config_row.qr_template = qr_template.strip()
        config_row.account_number = account_number.strip()
        config_row.account_name = account_name.strip()
        config_row.history_account_id = history_account_id
        config_row.transfer_content_template = transfer_content_template.strip()
        config_row.is_active = bool(is_active)
        db.add(config_row)
        db.commit()
        db.refresh(config_row)
        return config_row

    @classmethod
    def render_transfer_content(cls, template: str, user: User) -> str:
        local_part = user.email.split("@")[0] if user.email else ""
        padded_user_id = str(user.id).zfill(6)
        return (
            template.replace("{user_id}", padded_user_id)
            .replace("{email}", local_part)
            .replace("{full_name}", user.full_name or "")
        ).strip()

    @classmethod
    def build_topup_info(cls, user: User, db: Session) -> dict:
        config_row = cls.get_or_create_config(db)
        transfer_content = cls.render_transfer_content(config_row.transfer_content_template, user)
        qr_url = cls.build_qr_image_url(
            qr_bank_id=config_row.qr_bank_id,
            qr_template=config_row.qr_template,
            account_number=config_row.account_number,
            account_name=config_row.account_name,
            transfer_content=transfer_content,
        )
        return {
            "provider": config_row.provider,
            "bank_code": config_row.bank_code,
            "bank_name": config_row.bank_name,
            "qr_bank_id": config_row.qr_bank_id,
            "qr_template": config_row.qr_template,
            "account_number": config_row.account_number,
            "account_name": config_row.account_name,
            "history_account_id": config_row.history_account_id,
            "transfer_content": transfer_content,
            "transfer_content_template": config_row.transfer_content_template,
            "qr_image_url": qr_url,
            "is_active": config_row.is_active,
        }

    @classmethod
    def build_admin_settings_payload(cls, db: Session) -> dict:
        config_row = cls.get_or_create_config(db)
        available_accounts = cls.list_source_accounts(db)
        return {
            "provider": config_row.provider,
            "bank_code": config_row.bank_code,
            "bank_name": config_row.bank_name,
            "qr_bank_id": config_row.qr_bank_id,
            "qr_template": config_row.qr_template,
            "account_number": config_row.account_number,
            "account_name": config_row.account_name,
            "history_account_id": config_row.history_account_id,
            "transfer_content_template": config_row.transfer_content_template,
            "is_active": config_row.is_active,
            "available_history_accounts": [
                {
                    "id": account.id,
                    "provider": account.provider,
                    "account_name": account.account_name,
                    "external_id": account.external_id,
                    "login_identifier": account.login_identifier,
                    "status": account.status,
                    "user_id": account.user_id,
                }
                for account in available_accounts
            ],
        }

    @classmethod
    def sync_user_topups(cls, user: User, db: Session) -> dict:
        config_row = cls.get_or_create_config(db)
        transfer_content = cls.render_transfer_content(config_row.transfer_content_template, user)

        if not config_row.is_active:
            return {
                "status": True,
                "message": "Cấu hình nạp tiền đang tắt",
                "synced_count": 0,
                "matched_transaction_ids": [],
                "transfer_content": transfer_content,
                "last_checked_at": datetime.utcnow(),
            }

        source_account = cls._resolve_source_account(config_row, db)
        if not source_account:
            return {
                "status": False,
                "message": "Chưa cấu hình tài khoản nguồn để rà soát giao dịch",
                "synced_count": 0,
                "matched_transaction_ids": [],
                "transfer_content": transfer_content,
                "last_checked_at": datetime.utcnow(),
            }

        transactions = cls._load_source_transactions(source_account, db)
        matched_transaction_ids: list[str] = []
        has_changes = False
        normalized_content = cls._normalize_text(transfer_content)

        for item in transactions:
            transaction_id = str(item.get("transaction_id") or "").strip()
            description = item.get("description") or ""
            amount = float(item.get("amount", 0) or 0)
            transaction_type = str(item.get("transaction_type") or "").strip().lower()

            if not transaction_id or amount <= 0:
                continue

            if transaction_type not in cls._INCOMING_TYPES:
                continue

            if normalized_content not in cls._normalize_text(description):
                continue

            reference_id = f"BANK_TOPUP:{transaction_id}"
            existing = (
                db.query(BalanceTransaction)
                .filter(BalanceTransaction.reference_id == reference_id)
                .first()
            )
            if existing:
                continue

            success, _, _ = BalanceService.deposit_balance(
                user.id,
                amount,
                db,
                payment_method=source_account.provider,
                transaction_type="deposit",
                description=f"Nạp tiền tự động từ {config_row.bank_name}: {description}",
                reference_id=reference_id,
                commit=False,
            )
            if not success:
                continue

            matched_transaction_ids.append(transaction_id)
            has_changes = True

        if has_changes:
            db.commit()
        else:
            db.rollback()

        return {
            "status": True,
            "message": (
                f"Đã cộng {len(matched_transaction_ids)} giao dịch nạp tiền mới"
                if matched_transaction_ids
                else "Không có giao dịch nạp tiền mới khớp nội dung"
            ),
            "synced_count": len(matched_transaction_ids),
            "matched_transaction_ids": matched_transaction_ids,
            "transfer_content": transfer_content,
            "last_checked_at": datetime.utcnow(),
        }

    @classmethod
    def build_qr_image_url(
        cls,
        *,
        qr_bank_id: str,
        qr_template: str,
        account_number: str,
        account_name: str,
        transfer_content: str,
    ) -> str:
        query = urlencode(
            {
                "addInfo": transfer_content,
                "accountName": account_name,
            }
        )
        return f"https://img.vietqr.io/image/{qr_bank_id}-{account_number}-{qr_template}.png?{query}"

    @classmethod
    def _resolve_source_account(cls, config_row: TopupConfig, db: Session) -> HistoryAccount | None:
        if config_row.history_account_id:
            account = (
                db.query(HistoryAccount)
                .filter(HistoryAccount.id == config_row.history_account_id)
                .first()
            )
            if account:
                return account

        return cls._find_history_account_by_target(
            db,
            provider=config_row.provider,
            account_number=config_row.account_number,
        )

    @classmethod
    def _find_history_account_by_target(
        cls,
        db: Session,
        *,
        provider: str,
        account_number: str,
    ) -> HistoryAccount | None:
        return (
            db.query(HistoryAccount)
            .filter(
                HistoryAccount.provider == provider.strip().lower(),
                HistoryAccount.external_id == account_number.strip(),
            )
            .order_by(HistoryAccount.id.desc())
            .first()
        )

    @classmethod
    def _load_source_transactions(cls, account: HistoryAccount, db: Session, limit: int = 150) -> list[dict]:
        provider = get_provider(account.provider)

        try:
            transactions = provider.fetch_history(account, limit=limit)
            cls._persist_transactions(account, transactions, db)
            db.commit()
            return transactions
        except Exception:
            db.rollback()
            cached = (
                db.query(TransactionRecord)
                .filter(TransactionRecord.account_id == account.id)
                .order_by(TransactionRecord.posted_at.desc())
                .limit(limit)
                .all()
            )
            return [
                {
                    "transaction_id": item.transaction_id,
                    "transaction_type": item.transaction_type,
                    "amount": float(item.amount),
                    "currency": item.currency,
                    "description": item.description,
                    "status": item.status,
                    "posted_at": item.posted_at,
                    "created_at": item.created_at or item.posted_at,
                }
                for item in cached
            ]

    @classmethod
    def _persist_transactions(cls, account: HistoryAccount, transactions: list[dict], db: Session) -> None:
        if not transactions:
            return

        for item in transactions:
            transaction_id = str(item.get("transaction_id") or "").strip()
            if not transaction_id:
                continue

            exists = (
                db.query(TransactionRecord)
                .filter(
                    TransactionRecord.account_id == account.id,
                    TransactionRecord.transaction_id == transaction_id,
                )
                .first()
            )
            if exists:
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

        account.last_synced_at = datetime.utcnow()
        db.add(account)
        db.flush()

    @staticmethod
    def _normalize_text(value: str) -> str:
        return re.sub(r"[^A-Z0-9]", "", (value or "").upper())
