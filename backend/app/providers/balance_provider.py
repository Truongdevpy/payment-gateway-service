from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.models.balance import UserBalance, BalanceTransaction, BankAPI, APIUsageTransaction
from app.models.history import HistoryAccount, TransactionRecord
from app.models.user import User
from app.providers.history_providers import PROVIDER_DEFINITIONS


class BalanceService:
    """Service for managing user balance and transactions"""

    @staticmethod
    def get_or_create_balance(user_id: int, db: Session) -> UserBalance:
        """Get user balance or create if doesn't exist"""
        balance = db.query(UserBalance).filter(UserBalance.user_id == user_id).first()
        if not balance:
            balance = UserBalance(user_id=user_id, balance=0.0)
            db.add(balance)
            db.commit()
            db.refresh(balance)
        return balance

    @staticmethod
    def get_balance(user_id: int, db: Session) -> UserBalance:
        """Get user balance"""
        return BalanceService.get_or_create_balance(user_id, db)

    @staticmethod
    def deposit_balance(
        user_id: int,
        amount: float,
        db: Session,
        payment_method: str = "demo",
        transaction_type: str = "deposit",
        description: str | None = None,
        reference_id: str | None = None,
        commit: bool = True,
    ) -> tuple[bool, str, UserBalance]:
        """Deposit balance for user"""
        try:
            balance = BalanceService.get_or_create_balance(user_id, db)
            balance.add_balance(amount)

            # Create transaction record
            transaction = BalanceTransaction(
                user_balance_id=balance.id,
                transaction_type=transaction_type,
                amount=amount,
                description=description or f"Nạp tiền qua {payment_method}",
                status="completed",
                reference_id=reference_id or f"DEP_{datetime.utcnow().timestamp()}"
            )
            db.add(transaction)

            if commit:
                db.commit()
                db.refresh(balance)
            else:
                db.flush()

            return True, "Nạp tiền thành công", balance
        except Exception as e:
            db.rollback()
            return False, f"Lỗi nạp tiền: {str(e)}", None

    @staticmethod
    def withdraw_balance(
        user_id: int,
        amount: float,
        db: Session,
        reason: str = "purchase",
        transaction_type: str = "withdraw",
        description: str | None = None,
        reference_id: str | None = None,
        commit: bool = True,
    ) -> tuple[bool, str, UserBalance]:
        """Withdraw balance from user account"""
        try:
            balance = BalanceService.get_or_create_balance(user_id, db)
            
            if not balance.subtract_balance(amount):
                return False, "Số dư không đủ", balance

            # Create transaction record
            transaction = BalanceTransaction(
                user_balance_id=balance.id,
                transaction_type=transaction_type,
                amount=amount,
                description=description or f"Thanh toán cho {reason}",
                status="completed",
                reference_id=reference_id or f"WITH_{datetime.utcnow().timestamp()}"
            )
            db.add(transaction)

            if commit:
                db.commit()
                db.refresh(balance)
            else:
                db.flush()

            return True, "Trừ tiền thành công", balance
        except Exception as e:
            db.rollback()
            return False, f"Lỗi trừ tiền: {str(e)}", None

    @staticmethod
    def get_transaction_history(
        user_id: int,
        db: Session,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        """Get user balance transaction history"""
        balance = BalanceService.get_or_create_balance(user_id, db)
        
        query = db.query(BalanceTransaction).filter(
            BalanceTransaction.user_balance_id == balance.id
        ).order_by(desc(BalanceTransaction.created_at))
        
        total = query.count()
        transactions = query.offset((page - 1) * page_size).limit(page_size).all()
        
        return {
            "total_count": total,
            "transactions": transactions,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }


class BankAPIService:
    """Service for managing bank APIs"""

    @staticmethod
    def get_all_banks(db: Session) -> list:
        """Get all available banks"""
        return db.query(BankAPI).filter(BankAPI.is_active == "active").all()

    @staticmethod
    def get_bank_by_code(bank_code: str, db: Session) -> BankAPI:
        """Get bank by code"""
        return db.query(BankAPI).filter(BankAPI.bank_code == bank_code).first()

    @staticmethod
    def create_or_update_bank(bank_data: dict, db: Session) -> BankAPI:
        """Create or update bank API"""
        bank = db.query(BankAPI).filter(BankAPI.bank_code == bank_data["bank_code"]).first()
        
        if bank:
            for key, value in bank_data.items():
                setattr(bank, key, value)
        else:
            bank = BankAPI(**bank_data)
            db.add(bank)
        
        db.commit()
        db.refresh(bank)
        return bank

    @staticmethod
    def initialize_default_banks(db: Session):
        """Initialize default banks"""
        default_banks = [
            {
                "bank_code": "MBBANK",
                "bank_name": "MB Bank",
                "bank_name_vi": "Ngân Hàng Quân Đội",
                "logo_url": "https://api.vietqr.io/img/MBBANK.png",
                "api_name": "MB Bank Open API",
                "api_version": "2.0",
                "is_active": "active",
                "base_price_per_call": 100.0,  # 100 VND per call
                "monthly_call_limit": 100000,
                "supported_operations": "login,get_balance,get_history,transfer",
                "authentication_type": "oauth2",
                "description": "MB Bank Official API for transactions"
            },
            {
                "bank_code": "VCB",
                "bank_name": "Vietcombank",
                "bank_name_vi": "Ngân Hàng Ngoại Thương Việt Nam",
                "logo_url": "https://api.vietqr.io/img/VCB.png",
                "api_name": "Vietcombank API",
                "api_version": "1.5",
                "is_active": "active",
                "base_price_per_call": 150.0,
                "monthly_call_limit": 50000,
                "supported_operations": "get_balance,get_history",
                "authentication_type": "api_key",
                "description": "Vietcombank transaction API"
            },
            {
                "bank_code": "VPB",
                "bank_name": "VPBank",
                "bank_name_vi": "Ngân Hàng Việt Phương",
                "logo_url": "https://api.vietqr.io/img/VPB.png",
                "api_name": "VPBank API",
                "api_version": "1.0",
                "is_active": "active",
                "base_price_per_call": 120.0,
                "monthly_call_limit": 75000,
                "supported_operations": "get_balance,get_history",
                "authentication_type": "oauth2",
                "description": "VPBank digital banking API"
            },
            {
                "bank_code": "ACB",
                "bank_name": "ACB",
                "bank_name_vi": "Ngân Hàng Á Châu",
                "logo_url": "https://api.vietqr.io/img/ACB.png",
                "api_name": "ACB API",
                "api_version": "2.1",
                "is_active": "active",
                "base_price_per_call": 100.0,
                "monthly_call_limit": 100000,
                "supported_operations": "login,get_balance,get_history",
                "authentication_type": "basic_auth",
                "description": "ACB Modern Banking API"
            },
        ]

        for bank_data in default_banks:
            existing = db.query(BankAPI).filter(BankAPI.bank_code == bank_data["bank_code"]).first()
            if not existing:
                bank = BankAPI(**bank_data)
                db.add(bank)
        
        db.commit()


class RevenueService:
    """Service for revenue analytics"""

    _INCOMING_TYPES = {"credit", "+", "in", "income", "transfer_in", "deposit"}
    _OUTGOING_TYPES = {"debit", "-", "out", "expense", "transfer_out", "withdraw"}

    @classmethod
    def _bank_provider_keys(cls) -> set[str]:
        return {
            key
            for key, definition in PROVIDER_DEFINITIONS.items()
            if definition.category == "bank"
        }

    @classmethod
    def _classify_transaction(cls, transaction_type: str | None) -> str:
        normalized = str(transaction_type or "").strip().lower()
        if normalized in cls._INCOMING_TYPES or "credit" in normalized:
            return "income"
        if normalized in cls._OUTGOING_TYPES or "debit" in normalized:
            return "expense"
        return "unknown"

    @classmethod
    def _build_real_bank_transaction_query(cls, db: Session, user_id: int, days: int = 0):
        provider_keys = tuple(cls._bank_provider_keys())
        if not provider_keys:
            return None

        query = (
            db.query(TransactionRecord, HistoryAccount.provider, HistoryAccount.account_name, HistoryAccount.external_id)
            .join(HistoryAccount, TransactionRecord.account_id == HistoryAccount.id)
            .filter(
                HistoryAccount.provider.in_(provider_keys),
                HistoryAccount.user_id == user_id,
            )
        )

        if days > 0:
            start_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(TransactionRecord.posted_at >= start_date)

        return query

    @classmethod
    def _serialize_revenue_row(cls, row) -> dict:
        record, provider, account_name, external_id = row
        posted_at = record.posted_at or record.created_at or datetime.utcnow()
        direction = cls._classify_transaction(record.transaction_type)
        provider_key = str(provider or "").lower()
        provider_definition = PROVIDER_DEFINITIONS.get(provider_key)
        return {
            "account_id": int(record.account_id),
            "account_name": account_name,
            "amount": abs(float(record.amount or 0)),
            "created_at": record.created_at or posted_at,
            "currency": record.currency or "VND",
            "description": record.description,
            "posted_at": posted_at,
            "direction": direction,
            "external_id": external_id,
            "id": int(record.id),
            "provider": provider_key,
            "provider_label": provider_definition.label if provider_definition else str(provider or "").upper(),
            "status": record.status or "completed",
            "transaction_id": record.transaction_id,
            "transaction_type": record.transaction_type,
        }

    @classmethod
    def _load_real_bank_transactions(cls, db: Session, user_id: int, days: int = 0) -> list[dict]:
        query = cls._build_real_bank_transaction_query(db, user_id, days)
        if query is None:
            return []

        rows = query.all()
        return [cls._serialize_revenue_row(row) for row in rows]

    @staticmethod
    def get_total_revenue(db: Session, user_id: int, days: int = 0) -> dict:
        """Get total revenue statistics"""
        transactions = RevenueService._load_real_bank_transactions(db, user_id, days)
        income_transactions = [
            item for item in transactions
            if item["direction"] == "income"
        ]
        expense_transactions = [
            item for item in transactions
            if item["direction"] == "expense"
        ]

        total_revenue = sum(item["amount"] for item in income_transactions)
        total_expense = sum(item["amount"] for item in expense_transactions)
        total_transactions = len(income_transactions) + len(expense_transactions)

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_income = [
            item for item in income_transactions
            if item["posted_at"] >= today_start
        ]
        today_expense = [
            item for item in expense_transactions
            if item["posted_at"] >= today_start
        ]
        today_revenue = sum(item["amount"] for item in today_income)
        today_expense_amount = sum(item["amount"] for item in today_expense)
        today_transactions = len(today_income) + len(today_expense)
        average_base = income_transactions + expense_transactions

        return {
            "total_revenue": total_revenue,
            "total_expense": total_expense,
            "net_revenue": total_revenue - total_expense,
            "total_transactions": total_transactions,
            "total_income_transactions": len(income_transactions),
            "total_expense_transactions": len(expense_transactions),
            "today_revenue": today_revenue,
            "today_expense": today_expense_amount,
            "today_transactions": today_transactions,
            "today_income_transactions": len(today_income),
            "today_expense_transactions": len(today_expense),
            "average_transaction_value": (
                sum(item["amount"] for item in average_base) / len(average_base)
                if average_base else 0
            ),
        }

    @staticmethod
    def get_revenue_by_bank(db: Session, user_id: int, days: int = 0) -> dict:
        """Get revenue grouped by bank"""
        revenue_by_bank = {}
        transactions_by_bank = {}

        for item in RevenueService._load_real_bank_transactions(db, user_id, days):
            provider = (item["provider"] or "unknown").upper()
            transactions_by_bank[provider] = transactions_by_bank.get(provider, 0) + 1

            if item["direction"] == "income":
                revenue_by_bank[provider] = revenue_by_bank.get(provider, 0.0) + item["amount"]

        return {
            "revenue_by_bank": revenue_by_bank,
            "transactions_by_bank": transactions_by_bank
        }

    @staticmethod
    def get_daily_revenue(db: Session, user_id: int, days: int = 30) -> list:
        """Get daily revenue trend"""
        grouped: dict[str, dict[str, float | int]] = {}

        for item in RevenueService._load_real_bank_transactions(db, user_id, days):
            if item["direction"] != "income":
                continue

            date_key = item["posted_at"].date().isoformat()
            bucket = grouped.setdefault(date_key, {"amount": 0.0, "count": 0})
            bucket["amount"] += item["amount"]
            bucket["count"] += 1

        return [
            {
                "date": date,
                "amount": float(values["amount"]),
                "count": int(values["count"]),
            }
            for date, values in sorted(grouped.items())
        ]

    @staticmethod
    def get_revenue_trends(db: Session, user_id: int, days: int = 7) -> list:
        """Get revenue trends from linked real-bank transactions."""
        grouped: dict[str, dict[str, float | int]] = {}

        for item in RevenueService._load_real_bank_transactions(db, user_id, days):
            date_key = item["posted_at"].date().isoformat()
            bucket = grouped.setdefault(
                date_key,
                {
                    "in_amount": 0.0,
                    "out_amount": 0.0,
                    "net_amount": 0.0,
                    "transaction_count": 0,
                },
            )

            if item["direction"] == "income":
                bucket["in_amount"] += item["amount"]
            elif item["direction"] == "expense":
                bucket["out_amount"] += item["amount"]

            bucket["net_amount"] = bucket["in_amount"] - bucket["out_amount"]
            bucket["transaction_count"] += 1

        return [
            {
                "date": date,
                "in_amount": float(values["in_amount"]),
                "out_amount": float(values["out_amount"]),
                "net_amount": float(values["net_amount"]),
                "transaction_count": int(values["transaction_count"]),
            }
            for date, values in sorted(grouped.items())
        ]

    @staticmethod
    def get_revenue_transactions(
        db: Session,
        user_id: int,
        days: int = 30,
        limit: int = 300,
        page: int = 1,
        page_size: int | None = None,
    ) -> dict:
        """Get recent real-bank transactions for the revenue table."""
        query = RevenueService._build_real_bank_transaction_query(db, user_id, days)
        if query is None:
            return {
                "total_count": 0,
                "page": 1,
                "page_size": 0,
                "total_pages": 0,
                "transactions": [],
            }

        effective_page_size = max(1, min(page_size or limit, 200))
        effective_page = max(1, page)

        ordered_query = query.order_by(TransactionRecord.posted_at.desc(), TransactionRecord.id.desc())
        total_count = ordered_query.count()
        total_pages = (total_count + effective_page_size - 1) // effective_page_size if total_count else 0
        offset = (effective_page - 1) * effective_page_size
        rows = ordered_query.offset(offset).limit(effective_page_size).all()

        transactions = [RevenueService._serialize_revenue_row(row) for row in rows]

        return {
            "total_count": total_count,
            "page": effective_page,
            "page_size": effective_page_size,
            "total_pages": total_pages,
            "transactions": [
                {
                    "id": item["id"],
                    "account_id": item["account_id"],
                    "account_name": item["account_name"],
                    "external_id": item["external_id"],
                    "provider": item["provider"],
                    "provider_label": item["provider_label"],
                    "transaction_id": item["transaction_id"],
                    "transaction_type": item["transaction_type"],
                    "direction": item["direction"],
                    "amount": item["amount"],
                    "currency": item["currency"],
                    "description": item["description"],
                    "status": item["status"],
                    "posted_at": item["posted_at"],
                    "created_at": item["created_at"],
                }
                for item in transactions
            ],
        }
