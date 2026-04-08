"""
Bank Provider Service - Business logic for bank operations
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from cryptography.fernet import Fernet

from app.models.bank import BankAccount, BankTransaction, BankType
from app.models.user import User
from app.schemas.bank import BankAccountResponse, BankTransactionListResponse


SUPPORTED_BANKS = {
    "mbbank": {
        "name": "MB Bank",
        "icon": "🏦",
        "description": "Ngân hàng Quân đội",
        "api_endpoint": "https://api.mbbank.com",
    },
    "vietcombank": {
        "name": "VietCombank",
        "icon": "🏧",
        "description": "Ngân hàng Ngoại Thương Việt Nam",
        "api_endpoint": "https://api.vietcombank.com",
    },
    "tpbank": {
        "name": "TP Bank",
        "icon": "💳",
        "description": "Ngân hàng Tiến Phong",
        "api_endpoint": "https://api.tpbank.com",
    },
    "acb": {
        "name": "ACB",
        "icon": "🏪",
        "description": "Ngân hàng Á Châu",
        "api_endpoint": "https://api.acb.com",
    },
    "seabank": {
        "name": "SeaBank",
        "icon": "⛵",
        "description": "Ngân hàng SeaBank",
        "api_endpoint": "https://api.seabank.com",
    },
    "zalopay": {
        "name": "Zalo Pay",
        "icon": "💸",
        "description": "Ví điện tử Zalo",
        "api_endpoint": "https://api.zalopay.com",
    },
    "momo": {
        "name": "Momo",
        "icon": "💰",
        "description": "Ví điện tử Momo",
        "api_endpoint": "https://api.momo.vn",
    },
    "viettel": {
        "name": "Viettel Pay",
        "icon": "📱",
        "description": "Ví điện tử Viettel",
        "api_endpoint": "https://api.viettel.com",
    },
}

# Encryption key (should be in .env)
ENCRYPTION_KEY = b'your-secret-key-here-change-in-production'


class BankService:
    """Service for bank account management"""
    
    @staticmethod
    def get_supported_banks() -> List[Dict[str, Any]]:
        """Get list of all supported banks"""
        return [
            {
                "code": code,
                **details
            }
            for code, details in SUPPORTED_BANKS.items()
        ]
    
    @staticmethod
    def encrypt_password(password: str) -> str:
        """Encrypt password using Fernet"""
        cipher = Fernet(ENCRYPTION_KEY)
        encrypted = cipher.encrypt(password.encode())
        return encrypted.decode()
    
    @staticmethod
    def decrypt_password(encrypted_password: str) -> str:
        """Decrypt password"""
        cipher = Fernet(ENCRYPTION_KEY)
        decrypted = cipher.decrypt(encrypted_password.encode())
        return decrypted.decode()
    
    @staticmethod
    def create_bank_account(
        user_id: int,
        bank_type: str,
        account_number: str,
        phone: str,
        password: str,
        account_name: str = "Unknown",
        db: Session = None,
    ) -> BankAccount:
        """Create new bank account"""
        # Encrypt password
        encrypted_password = BankService.encrypt_password(password)
        
        # Create account
        account = BankAccount(
            user_id=user_id,
            bank_type=bank_type,
            account_number=account_number,
            phone=phone,
            account_name=account_name,
            password=encrypted_password,
            last_login_at=datetime.utcnow(),
        )
        
        db.add(account)
        db.commit()
        db.refresh(account)
        return account
    
    @staticmethod
    def get_user_accounts(user_id: int, db: Session) -> List[BankAccount]:
        """Get all accounts for a user"""
        return db.query(BankAccount).filter(
            BankAccount.user_id == user_id
        ).all()
    
    @staticmethod
    def get_account_by_id(account_id: int, user_id: int, db: Session) -> Optional[BankAccount]:
        """Get specific account"""
        return db.query(BankAccount).filter(
            BankAccount.id == account_id,
            BankAccount.user_id == user_id
        ).first()
    
    @staticmethod
    def update_account_session(
        account_id: int,
        session_id: str,
        access_token: str,
        device_id: str,
        browser_id: str = None,
        db: Session = None,
    ) -> BankAccount:
        """Update account session/token info"""
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if account:
            account.session_id = session_id
            account.access_token = access_token
            account.device_id = device_id
            account.browser_id = browser_id
            account.last_login_at = datetime.utcnow()
            db.commit()
            db.refresh(account)
        return account
    
    @staticmethod
    def sync_transactions(
        account_id: int,
        transactions_data: List[Dict],
        db: Session = None,
    ) -> int:
        """Sync transactions from bank API"""
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if not account:
            return 0
        
        synced_count = 0
        for trans_data in transactions_data:
            # Check if transaction already exists
            existing = db.query(BankTransaction).filter(
                BankTransaction.bank_account_id == account_id,
                BankTransaction.transaction_id == trans_data.get('transaction_id')
            ).first()
            
            if not existing:
                transaction = BankTransaction(
                    bank_account_id=account_id,
                    transaction_id=trans_data.get('transaction_id'),
                    transaction_date=trans_data.get('transaction_date'),
                    amount=trans_data.get('amount', 0),
                    currency=trans_data.get('currency', 'VND'),
                    transaction_type=trans_data.get('transaction_type'),
                    description=trans_data.get('description'),
                    reference=trans_data.get('reference'),
                    counterparty_name=trans_data.get('counterparty_name'),
                    counterparty_account=trans_data.get('counterparty_account'),
                    counterparty_bank=trans_data.get('counterparty_bank'),
                    balance_after=trans_data.get('balance_after'),
                )
                db.add(transaction)
                synced_count += 1
        
        account.synced_at = datetime.utcnow()
        db.commit()
        return synced_count
    
    @staticmethod
    def get_transactions(
        account_id: int,
        user_id: int,
        days: int = 30,
        db: Session = None,
    ) -> List[BankTransaction]:
        """Get transactions for account"""
        since_date = datetime.utcnow() - timedelta(days=days)
        
        return db.query(BankTransaction).join(BankAccount).filter(
            BankAccount.id == account_id,
            BankAccount.user_id == user_id,
            BankTransaction.transaction_date >= since_date,
        ).order_by(BankTransaction.transaction_date.desc()).all()
    
    @staticmethod
    def get_account_statistics(
        account_id: int,
        user_id: int,
        days: int = 30,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Get account statistics"""
        transactions = BankService.get_transactions(
            account_id, user_id, days, db
        )
        
        if not transactions:
            return {
                "total_in": 0,
                "total_out": 0,
                "transaction_count": 0,
                "average_transaction": 0,
                "daily_average": 0,
                "period_days": days,
            }
        
        total_in = sum(t.amount for t in transactions if t.transaction_type == "IN")
        total_out = sum(t.amount for t in transactions if t.transaction_type == "OUT")
        
        return {
            "total_in": total_in,
            "total_out": total_out,
            "transaction_count": len(transactions),
            "average_transaction": (total_in + total_out) / len(transactions) if transactions else 0,
            "daily_average": (total_in + total_out) / days if days > 0 else 0,
            "period_days": days,
        }
    
    @staticmethod
    def delete_account(account_id: int, user_id: int, db: Session) -> bool:
        """Delete bank account"""
        account = db.query(BankAccount).filter(
            BankAccount.id == account_id,
            BankAccount.user_id == user_id
        ).first()
        
        if account:
            db.delete(account)
            db.commit()
            return True
        return False
    
    @staticmethod
    def use_api_call(account_id: int, db: Session) -> bool:
        """Record API usage"""
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if account:
            account.use_api_call()
            db.commit()
            return True
        return False
    
    @staticmethod
    def reset_daily_usage():
        """Reset daily usage (call daily via scheduler)"""
        # This should be called by APScheduler daily
        pass
    
    @staticmethod
    def reset_monthly_usage():
        """Reset monthly usage (call monthly via scheduler)"""
        # This should be called by APScheduler monthly
        pass
