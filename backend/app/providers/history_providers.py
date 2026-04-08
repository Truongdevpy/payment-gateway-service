from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import os

import requests
from cryptography.fernet import Fernet

from app.config import config
from app.providers.apimbank import MBBankAPI


POLICY_VERSION = "2026-04-06"
POLICY_TITLE = "Các điều khoản và điều kiện & Chính sách bảo mật"
POLICY_CONSENT_LABEL = "Bằng cách cung cấp thông tin đăng nhập cho API, bạn đồng ý với Chính sách bảo mật của hệ thống và cho phép API truy xuất, quản lý dữ liệu tài chính của mình."
PRIVACY_POLICY_SECTIONS = [
    {
        "title": "Chính sách bảo mật",
        "paragraphs": [
            "Chúng tôi đặt rất nhiều giá trị vào việc bảo vệ thông tin cá nhân của bạn. Chính sách quyền riêng tư này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng dịch vụ của chúng tôi.",
        ],
    },
    {
        "title": "Thu thập và sử dụng thông tin",
        "paragraphs": [
            "Khi bạn sử dụng trang web của chúng tôi hoặc tương tác với các dịch vụ của chúng tôi, chúng tôi có thể thu thập một số thông tin cá nhân nhất định từ bạn. Điều này có thể bao gồm tên, địa chỉ email, số điện thoại, địa chỉ và thông tin khác mà bạn cung cấp khi đăng ký hoặc sử dụng dịch vụ của chúng tôi.",
            "Chúng tôi có thể sử dụng thông tin cá nhân của bạn để cung cấp và duy trì dịch vụ; thông báo về những thay đổi đối với dịch vụ của chúng tôi; giải quyết vấn đề hoặc tranh chấp; theo dõi và phân tích việc sử dụng dịch vụ của chúng tôi; và nâng cao trải nghiệm người dùng.",
        ],
    },
    {
        "title": "Bảo vệ",
        "paragraphs": [
            "Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn và có các biện pháp bảo mật thích hợp để đảm bảo thông tin của bạn được giữ an toàn khi bạn truy cập trang web của chúng tôi.",
            "Tuy nhiên, không có phương thức truyền thông tin nào qua internet hoặc phương tiện điện tử là an toàn hoặc đáng tin cậy 100%. Mặc dù chúng tôi cố gắng bảo vệ thông tin cá nhân của bạn nhưng chúng tôi không thể đảm bảo tính bảo mật tuyệt đối của bất kỳ thông tin nào bạn gửi cho chúng tôi hoặc sử dụng qua các dịch vụ của chúng tôi, và bạn phải tự chịu rủi ro này.",
        ],
    },
    {
        "title": "Liên kết đến các trang web khác",
        "paragraphs": [
            "Trang web của chúng tôi có thể chứa các liên kết đến những trang web khác không do chúng tôi điều hành. Nếu bạn nhấp vào liên kết của bên thứ ba, bạn sẽ được chuyển hướng đến trang web của bên thứ ba đó.",
            "Chúng tôi khuyên bạn nên xem lại Chính sách quyền riêng tư của mọi trang web bạn truy cập vì chúng tôi không có quyền kiểm soát hoặc chịu trách nhiệm đối với các hoạt động hay nội dung về quyền riêng tư của các trang web hoặc dịch vụ bên thứ ba.",
        ],
    },
    {
        "title": "Thay đổi chính sách quyền riêng tư",
        "paragraphs": [
            "Đôi khi, chúng tôi có thể cập nhật Chính sách quyền riêng tư này mà không cần thông báo trước. Mọi thay đổi sẽ được đăng lên trang này và có hiệu lực ngay sau khi được công bố.",
            "Bằng việc tiếp tục sử dụng dịch vụ của chúng tôi sau khi những thay đổi này được đăng, bạn đồng ý với các thay đổi đó.",
        ],
    },
]


@dataclass(frozen=True)
class ProviderFieldDefinition:
    key: str
    label: str
    required: bool = False
    input_type: str = "text"
    placeholder: str = ""
    sensitive: bool = False
    help_text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "required": self.required,
            "input_type": self.input_type,
            "placeholder": self.placeholder,
            "sensitive": self.sensitive,
            "help_text": self.help_text,
        }


@dataclass(frozen=True)
class ProviderDefinition:
    key: str
    label: str
    category: str
    auth_mode: str
    description: str
    legacy_register_file: str
    legacy_history_file: str
    aliases: tuple[str, ...] = ()
    required_fields: tuple[str, ...] = ()
    fields: tuple[ProviderFieldDefinition, ...] = ()
    supports_history: bool = True
    supports_balance: bool = True
    session_refresh_hint: str = ""
    legacy_table: str = ""

    def to_metadata_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "category": self.category,
            "auth_mode": self.auth_mode,
            "description": self.description,
            "legacy_register_file": self.legacy_register_file,
            "legacy_history_file": self.legacy_history_file,
            "required_fields": list(self.required_fields),
            "fields": [field.to_dict() for field in self.fields],
            "supports_history": self.supports_history,
            "supports_balance": self.supports_balance,
            "session_refresh_hint": self.session_refresh_hint,
            "legacy_table": self.legacy_table,
        }


