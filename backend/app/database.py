from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.config import config

# Create database engine
engine = create_engine(
    config.DATABASE_URL,
    echo=config.DEBUG,  # Log SQL statements in development
    pool_size=10,
    max_overflow=20,
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db() -> Session:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize database (create all tables)
def init_db():
    """Initialize database - create all tables"""
    # Import all models to ensure they are registered before creating tables
    from app.models.user import User
    from app.models.bank import BankAccount, BankTransaction
    from app.models.subscription import Subscription
    from app.models.balance import UserBalance, BalanceTransaction, BankAPI, APIUsageTransaction
    from app.models.history import HistoryAccount, TransactionRecord
    from app.models.topup import TopupConfig
    from app.models.coupon import Coupon
    from app.models.invoice import Invoice
    from app.models.payment_transaction import PaymentTransaction
    
    Base.metadata.create_all(bind=engine)
    _ensure_auth_columns()
    _ensure_history_account_columns()
    _ensure_history_indexes()
    _ensure_topup_config_columns()
    _ensure_user_balances_exist()
    _ensure_admin_users_exist()

# Drop all tables (for development/testing)
def drop_db():
    """Drop all tables - USE WITH CAUTION!"""
    Base.metadata.drop_all(bind=engine)


def _ensure_auth_columns():
    """Backfill new auth columns for existing databases without migrations."""
    inspector = inspect(engine)

    if not inspector.has_table("users"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []

    if "two_factor_secret" not in existing_columns:
        statements.append(text("ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255)"))

    if "two_factor_enabled" not in existing_columns:
        statements.append(text("ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE"))

    is_admin_column = next((column for column in inspector.get_columns("users") if column["name"] == "is_admin"), None)

    if "is_admin" not in existing_columns:
        statements.append(text("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"))
    elif "BOOL" in str(is_admin_column["type"]).upper():
        statements.append(text("ALTER TABLE users ALTER COLUMN is_admin DROP DEFAULT"))
        statements.append(
            text(
                """
                ALTER TABLE users
                ALTER COLUMN is_admin TYPE INTEGER
                USING CASE WHEN is_admin THEN 1 ELSE 0 END
                """
            )
        )
        statements.append(text("ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT 0"))

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)
        connection.execute(text("UPDATE users SET two_factor_enabled = FALSE WHERE two_factor_enabled IS NULL"))
        connection.execute(text("UPDATE users SET is_admin = 0 WHERE is_admin IS NULL"))
        if "is_admin" in existing_columns or any("ADD COLUMN is_admin" in str(statement) for statement in statements):
            connection.execute(text("ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT 0"))
            connection.execute(text("ALTER TABLE users ALTER COLUMN is_admin SET NOT NULL"))


def _ensure_history_account_columns():
    """Backfill history account columns for provider credential storage."""
    inspector = inspect(engine)

    if not inspector.has_table("history_accounts"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("history_accounts")}
    statements = []

    if "login_identifier" not in existing_columns:
        statements.append(text("ALTER TABLE history_accounts ADD COLUMN login_identifier VARCHAR(255)"))

    if "credential_payload" not in existing_columns:
        statements.append(text("ALTER TABLE history_accounts ADD COLUMN credential_payload TEXT"))

    if "session_payload" not in existing_columns:
        statements.append(text("ALTER TABLE history_accounts ADD COLUMN session_payload TEXT"))

    if "terms_accepted" not in existing_columns:
        statements.append(text("ALTER TABLE history_accounts ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE"))

    if "last_synced_at" not in existing_columns:
        statements.append(text("ALTER TABLE history_accounts ADD COLUMN last_synced_at TIMESTAMP"))

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)
        connection.execute(text("UPDATE history_accounts SET terms_accepted = FALSE WHERE terms_accepted IS NULL"))


def _ensure_topup_config_columns():
    """Backfill top-up config columns without migrations."""
    inspector = inspect(engine)

    if not inspector.has_table("topup_configs"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("topup_configs")}
    statements = []

    if "qr_template" not in existing_columns:
        statements.append(text("ALTER TABLE topup_configs ADD COLUMN qr_template VARCHAR(100) DEFAULT 'print'"))

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)
        connection.execute(text("UPDATE topup_configs SET qr_template = 'print' WHERE qr_template IS NULL OR qr_template = ''"))


def _ensure_history_indexes():
    """Create missing indexes for hot history/top-up queries."""
    inspector = inspect(engine)

    statements = []

    if inspector.has_table("history_accounts"):
        statements.extend(
            [
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_history_account_provider_external
                    ON history_accounts (provider, external_id)
                    """
                ),
            ]
        )

    if inspector.has_table("transaction_records"):
        statements.extend(
            [
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_transaction_account_posted_at
                    ON transaction_records (account_id, posted_at DESC)
                    """
                ),
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_transaction_account_transaction
                    ON transaction_records (account_id, transaction_id)
                    """
                ),
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_transaction_created_at
                    ON transaction_records (created_at DESC)
                    """
                ),
            ]
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)

def _ensure_user_balances_exist():
    """Ensure all existing users have a balance record."""
    statements = [
        text("""
            INSERT INTO user_balances (user_id, balance, total_deposited, total_spent, created_at, updated_at)
            SELECT id, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM users
            WHERE id NOT IN (SELECT user_id FROM user_balances)
        """)
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)


def _ensure_admin_users_exist():
    """Make sure the instance has at least one admin account."""
    with engine.begin() as connection:
        if config.ADMIN_EMAILS:
            for email in config.ADMIN_EMAILS:
                connection.execute(
                    text("UPDATE users SET is_admin = 1 WHERE LOWER(email) = :email"),
                    {"email": email},
                )

        admin_count = connection.execute(
            text("SELECT COUNT(*) FROM users WHERE COALESCE(is_admin, 0) > 0")
        ).scalar() or 0

        if admin_count:
            return

        promoted_user_id = connection.execute(
            text(
                """
                SELECT user_id
                FROM history_accounts
                WHERE provider = :provider AND external_id = :account_number
                ORDER BY id DESC
                LIMIT 1
                """
            ),
            {
                "provider": config.TOPUP_PROVIDER,
                "account_number": config.TOPUP_ACCOUNT_NUMBER,
            },
        ).scalar()

        if promoted_user_id:
            connection.execute(
                text("UPDATE users SET is_admin = 1 WHERE id = :user_id"),
                {"user_id": promoted_user_id},
            )
            return

        fallback_user_id = connection.execute(
            text("SELECT id FROM users ORDER BY id ASC LIMIT 1")
        ).scalar()

        if fallback_user_id:
            connection.execute(
                text("UPDATE users SET is_admin = 1 WHERE id = :user_id"),
                {"user_id": fallback_user_id},
            )
