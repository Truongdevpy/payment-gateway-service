import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

BASE_URL = "https://online.mbbank.com.vn"
WASM_URL = f"{BASE_URL}/assets/wasm/main.wasm"
SCRIPT_DIR = Path(__file__).parent
WASM_CACHE = SCRIPT_DIR / "main.wasm"
DEVICE_CACHE = SCRIPT_DIR / "mb_device.json"
OCR_MODEL_PATH = Path(os.getenv("MB_CAPTCHA_MODEL_PATH", SCRIPT_DIR / "model.onnx"))
RUN_WASM_JS_PATH = SCRIPT_DIR / "run_wasm.js"
AUTHORIZATION = "Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm"
DEFAULT_TIMEOUT = 30
FPR = "c7a1beebb9400375bb187daa33de9659"
OCR_CHARSET = sorted(
    [str(i) for i in range(10)]
    + [chr(i) for i in range(97, 123)]
    + [chr(i) for i in range(65, 91)]
)
_OCR_SESSION = None

DEFAULT_HEADERS = {
    "Cache-Control": "max-age=0",
    "Accept": "application/json, text/plain, */*",
    "Authorization": AUTHORIZATION,
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/134.0.0.0 Safari/537.36"
    ),
    "Origin": BASE_URL,
    "Referer": f"{BASE_URL}/pl/login?returnUrl=%2F",
    "Content-Type": "application/json; charset=UTF-8",
    "app": "MB_WEB",
    "elastic-apm-traceparent": "00-55b950e3fcabc785fa6db4d7deb5ef73-8dbd60b04eda2f34-01",
    "Sec-Ch-Ua": '"Not.A/Brand";v="8", "Chromium";v="134", "Google Chrome";v="134"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}


@dataclass
class MBBankSession:
    username: str
    session_id: str
    device_id: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


def _new_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    return session