PROVIDER_DEFINITIONS: Dict[str, ProviderDefinition] = {
    "mbbank": ProviderDefinition(
        key="mbbank",
        label="MB Bank",
        category="bank",
        auth_mode="session",
        description="Đăng nhập bằng số điện thoại, mật khẩu và số tài khoản. Luồng PHP cũ sẽ tự đăng nhập lại bằng sessionId/deviceId khi phiên hết hạn.",
        legacy_register_file="Mbbank.php",
        legacy_history_file="HistoryMbbank.php",
        aliases=("mb", "mb bank"),
        required_fields=("username", "password", "account_number"),
        fields=(
            ProviderFieldDefinition("username", "Số điện thoại / userId", True, placeholder="Nhập số điện thoại MB Bank"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu MB Bank"),
            ProviderFieldDefinition("account_number", "Số tài khoản", True, placeholder="Nhập số tài khoản MB Bank"),
            ProviderFieldDefinition("session_id", "Session ID", False, placeholder="sessionId nếu đã có"),
            ProviderFieldDefinition("device_id", "Mã thiết bị", False, placeholder="deviceId nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ lấy captcha và đăng nhập lại nếu responseCode trả về GW200 hoặc Session invalid.",
        legacy_table="account_mbbank",
    ),
    "vcb": ProviderDefinition(
        key="vcb",
        label="Vietcombank",
        category="bank",
        auth_mode="browser-session",
        description="Đăng nhập bằng tên đăng nhập, mật khẩu và số tài khoản. Luồng cũ dùng class VietCombank với browserToken/browserId.",
        legacy_register_file="VietCombank.php",
        legacy_history_file="HistoryVietcombank.php",
        aliases=("vietcombank", "vcbank", "vietcom bank"),
        required_fields=("username", "password", "account_number"),
        fields=(
            ProviderFieldDefinition("username", "Tên đăng nhập", True, placeholder="Nhập tên đăng nhập VCB Digibank"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu Vietcombank"),
            ProviderFieldDefinition("account_number", "Số tài khoản", True, placeholder="Nhập số tài khoản Vietcombank"),
            ProviderFieldDefinition("browser_id", "Browser ID", False, placeholder="browserId nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ gọi getHistories/getAccountDetail và đăng nhập lại nếu mã trả về khác 00.",
        legacy_table="account_vcb",
    ),
    "acb": ProviderDefinition(
        key="acb",
        label="ACB",
        category="bank",
        auth_mode="refresh-token",
        description="Đăng nhập bằng tài khoản, mật khẩu và số tài khoản. Luồng cũ ưu tiên refreshToken để lấy lịch sử và số dư.",
        legacy_register_file="ACB.php",
        legacy_history_file="HistoryACB.php",
        required_fields=("username", "password", "account_number"),
        fields=(
            ProviderFieldDefinition("username", "Tài khoản / số điện thoại", True, placeholder="Nhập tài khoản ACB"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu ACB"),
            ProviderFieldDefinition("account_number", "Số tài khoản", True, placeholder="Nhập số tài khoản ACB"),
            ProviderFieldDefinition("refresh_token", "Token làm mới", False, placeholder="refreshToken nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ đăng nhập lại nếu API trả về 'Bad token; invalid JSON'.",
        legacy_table="account_acb",
    ),
    "tpbank": ProviderDefinition(
        key="tpbank",
        label="TPBank",
        category="bank",
        auth_mode="access-token",
        description="Đăng nhập bằng tài khoản, mật khẩu và số tài khoản. Có thể phát sinh captcha hoặc OTP khi đăng nhập.",
        legacy_register_file="Tpbank.php",
        legacy_history_file="HistoryTpbank.php",
        aliases=("tpb",),
        required_fields=("username", "password", "account_number"),
        fields=(
            ProviderFieldDefinition("username", "Tài khoản / số điện thoại", True, placeholder="Nhập tài khoản TPBank"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu TPBank"),
            ProviderFieldDefinition("account_number", "Số tài khoản", True, placeholder="Nhập số tài khoản TPBank"),
            ProviderFieldDefinition("device_id", "Mã thiết bị", False, placeholder="deviceId nếu đã có"),
            ProviderFieldDefinition("access_token", "Token truy cập", False, placeholder="access_token nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ đăng nhập lại nếu API trả về 401 hoặc 'Full authentication is required'.",
        legacy_table="account_tpbank",
    ),
    "seabank": ProviderDefinition(
        key="seabank",
        label="SeABank",
        category="bank",
        auth_mode="id-token",
        description="Đăng nhập bằng tài khoản, mật khẩu và số tài khoản. Luồng cũ dùng id_token và tự đăng nhập lại khi hết hạn.",
        legacy_register_file="Seabank.php",
        legacy_history_file="HistorySeabank.php",
        required_fields=("username", "password", "account_number"),
        fields=(
            ProviderFieldDefinition("username", "Tài khoản / số điện thoại", True, placeholder="Nhập tài khoản SeABank"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu SeABank"),
            ProviderFieldDefinition("account_number", "Số tài khoản", True, placeholder="Nhập số tài khoản SeABank"),
            ProviderFieldDefinition("id_token", "ID token", False, placeholder="id_token nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ đăng nhập lại nếu API trả về BANKAPI-NEXTGEN-401.",
        legacy_table="account_seabank",
    ),
    "viettel": ProviderDefinition(
        key="viettel",
        label="Viettel Money",
        category="wallet",
        auth_mode="access-refresh-token",
        description="Đăng nhập bằng số điện thoại và mật khẩu. Luồng cũ ưu tiên accessToken/refreshToken và IMEI.",
        legacy_register_file="Viettel.php",
        legacy_history_file="HistoryapiViettel.php",
        aliases=("viettelpay", "viettel money"),
        required_fields=("username", "password"),
        fields=(
            ProviderFieldDefinition("username", "Số điện thoại", True, placeholder="Nhập số điện thoại Viettel Money"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu Viettel Money"),
            ProviderFieldDefinition("access_token", "Token truy cập", False, placeholder="accessToken nếu đã có"),
            ProviderFieldDefinition("refresh_token", "Token làm mới", False, placeholder="refreshToken nếu đã có"),
            ProviderFieldDefinition("imei", "IMEI", False, placeholder="IMEI thiết bị nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ làm mới accessToken nếu status.code khác 00.",
        legacy_table="account_viettel",
    ),
    "momo": ProviderDefinition(
        key="momo",
        label="MoMo",
        category="wallet",
        auth_mode="authorization",
        description="Đăng nhập bằng số điện thoại và mật khẩu. Luồng cũ lưu authorization, refreshToken, sessionKey và auth token.",
        legacy_register_file="momo.php",
        legacy_history_file="HistoryMomo.php",
        required_fields=("username", "password"),
        fields=(
            ProviderFieldDefinition("username", "Số điện thoại", True, placeholder="Nhập số điện thoại MoMo"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu MoMo"),
            ProviderFieldDefinition("authorization", "Chuỗi xác thực", False, placeholder="AUTH_TOKEN nếu đã có"),
            ProviderFieldDefinition("refresh_token", "Token làm mới", False, placeholder="REFRESH_TOKEN nếu đã có"),
            ProviderFieldDefinition("session_key", "Khóa phiên", False, placeholder="SESSION_KEY nếu đã có"),
        ),
        session_refresh_hint="Luồng cũ sẽ tự tạo auth token mới nếu TimeLogin vượt quá 1800 giây.",
        legacy_table="cron_momo",
    ),
    "zalopay": ProviderDefinition(
        key="zalopay",
        label="ZaloPay",
        category="wallet",
        auth_mode="cookie",
        description="Luồng cũ của ZaloPay dùng cookie web để lấy lịch sử, số dư và chuyển tiền.",
        legacy_register_file="Zalopay.php",
        legacy_history_file="HistoryZalopay.php",
        aliases=("zalo pay",),
        required_fields=("username", "password"),
        fields=(
            ProviderFieldDefinition("username", "Số điện thoại", True, placeholder="Nhập số điện thoại ZaloPay"),
            ProviderFieldDefinition("password", "Mật khẩu", True, input_type="password", sensitive=True, placeholder="Nhập mật khẩu ZaloPay"),
            ProviderFieldDefinition("cookie", "Cookie", False, placeholder="Cookie web nếu đã có", sensitive=True),
        ),
        session_refresh_hint="Luồng cũ sẽ đánh dấu hết thời gian truy cập khi cookie đổi thiết bị.",
        legacy_table="account_zalopay",
    ),
    "thesieure": ProviderDefinition(
        key="thesieure",
        label="Thẻ Siêu Rẻ",
        category="payment",
        auth_mode="cookie",
        description="Luồng cũ của Thẻ Siêu Rẻ dùng cookie để crawl lịch sử giao dịch và số dư trên thesieure.com.",
        legacy_register_file="thesieure.php",
        legacy_history_file="HistoryThesieure.php",
        aliases=("tsr", "the sieure"),
        required_fields=("username",),
        fields=(
            ProviderFieldDefinition("username", "Tên tài khoản", True, placeholder="Nhập username Thẻ Siêu Rẻ"),
            ProviderFieldDefinition("cookie", "Cookie", False, placeholder="Cookie đăng nhập Thẻ Siêu Rẻ", sensitive=True),
        ),
        session_refresh_hint="Luồng cũ sẽ kiểm tra cookie còn sống hay không ở trang hồ sơ trước khi truy vấn.",
        legacy_table="account_thesieure",
    ),
    "gt1s": ProviderDefinition(
        key="gt1s",
        label="Gạch Thẻ 1S",
        category="payment",
        auth_mode="cookie",
        description="Luồng cũ của GT1S dùng cookie để truy vấn lịch sử và số dư ví.",
        legacy_register_file="gt1s.php",
        legacy_history_file="Historygt1s.php",
        aliases=("gachthe1s",),
        required_fields=("username",),
        fields=(
            ProviderFieldDefinition("username", "Tên tài khoản", True, placeholder="Nhập username GT1S"),
            ProviderFieldDefinition("cookie", "Cookie", False, placeholder="Cookie đăng nhập GT1S", sensitive=True),
        ),
        session_refresh_hint="Luồng cũ sẽ kiểm tra hồ sơ Gạch Thẻ 1S trước khi truy vấn ví hoặc chuyển tiền.",
        legacy_table="account_gt1s",
    ),
    "trumthe": ProviderDefinition(
        key="trumthe",
        label="Trùm Thẻ",
        category="payment",
        auth_mode="cookie",
        description="Luồng cũ của Trùm Thẻ dùng cookie để truy vấn lịch sử và số dư ví.",
        legacy_register_file="trumthe.php",
        legacy_history_file="HistoryTrumthe.php",
        aliases=("trum the",),
        required_fields=("username",),
        fields=(
            ProviderFieldDefinition("username", "Tên tài khoản", True, placeholder="Nhập username Trùm Thẻ"),
            ProviderFieldDefinition("cookie", "Cookie", False, placeholder="Cookie đăng nhập Trùm Thẻ", sensitive=True),
        ),
        session_refresh_hint="Luồng cũ sẽ kiểm tra hồ sơ trumthe.vn trước khi truy vấn ví hoặc chuyển tiền.",
        legacy_table="account_trumthe",
    ),
}

SUPPORTED_PROVIDERS = list(PROVIDER_DEFINITIONS.keys())

PROVIDER_ALIASES = {
    alias: definition.key
    for definition in PROVIDER_DEFINITIONS.values()
    for alias in (definition.key, *definition.aliases)
}


def normalize_provider_name(provider_name: str) -> str:
    normalized = provider_name.strip().lower().replace("_", "").replace("-", "").replace(" ", "")
    alias_map = {
        alias.replace("_", "").replace("-", "").replace(" ", ""): key
        for alias, key in PROVIDER_ALIASES.items()
    }
    if normalized not in alias_map:
        raise ValueError(f"Unsupported history provider '{provider_name}'")
    return alias_map[normalized]


def get_provider_definition(provider_name: str) -> ProviderDefinition:
    return PROVIDER_DEFINITIONS[normalize_provider_name(provider_name)]


def get_provider_catalog() -> List[Dict[str, Any]]:
    return [definition.to_metadata_dict() for definition in PROVIDER_DEFINITIONS.values()]


def get_policy_document() -> Dict[str, Any]:
    return {
        "title": POLICY_TITLE,
        "version": POLICY_VERSION,
        "consent_label": POLICY_CONSENT_LABEL,
        "sections": PRIVACY_POLICY_SECTIONS,
    }


def _legacy_root() -> Path:
    return Path(__file__).resolve().parents[5] / "CODE THUÊ API BANK" / "assets" / "ajaxs"


def load_napas_banks() -> List[Dict[str, Any]]:
    file_path = _legacy_root() / "list_bank.json"
    if not file_path.exists():
        return []

    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    return payload.get("napasBanks", [])


def _get_fernet() -> Optional[Fernet]:
    key = config.ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode()

    try:
        return Fernet(key)
    except Exception:
        return None


def encrypt_payload(payload: Dict[str, Any]) -> Optional[str]:
    if not payload:
        return None

    raw = json.dumps(payload, ensure_ascii=False)
    fernet = _get_fernet()
    if not fernet:
        return raw

    return fernet.encrypt(raw.encode()).decode()


def decrypt_payload(payload: Optional[str]) -> Dict[str, Any]:
    if not payload:
        return {}

    fernet = _get_fernet()
    if fernet:
        try:
            return json.loads(fernet.decrypt(payload.encode()).decode())
        except Exception:
            pass

    try:
        return json.loads(payload)
    except Exception:
        return {}


def build_account_status(
    provider_name: str,
    credential_payload: Dict[str, Any],
    session_payload: Optional[Dict[str, Any]] = None,
) -> str:
    definition = get_provider_definition(provider_name)
    session_payload = session_payload or {}

    if any(session_payload.get(key) for key in ("access_token", "refresh_token", "session_id", "device_id", "id_token", "cookie")):
        return "linked"

    if any(credential_payload.get(key) for key in ("cookie", "access_token", "refresh_token", "session_id", "device_id", "id_token")):
        return "linked"

    if all(credential_payload.get(field) for field in definition.required_fields if field != "cookie"):
        return "credentials_saved"

    return "pending"


def build_registration_payload(
    provider_name: str,
    *,
    username: Optional[str],
    password: Optional[str],
    account_number: Optional[str],
    cookie: Optional[str],
    access_token: Optional[str],
    refresh_token: Optional[str],
    session_id: Optional[str],
    device_id: Optional[str],
    id_token: Optional[str],
    imei: Optional[str],
    authorization: Optional[str],
    session_key: Optional[str],
    metadata: Optional[Dict[str, Any]] = None,
) -> tuple[Dict[str, Any], Dict[str, Any], str]:
    definition = get_provider_definition(provider_name)
    metadata = dict(metadata or {})

    credential_payload = {
        "username": username,
        "password": password,
        "account_number": account_number,
        "cookie": cookie,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "session_id": session_id,
        "device_id": device_id,
        "id_token": id_token,
        "imei": imei,
        "authorization": authorization,
        "session_key": session_key,
    }
    credential_payload = {key: value for key, value in credential_payload.items() if value not in (None, "")}

    session_payload = {
        "auth_mode": definition.auth_mode,
        "legacy_register_file": definition.legacy_register_file,
        "legacy_history_file": definition.legacy_history_file,
        "legacy_table": definition.legacy_table,
        "latest_balance": float(metadata.pop("latest_balance", 0) or 0),
        "currency": metadata.pop("currency", "VND"),
        "cached_transactions": metadata.pop("cached_transactions", []),
        "created_from": "fastapi-migration",
        "created_at": datetime.utcnow().isoformat(),
    }
    session_payload = {
        key: value
        for key, value in session_payload.items()
        if value not in (None, "", [])
    }

    status = build_account_status(provider_name, credential_payload, session_payload)
    return credential_payload, session_payload, status


def load_session_payload(account: Any) -> Dict[str, Any]:
    return decrypt_payload(getattr(account, "session_payload", None))


def load_credential_payload(account: Any) -> Dict[str, Any]:
    return decrypt_payload(getattr(account, "credential_payload", None))


def _safe_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value

    if not value:
        return datetime.utcnow()

    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(str(value), fmt)
        except ValueError:
            continue

    return datetime.utcnow()


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, ""):
            return default
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return default


class HistoryProvider:
    """Base history provider interface."""

    definition: ProviderDefinition

    def __init__(self, definition: ProviderDefinition):
        self.definition = definition

    def get_account_details(self, account: Any) -> Dict[str, Any]:
        return {
            "provider": account.provider,
            "account_id": account.id,
            "account_name": account.account_name or self.definition.label,
            "account_number": account.external_id,
            "status": account.status,
        }

    def prepare_registration(
        self,
        credential_payload: Dict[str, Any],
        session_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            "credential_payload": credential_payload,
            "session_payload": session_payload,
            "status": build_account_status(self.definition.key, credential_payload, session_payload),
            "account_name": None,
            "account_number": credential_payload.get("account_number"),
        }

    def fetch_history(
        self,
        account: Any,
        limit: int = 50,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        session_payload = load_session_payload(account)
        cached_transactions = session_payload.get("cached_transactions") or []
        transactions: List[Dict[str, Any]] = []

        for item in cached_transactions[:limit]:
            amount = float(item.get("amount", 0) or 0)
            transaction_type = item.get("transaction_type") or item.get("type") or "unknown"
            transactions.append(
                {
                    "transaction_id": str(item.get("transaction_id") or item.get("tranid") or item.get("trans_id") or f"{account.provider.upper()}-{account.id}"),
                    "transaction_type": transaction_type,
                    "amount": amount,
                    "currency": item.get("currency", session_payload.get("currency", "VND")),
                    "description": item.get("description") or item.get("comment") or item.get("message"),
                    "status": item.get("status", "completed"),
                    "posted_at": _safe_datetime(item.get("posted_at") or item.get("transaction_date") or item.get("ngay_tao")),
                    "created_at": _safe_datetime(item.get("created_at") or item.get("posted_at") or item.get("transaction_date") or item.get("ngay_tao")),
                }
            )

        return transactions

    def fetch_balance(self, account: Any) -> Dict[str, Any]:
        session_payload = load_session_payload(account)
        return {
            "provider": account.provider,
            "account_id": account.id,
            "account_name": account.account_name or self.definition.label,
            "account_number": account.external_id,
            "balance": float(session_payload.get("latest_balance", 0) or 0),
            "currency": session_payload.get("currency", "VND"),
        }


class MBBankHistoryProvider(HistoryProvider):
    _SESSION_ERROR_CODES = {"GW200", "GW201", "GW401", "401"}
    _SESSION_TTL_SECONDS = int(os.getenv("MBBANK_SESSION_TTL_SECONDS", "110"))

    def prepare_registration(
        self,
        credential_payload: Dict[str, Any],
        session_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        username = credential_payload.get("username")
        password = credential_payload.get("password")

        if not username or not password:
            return super().prepare_registration(credential_payload, session_payload)

        api = MBBankAPI.auto_login(username=username, password=password)
        session_payload = dict(session_payload)
        self._apply_session_payload(account=None, session_payload=session_payload, session_info=api.export_session())

        accounts = api.get_accounts()
        requested_account_number = credential_payload.get("account_number")
        selected_account = self._select_account(accounts, requested_account_number)
        if requested_account_number and selected_account and selected_account.get("account_no") != requested_account_number:
            raise RuntimeError(f"Khong tim thay so tai khoan MB Bank {requested_account_number} trong danh sach dang lien ket")
        if selected_account:
            credential_payload = dict(credential_payload)
            credential_payload["account_number"] = selected_account.get("account_no")
            session_payload["latest_balance"] = _safe_float(selected_account.get("balance"))
            session_payload["currency"] = selected_account.get("currency") or session_payload.get("currency", "VND")

        return {
            "credential_payload": credential_payload,
            "session_payload": session_payload,
            "status": "linked",
            "account_name": selected_account.get("account_name") if selected_account else None,
            "account_number": selected_account.get("account_no") if selected_account else credential_payload.get("account_number"),
        }

    def fetch_history(
        self,
        account: Any,
        limit: int = 50,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        credentials = load_credential_payload(account)
        # Prime the MB session with a balance request first. In practice, MB's
        # transaction-history endpoint can still return GW200 right after login
        # until one account-scoped request has succeeded.
        balance_info = self.fetch_balance(account)
        account_number = (
            balance_info.get("account_number")
            or account.external_id
            or credentials.get("account_number")
        )

        if not account_number:
            raise RuntimeError("MBBank account number is missing")

        end_at = end_date or datetime.utcnow()
        start_at = start_date or (end_at - timedelta(days=30))
        response = self._call_api(
            account,
            lambda api: api.get_transactions(
                account_no=account_number,
                from_date=start_at.strftime("%d/%m/%Y"),
                to_date=end_at.strftime("%d/%m/%Y"),
            ),
        )

        result = response.get("result", {})
        if not result.get("ok"):
            raise RuntimeError(f"MBBank history failed ({result.get('responseCode')}): {result.get('message')}")

        raw_transactions = response.get("transactionHistoryList") or response.get("notificationBusinessList") or []
        transactions = [
            parsed
            for parsed in (self._parse_transaction(item, account_number) for item in raw_transactions)
            if parsed is not None
        ]
        transactions.sort(key=lambda item: item["posted_at"], reverse=True)

        session_payload = load_session_payload(account)
        session_payload["cached_transactions"] = [self._serialize_transaction(item) for item in transactions[:100]]
        account.session_payload = encrypt_payload(session_payload)
        account.status = "linked"
        account.last_synced_at = datetime.utcnow()
        if not account.external_id:
            account.external_id = account_number

        return transactions[:limit]

    def fetch_balance(self, account: Any) -> Dict[str, Any]:
        response = self._call_api(account, lambda api: api.get_balance())
        result = response.get("result", {})
        if not result.get("ok"):
            raise RuntimeError(f"MBBank balance failed ({result.get('responseCode')}): {result.get('message')}")

        accounts = self._extract_accounts(response)
        credentials = load_credential_payload(account)
        selected_account = self._select_account(accounts, account.external_id or credentials.get("account_number"))
        if not selected_account and accounts:
            selected_account = accounts[0]

        session_payload = load_session_payload(account)
        if selected_account:
            account.external_id = selected_account.get("account_no") or account.external_id
            account.account_name = selected_account.get("account_name") or account.account_name
            session_payload["latest_balance"] = _safe_float(selected_account.get("balance"))
            session_payload["currency"] = selected_account.get("currency") or session_payload.get("currency", "VND")

        account.session_payload = encrypt_payload(session_payload)
        account.status = "linked"
        account.last_synced_at = datetime.utcnow()

        return {
            "provider": account.provider,
            "account_id": account.id,
            "account_name": account.account_name or self.definition.label,
            "account_number": account.external_id,
            "balance": _safe_float(session_payload.get("latest_balance", 0)),
            "currency": session_payload.get("currency", "VND"),
        }

    def _call_api(self, account: Any, request_fn) -> Dict[str, Any]:
        api = self._build_api(account)
        response = request_fn(api)

        if self._needs_relogin(response):
            api = self._build_api(account, force_login=True)
            response = request_fn(api)

        if api.session_info:
            session_payload = load_session_payload(account)
            self._apply_session_payload(account=account, session_payload=session_payload, session_info=api.export_session())

        return response

    def _build_api(self, account: Any, force_login: bool = False) -> MBBankAPI:
        credentials = load_credential_payload(account)
        session_payload = load_session_payload(account)
        raw_credential_payload = getattr(account, "credential_payload", None)
        raw_session_payload = getattr(account, "session_payload", None)
        username = account.login_identifier or credentials.get("username")
        password = credentials.get("password")
        session_id = session_payload.get("session_id") or credentials.get("session_id")
        device_id = session_payload.get("device_id") or credentials.get("device_id")
        credentials_unreadable = self._looks_encrypted(raw_credential_payload) and not credentials
        session_unreadable = self._looks_encrypted(raw_session_payload) and not session_payload
        session_expired = self._session_is_expired(session_payload)

        if force_login or session_expired or not session_id or not device_id:
            if credentials_unreadable or session_unreadable:
                raise RuntimeError(
                    "Stored MBBank credentials/session can no longer be decrypted. "
                    "Set a stable ENCRYPTION_KEY and relink the account."
                )
            if not username or not password:
                raise RuntimeError("MBBank credentials are missing and session could not be refreshed")
            api = MBBankAPI.auto_login(username=username, password=password)
            self._apply_session_payload(account=account, session_payload=session_payload, session_info=api.export_session())
            return api

        api = MBBankAPI.from_session(username=username, session_id=session_id, device_id=device_id)
        api.password = password
        return api

    def _needs_relogin(self, response: Dict[str, Any]) -> bool:
        result = response.get("result") or {}
        response_code = str(result.get("responseCode") or "")
        message = str(result.get("message") or "").lower()
        return response_code in self._SESSION_ERROR_CODES or ("session" in message and ("invalid" in message or "expired" in message))

    def _apply_session_payload(
        self,
        account: Any,
        session_payload: Dict[str, Any],
        session_info: Dict[str, str],
    ) -> None:
        session_payload["session_id"] = session_info.get("session_id")
        session_payload["device_id"] = session_info.get("device_id")
        session_payload["last_login_at"] = datetime.utcnow().isoformat()
        if account is not None:
            account.session_payload = encrypt_payload(session_payload)
            account.status = "linked"
            account.last_synced_at = datetime.utcnow()

    def _looks_encrypted(self, payload: Any) -> bool:
        return isinstance(payload, str) and payload.startswith("gAAAA")

    def _session_is_expired(self, session_payload: Dict[str, Any]) -> bool:
        last_login_at = session_payload.get("last_login_at")
        if not last_login_at:
            return True

        try:
            normalized = str(last_login_at).replace("Z", "+00:00")
            last_login_dt = datetime.fromisoformat(normalized)
            if last_login_dt.tzinfo is not None:
                last_login_dt = last_login_dt.astimezone().replace(tzinfo=None)
        except ValueError:
            return True

        age_seconds = (datetime.utcnow() - last_login_dt).total_seconds()
        return age_seconds >= self._SESSION_TTL_SECONDS

    def _extract_accounts(self, balance_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        accounts: List[Dict[str, Any]] = []
        for source_key in ("acct_list", "internationalAcctList"):
            for item in balance_payload.get(source_key, []) or []:
                accounts.append(
                    {
                        "account_no": item.get("acctNo"),
                        "account_name": item.get("acctNm"),
                        "currency": item.get("ccyCd"),
                        "balance": item.get("currentBalance"),
                        "type": item.get("acctTypCd"),
                    }
                )
        return accounts

    def _select_account(self, accounts: List[Dict[str, Any]], account_number: Optional[str]) -> Optional[Dict[str, Any]]:
        if account_number:
            normalized = str(account_number).strip()
            for item in accounts:
                if str(item.get("account_no") or "").strip() == normalized:
                    return item
        return accounts[0] if accounts else None

    def _parse_transaction(self, item: Dict[str, Any], account_number: str) -> Optional[Dict[str, Any]]:
        ref_no = item.get("refNo") or item.get("transactionId") or item.get("notiId")
        if not ref_no:
            return None

        if "body" in item and not item.get("creditAmount") and not item.get("debitAmount"):
            return self._parse_notification_transaction(item, account_number)

        credit_amount = _safe_float(item.get("creditAmount"))
        debit_amount = _safe_float(item.get("debitAmount"))
        transaction_amount = credit_amount or debit_amount
        posted_at = _safe_datetime(item.get("transactionDate") or item.get("postingDate"))

        return {
            "transaction_id": str(ref_no),
            "transaction_type": "credit" if credit_amount > 0 else "debit",
            "amount": transaction_amount,
            "currency": item.get("currency", "VND"),
            "description": item.get("description") or item.get("remark") or "",
            "status": "completed",
            "posted_at": posted_at,
            "created_at": posted_at,
            "account_number": item.get("accountNo") or account_number,
            "posting_date": item.get("postingDate"),
            "transaction_date": item.get("transactionDate") or item.get("postingDate"),
            "credit_amount": credit_amount,
            "debit_amount": debit_amount,
            "transaction_amount": transaction_amount,
            "beneficiary_account": item.get("beneficiaryAccount"),
            "available_balance": _safe_float(item.get("availableBalance"), default=0.0) if item.get("availableBalance") not in (None, "") else None,
        }

    def _parse_notification_transaction(self, item: Dict[str, Any], account_number: str) -> Optional[Dict[str, Any]]:
        body = str(item.get("body") or "")
        parts = [part.strip() for part in body.split("|") if part.strip()]
        amount = 0.0
        transaction_type = "credit"

        if len(parts) >= 2:
            raw_amount = parts[1].split()[0].replace(",", "").replace(".", "")
            if raw_amount.startswith("-"):
                transaction_type = "debit"
            amount = _safe_float(raw_amount.lstrip("+-"))

        posted_at = _safe_datetime(item.get("transactionDate") or item.get("createdDate"))
        return {
            "transaction_id": str(item.get("notiId")),
            "transaction_type": transaction_type,
            "amount": amount,
            "currency": "VND",
            "description": parts[-1] if parts else body,
            "status": "completed",
            "posted_at": posted_at,
            "created_at": posted_at,
            "account_number": account_number,
            "posting_date": item.get("transactionDate"),
            "transaction_date": item.get("transactionDate"),
            "credit_amount": amount if transaction_type == "credit" else 0.0,
            "debit_amount": amount if transaction_type == "debit" else 0.0,
            "transaction_amount": amount,
            "beneficiary_account": None,
            "available_balance": None,
        }

    def _serialize_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        serialized = dict(transaction)
        for field in ("posted_at", "created_at"):
            if isinstance(serialized.get(field), datetime):
                serialized[field] = serialized[field].isoformat()
        return serialized


_provider_registry = {
    provider: (MBBankHistoryProvider(definition) if provider == "mbbank" else HistoryProvider(definition))
    for provider, definition in PROVIDER_DEFINITIONS.items()
}


def get_provider(provider_name: str) -> HistoryProvider:
    normalized = normalize_provider_name(provider_name)
    return _provider_registry[normalized]


class TransactionService:
    """Service to handle transaction history from MB Bank."""

    def __init__(self):
        self.session = requests.Session()
        self.timeout = 30
        self.base_url = "https://api.mbbank.com.vn"

    def get_transaction_history(
        self,
        phone: str,
        session_id: str,
        device_id: str,
        account_number: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        try:
            if not end_date:
                end_date = datetime.now()
            if not start_date:
                start_date = end_date - timedelta(days=30)

            payload = {
                "userId": phone,
                "sessionId": session_id,
                "deviceId": device_id,
                "accountNumber": account_number,
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
            }

            response = self.session.post(
                f"{self.base_url}/api/account/history",
                json=payload,
                timeout=self.timeout,
                headers=self._get_headers(),
            )
            response.raise_for_status()
            return self._parse_transaction_history(response.json())
        except Exception as exc:
            raise Exception(f"Failed to get transaction history: {str(exc)}") from exc

    def get_account_balance(
        self,
        phone: str,
        session_id: str,
        device_id: str,
        account_number: str,
    ) -> Dict[str, Any]:
        try:
            payload = {
                "userId": phone,
                "sessionId": session_id,
                "deviceId": device_id,
                "accountNumber": account_number,
            }

            response = self.session.post(
                f"{self.base_url}/api/account/balance",
                json=payload,
                timeout=self.timeout,
                headers=self._get_headers(),
            )
            response.raise_for_status()
            return self._parse_balance(response.json())
        except Exception as exc:
            raise Exception(f"Failed to get account balance: {str(exc)}") from exc

    def _parse_transaction_history(self, response: Dict[str, Any]) -> Dict[str, Any]:
        transactions = []
        transaction_list = response.get("transactionHistoryList", [])
        if not transaction_list:
            transaction_list = response.get("notificationBusinessList", [])

        for transaction in transaction_list:
            parsed_transaction = self._parse_single_transaction(transaction)
            if parsed_transaction:
                transactions.append(parsed_transaction)

        return {
            "status": True,
            "message": "Lay lich su giao dich thanh cong",
            "transactions": transactions,
            "total": len(transactions),
        }

    def _parse_single_transaction(self, transaction: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            if "refNo" in transaction:
                credit_amount = float(transaction.get("creditAmount", 0) or 0)
                debit_amount = float(transaction.get("debitAmount", 0) or 0)
                return {
                    "transactionId": transaction.get("refNo"),
                    "accountNumber": transaction.get("accountNo"),
                    "postingDate": transaction.get("postingDate"),
                    "transactionDate": transaction.get("transactionDate"),
                    "creditAmount": credit_amount,
                    "debitAmount": debit_amount,
                    "transactionAmount": credit_amount or debit_amount,
                    "transactionType": "+" if credit_amount > 0 else "-",
                    "currency": transaction.get("currency", "VND"),
                    "description": transaction.get("description", ""),
                    "beneficiaryAccount": transaction.get("beneficiaryAccount"),
                    "availableBalance": float(transaction.get("availableBalance", 0) or 0),
                }

            if "body" in transaction:
                return self._parse_notification_transaction(transaction)

            return None
        except Exception:
            return None

    def _parse_notification_transaction(self, transaction: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            text = transaction.get("body", "")
            parts = text.split("|")
            if len(parts) < 3:
                return None

            account_no = parts[0].split("TK ")[-1].strip() if "TK " in parts[0] else ""
            info_parts = parts[1].strip().split()

            if len(info_parts) >= 2:
                amount_str = info_parts[0].replace(",", "")
                transaction_type = amount_str[0]
                transaction_amount = float(amount_str[1:].replace(".", ""))
            else:
                transaction_type = "+"
                transaction_amount = 0.0

            time_str = " ".join(info_parts[1:]) if len(info_parts) > 1 else ""
            balance_text = text.split("SD:")[-1].split("VND")[0].strip() if "SD:" in text else ""
            balance = float(balance_text.replace(",", "")) if balance_text else 0.0

            return {
                "transactionId": transaction.get("notiId"),
                "accountNumber": account_no,
                "postingDate": None,
                "transactionDate": time_str,
                "creditAmount": transaction_amount if transaction_type == "+" else 0.0,
                "debitAmount": transaction_amount if transaction_type == "-" else 0.0,
                "transactionAmount": transaction_amount,
                "transactionType": transaction_type,
                "currency": "VND",
                "description": parts[-1].strip() if len(parts) > 2 else "",
                "beneficiaryAccount": None,
                "availableBalance": balance,
            }
        except Exception:
            return None

    def _parse_balance(self, response: Dict[str, Any]) -> Dict[str, Any]:
        balance_data = response.get("accountBalance", {})
        return {
            "status": True,
            "message": "Lay so du thanh cong",
            "accountNumber": balance_data.get("accountNo"),
            "accountName": balance_data.get("accountName"),
            "availableBalance": float(balance_data.get("availableBalance", 0) or 0),
            "balance": float(balance_data.get("balance", 0) or 0),
            "currency": balance_data.get("currency", "VND"),
        }

    def calculate_statistics(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        stats = {
            "totalTransactions": len(transactions),
            "totalIncome": 0.0,
            "totalExpense": 0.0,
            "netChange": 0.0,
            "transactionsByType": {"income": 0, "expense": 0},
            "averageIncome": 0.0,
            "averageExpense": 0.0,
            "maxIncome": 0.0,
            "maxExpense": 0.0,
            "minIncome": float("inf"),
            "minExpense": float("inf"),
            "transactionsByDate": {},
            "transactionsByDescription": {},
            "transactionsByDay": {},
        }

        income_amounts: List[float] = []
        expense_amounts: List[float] = []

        for transaction in transactions:
            amount = float(transaction.get("transactionAmount", 0) or 0)
            transaction_type = transaction.get("transactionType")

            if transaction_type == "+":
                stats["totalIncome"] += amount
                stats["transactionsByType"]["income"] += 1
                income_amounts.append(amount)
                stats["maxIncome"] = max(stats["maxIncome"], amount)
                stats["minIncome"] = min(stats["minIncome"], amount)
            else:
                stats["totalExpense"] += amount
                stats["transactionsByType"]["expense"] += 1
                expense_amounts.append(amount)
                stats["maxExpense"] = max(stats["maxExpense"], amount)
                stats["minExpense"] = min(stats["minExpense"], amount)

            stats["netChange"] = stats["totalIncome"] - stats["totalExpense"]

            date_key = str(transaction.get("transactionDate") or "").split()[0] or "unknown"
            stats["transactionsByDate"].setdefault(date_key, {"income": 0, "expense": 0, "count": 0})
            if transaction_type == "+":
                stats["transactionsByDate"][date_key]["income"] += amount
            else:
                stats["transactionsByDate"][date_key]["expense"] += amount
            stats["transactionsByDate"][date_key]["count"] += 1

            description = transaction.get("description") or "Khong ro noi dung"
            stats["transactionsByDescription"].setdefault(description, {"count": 0, "amount": 0, "type": []})
            stats["transactionsByDescription"][description]["count"] += 1
            stats["transactionsByDescription"][description]["amount"] += amount
            if transaction_type not in stats["transactionsByDescription"][description]["type"]:
                stats["transactionsByDescription"][description]["type"].append(transaction_type)

            raw_date = str(transaction.get("transactionDate") or "").split()[0]
            weekday = "Unknown"
            if raw_date:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                    try:
                        weekday = datetime.strptime(raw_date, fmt).strftime("%A")
                        break
                    except ValueError:
                        continue
            stats["transactionsByDay"].setdefault(weekday, {"income": 0, "expense": 0, "count": 0})
            if transaction_type == "+":
                stats["transactionsByDay"][weekday]["income"] += amount
            else:
                stats["transactionsByDay"][weekday]["expense"] += amount
            stats["transactionsByDay"][weekday]["count"] += 1

        if income_amounts:
            stats["averageIncome"] = sum(income_amounts) / len(income_amounts)
        if expense_amounts:
            stats["averageExpense"] = sum(expense_amounts) / len(expense_amounts)

        if stats["minIncome"] == float("inf"):
            stats["minIncome"] = 0.0
        if stats["minExpense"] == float("inf"):
            stats["minExpense"] = 0.0

        return stats

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json",
        }