def _time_now_short() -> str:
    now = datetime.now()
    millis = str(now.microsecond // 1000)
    return now.strftime("%Y%m%d%H%M%S") + millis[:-1]


def _time_now_long() -> str:
    now = datetime.now()
    millis = str(now.microsecond // 1000).zfill(3)
    return now.strftime("%Y%m%d%H%M%S") + millis


def _generate_device_id() -> str:
    return "s1rmi184-mbib-0000-0000-" + _time_now_short()


def _md5(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


def _load_device_id(username: str) -> str:
    if DEVICE_CACHE.exists():
        try:
            data = json.loads(DEVICE_CACHE.read_text(encoding="utf-8"))
            if username in data:
                return data[username]
        except Exception:
            pass

    device_id = _generate_device_id()
    _save_device_id(username, device_id)
    return device_id


def _save_device_id(username: str, device_id: str) -> None:
    data: dict[str, str] = {}
    if DEVICE_CACHE.exists():
        try:
            data = json.loads(DEVICE_CACHE.read_text(encoding="utf-8"))
        except Exception:
            pass
    data[username] = device_id
    DEVICE_CACHE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _download_wasm() -> bytes:
    if WASM_CACHE.exists():
        return WASM_CACHE.read_bytes()

    with _new_session() as session:
        response = session.get(WASM_URL, headers=DEFAULT_HEADERS, timeout=30)
    response.raise_for_status()
    WASM_CACHE.write_bytes(response.content)
    return response.content


def _wasm_encrypt_via_node(wasm_bytes: bytes, payload: dict, arg1: str = "0") -> str:
    if not RUN_WASM_JS_PATH.exists():
        raise FileNotFoundError(f"Missing {RUN_WASM_JS_PATH}")

    payload_json = json.dumps(payload, ensure_ascii=False)
    with tempfile.NamedTemporaryFile(suffix=".wasm", delete=False, dir=str(SCRIPT_DIR)) as wasm_file:
        wasm_file.write(wasm_bytes)
        wasm_tmp = wasm_file.name

    try:
        result = subprocess.run(
            ["node", str(RUN_WASM_JS_PATH), wasm_tmp, payload_json, arg1],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(SCRIPT_DIR),
        )
        lines = [line for line in result.stdout.strip().splitlines() if line.strip()]
        if not lines:
            raise RuntimeError(f"node run_wasm.js produced no output. stderr: {result.stderr.strip()}")

        data = json.loads(lines[-1])
        if not data.get("ok"):
            raise RuntimeError(f"WASM encryption failed: {data.get('error')}")
        return data["dataEnc"]
    finally:
        try:
            os.unlink(wasm_tmp)
        except OSError:
            pass


def _get_captcha(session: requests.Session, device_id: str) -> Tuple[str, str]:
    ref_no = _time_now_short()
    headers = dict(DEFAULT_HEADERS)
    headers["X-Request-Id"] = ref_no
    headers["Deviceid"] = device_id
    headers["Refno"] = ref_no

    response = session.post(
        f"{BASE_URL}/api/retail-internetbankingms/getCaptchaImage",
        headers=headers,
        json={
            "sessionId": "",
            "refNo": ref_no,
            "deviceIdCommon": device_id,
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    image_b64 = payload.get("imageString", "")
    (SCRIPT_DIR / "captcha.png").write_bytes(base64.b64decode(image_b64))
    return image_b64, ref_no


def _get_ocr_session():
    global _OCR_SESSION
    if _OCR_SESSION is not None:
        return _OCR_SESSION

    if not OCR_MODEL_PATH.exists():
        return None

    try:
        import onnxruntime as ort
    except ImportError:
        return None

    _OCR_SESSION = ort.InferenceSession(str(OCR_MODEL_PATH))
    return _OCR_SESSION


def _solve_captcha_onnx(image_b64: str) -> str | None:
    session = _get_ocr_session()
    if session is None:
        return None

    try:
        import io

        import numpy as np
        from PIL import Image

        image = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("L")
        if hasattr(Image, "Resampling"):
            image = image.resize((160, 50), Image.Resampling.LANCZOS)
        else:
            image = image.resize((160, 50))

        pixels = np.asarray(image, dtype=np.float32) / 255.0
        tensor = pixels.reshape(1, 1, 50, 160)
        output = session.run(None, {session.get_inputs()[0].name: tensor})[0]
        logits = np.asarray(output)
        if logits.ndim != 3 or logits.shape[0] != 1:
            return None

        token_ids = np.argmax(logits[0], axis=1)
        text = "".join(
            OCR_CHARSET[int(token_id)]
            for token_id in token_ids
            if 0 <= int(token_id) < len(OCR_CHARSET)
        )
        text = "".join(char for char in text if char.isalnum())
        if len(text) == 6:
            return text
    except Exception:
        return None

    return None


def _solve_captcha(image_b64: str) -> str:
    auto = _solve_captcha_onnx(image_b64)
    if auto:
        return auto

    env_captcha = os.getenv("MB_CAPTCHA", "").strip().upper()
    if env_captcha:
        return env_captcha

    captcha_path = SCRIPT_DIR / "captcha.png"
    if not sys.stdin or not sys.stdin.isatty():
        raise RuntimeError(
            f"Cannot read captcha interactively. Open {captcha_path}, "
            "then set MB_CAPTCHA or run in a terminal."
        )
    return input("[?] Enter captcha (6 chars): ").strip().upper()


def _perform_login(
    username: str,
    password: str,
    max_retries: int = 5,
    fresh_device: bool = True,
) -> Tuple[str, str]:
    wasm_bytes = _download_wasm()
    device_id = _generate_device_id() if fresh_device else _load_device_id(username)
    _save_device_id(username, device_id)
    session = _new_session()
    manual_captcha = bool(os.getenv("MB_CAPTCHA", "").strip())

    for _attempt in range(1, max_retries + 1):
        image_b64, _ = _get_captcha(session, device_id)
        captcha = _solve_captcha(image_b64)
        if not captcha or len(captcha) != 6:
            continue

        ref_no = f"{username}-{_time_now_short()}"
        request_data = {
            "userId": username,
            "password": _md5(password),
            "captcha": captcha,
            "ibAuthen2faString": FPR,
            "sessionId": None,
            "refNo": ref_no,
            "deviceIdCommon": device_id,
        }
        data_enc = _wasm_encrypt_via_node(wasm_bytes, request_data, "0")

        headers = dict(DEFAULT_HEADERS)
        headers["X-Request-Id"] = ref_no
        headers["Deviceid"] = device_id
        headers["Refno"] = ref_no

        response = session.post(
            f"{BASE_URL}/api/retail_web/internetbanking/v2.0/doLogin",
            headers=headers,
            json={"dataEnc": data_enc},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        result = payload.get("result", {})

        if result.get("ok"):
            return payload.get("sessionId"), device_id

        if result.get("responseCode") == "GW283":
            if manual_captcha:
                raise RuntimeError("Manual captcha was rejected. Update MB_CAPTCHA and retry.")
            continue

        raise RuntimeError(f"Login failed ({result.get('responseCode')}): {result.get('message')}")

    raise RuntimeError(f"Login failed after {max_retries} attempts.")


class MBBankAPI:
    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        session_id: Optional[str] = None,
        device_id: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        self.username = username
        self.password = password
        self.timeout = timeout
        self.session = _new_session()
        self.session_info: Optional[MBBankSession] = None

        if username and session_id and device_id:
            self.session_info = MBBankSession(
                username=username,
                session_id=session_id,
                device_id=device_id,
            )

    @classmethod
    def auto_login(
        cls,
        username: str,
        password: str,
        timeout: int = DEFAULT_TIMEOUT,
        fresh_device: bool = True,
    ) -> "MBBankAPI":
        api = cls(username=username, password=password, timeout=timeout)
        api.login(fresh_device=fresh_device)
        return api

    @classmethod
    def from_session(
        cls,
        username: str,
        session_id: str,
        device_id: str,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> "MBBankAPI":
        return cls(
            username=username,
            session_id=session_id,
            device_id=device_id,
            timeout=timeout,
        )

    def login(self, force: bool = False, fresh_device: bool = True) -> MBBankSession:
        if self.session_info and not force:
            return self.session_info

        if not self.username or not self.password:
            raise RuntimeError("username and password are required for login")

        session_id, device_id = _perform_login(self.username, self.password, fresh_device=fresh_device)
        self.session_info = MBBankSession(
            username=self.username,
            session_id=session_id,
            device_id=device_id,
        )
        return self.session_info

    def ensure_login(self) -> MBBankSession:
        if not self.session_info:
            return self.login()
        return self.session_info

    def export_session(self) -> dict[str, str]:
        return self.ensure_login().to_dict()

    def _headers(self, request_id: str) -> dict[str, str]:
        session_info = self.ensure_login()
        headers = dict(DEFAULT_HEADERS)
        headers["X-Request-Id"] = request_id
        headers["Deviceid"] = session_info.device_id
        headers["Refno"] = request_id
        return headers

    def _request_id(self) -> str:
        session_info = self.ensure_login()
        return f"{session_info.username}-{_time_now_long()}"

    def raw_post(self, path: str, body: Optional[dict[str, Any]] = None, authenticated: bool = True) -> Any:
        request_id = self._request_id() if authenticated else _time_now_short()
        payload = body.copy() if body else {}

        if authenticated:
            session_info = self.ensure_login()
            payload.setdefault("sessionId", session_info.session_id)
            payload.setdefault("refNo", request_id)
            payload.setdefault("deviceIdCommon", session_info.device_id)

        response = self.session.post(
            BASE_URL + path,
            headers=self._headers(request_id) if authenticated else dict(DEFAULT_HEADERS),
            json=payload,
            timeout=self.timeout,
        )
        try:
            data = response.json()
        except ValueError:
            data = response.text

        if not response.ok:
            raise RuntimeError(f"MBBank API Error - HTTP {response.status_code} for {path}: {data}")
        return data

    def verify_biometric(self) -> Any:
        return self.raw_post("/api/retail-go-ekycms/v1.0/verify-biometric-nfc-transaction")

    def get_balance(self) -> Any:
        return self.raw_post("/api/retail-accountms/accountms/getBalance")

    def get_accounts(self) -> list[dict[str, Any]]:
        balance = self.get_balance()
        accounts: list[dict[str, Any]] = []
        for item in balance.get("acct_list", []):
            accounts.append(
                {
                    "account_no": item.get("acctNo"),
                    "account_name": item.get("acctNm"),
                    "currency": item.get("ccyCd"),
                    "balance": item.get("currentBalance"),
                    "type": item.get("acctTypCd"),
                }
            )
        for item in balance.get("internationalAcctList", []):
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

    def get_transactions(self, account_no: str, from_date: str, to_date: str) -> Any:
        return self.raw_post(
            "/api/retail-transactionms/transactionms/get-account-transaction-history",
            {
                "accountNo": account_no,
                "fromDate": from_date,
                "toDate": to_date,
            },
        )
