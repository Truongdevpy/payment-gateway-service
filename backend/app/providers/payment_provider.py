from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
import uuid
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.config import config
from app.models.balance import BalanceTransaction
from app.models.payment_transaction import PaymentTransaction
from app.providers.balance_provider import BalanceService

logger = logging.getLogger(__name__)


class MomoPaymentService:
    CREATE_PATH = "/v2/gateway/api/create"
    QUERY_PATH = "/v2/gateway/api/query"

    @classmethod
    def create_payment(
        cls,
        *,
        user_id: int,
        amount: int,
        order_info: str,
        db: Session,
        order_id: str | None = None,
        redirect_url: str | None = None,
        ipn_url: str | None = None,
        extra_data: dict[str, Any] | None = None,
        request_type: str | None = None,
        auto_capture: bool = True,
        lang: str | None = None,
        user_info: dict[str, Any] | None = None,
        delivery_info: dict[str, Any] | None = None,
        items: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        cls._ensure_configured()

        transaction = PaymentTransaction(
            user_id=user_id,
            transaction_type="topup",
            amount=float(amount),
            payment_method="momo",
            description=order_info,
            status="pending",
            reference_id=order_id or cls._generate_order_id(user_id),
            provider_response="",
        )
        db.add(transaction)
        db.flush()

        request_id = cls._generate_request_id(transaction.id)
        redirect_value = redirect_url or config.MOMO_REDIRECT_URL
        ipn_value = ipn_url or config.MOMO_IPN_URL
        request_type_value = request_type or config.MOMO_REQUEST_TYPE
        lang_value = lang or config.MOMO_LANG

        extra_payload = {
            "userId": user_id,
            "localTransactionId": transaction.id,
        }
        if extra_data:
            extra_payload.update(extra_data)
        extra_data_value = cls._encode_extra_data(extra_payload)

        raw_signature = (
            f"accessKey={config.MOMO_ACCESS_KEY}"
            f"&amount={amount}"
            f"&extraData={extra_data_value}"
            f"&ipnUrl={ipn_value}"
            f"&orderId={transaction.reference_id}"
            f"&orderInfo={order_info}"
            f"&partnerCode={config.MOMO_PARTNER_CODE}"
            f"&redirectUrl={redirect_value}"
            f"&requestId={request_id}"
            f"&requestType={request_type_value}"
        )
        signature = cls._sign(raw_signature)

        payload: dict[str, Any] = {
            "partnerCode": config.MOMO_PARTNER_CODE,
            "partnerName": config.MOMO_PARTNER_NAME,
            "storeId": config.MOMO_STORE_ID,
            "storeName": config.MOMO_STORE_NAME,
            "requestId": request_id,
            "amount": amount,
            "orderId": transaction.reference_id,
            "orderInfo": order_info,
            "redirectUrl": redirect_value,
            "ipnUrl": ipn_value,
            "lang": lang_value,
            "requestType": request_type_value,
            "autoCapture": auto_capture,
            "extraData": extra_data_value,
            "signature": signature,
        }
        if user_info:
            payload["userInfo"] = user_info
        if delivery_info:
            payload["deliveryInfo"] = delivery_info
        if items:
            payload["items"] = items

        data = cls._post(cls.CREATE_PATH, payload)
        transaction.provider_response = json.dumps(data, ensure_ascii=False)

        if data.get("resultCode") == 0:
            transaction.status = "pending"
            db.commit()
            return {
                "success": True,
                "transactionId": transaction.id,
                "orderId": transaction.reference_id,
                "requestId": request_id,
                "amount": amount,
                "resultCode": int(data.get("resultCode", 0)),
                "message": data.get("message", "Created payment successfully"),
                "payUrl": data.get("payUrl"),
                "deeplink": data.get("deeplink"),
                "qrCodeUrl": data.get("qrCodeUrl"),
                "deeplinkMiniApp": data.get("deeplinkMiniApp"),
                "rawResponse": data,
            }

        transaction.status = "failed"
        transaction.error_message = data.get("message", "MoMo create payment failed")
        db.commit()
        return {
            "success": False,
            "transactionId": transaction.id,
            "orderId": transaction.reference_id,
            "requestId": request_id,
            "amount": amount,
            "resultCode": int(data.get("resultCode", -1)),
            "message": data.get("message", "MoMo create payment failed"),
            "rawResponse": data,
        }

    @classmethod
    def query_payment(cls, *, transaction_id: int, user_id: int, db: Session) -> dict[str, Any]:
        cls._ensure_configured()

        transaction = cls._get_user_transaction(transaction_id=transaction_id, user_id=user_id, db=db)
        request_id = cls._generate_request_id(transaction.id)
        raw_signature = (
            f"accessKey={config.MOMO_ACCESS_KEY}"
            f"&orderId={transaction.reference_id}"
            f"&partnerCode={config.MOMO_PARTNER_CODE}"
            f"&requestId={request_id}"
        )
        signature = cls._sign(raw_signature)

        payload = {
            "partnerCode": config.MOMO_PARTNER_CODE,
            "requestId": request_id,
            "orderId": transaction.reference_id,
            "lang": config.MOMO_LANG,
            "signature": signature,
        }

        data = cls._post(cls.QUERY_PATH, payload)
        transaction.provider_response = json.dumps(data, ensure_ascii=False)
        transaction.error_message = None
        transaction.status = cls._map_remote_status(data.get("resultCode"))
        if transaction.status == "failed":
            transaction.error_message = data.get("message", "MoMo payment failed")
        db.commit()

        return {
            "success": transaction.status == "completed",
            "transactionId": transaction.id,
            "orderId": transaction.reference_id,
            "status": transaction.status,
            "resultCode": data.get("resultCode"),
            "message": data.get("message", "Queried payment status"),
            "transId": data.get("transId"),
            "amount": data.get("amount"),
            "payType": data.get("payType"),
            "responseTime": data.get("responseTime"),
            "rawResponse": data,
        }

    @classmethod
    def handle_ipn(cls, payload: dict[str, Any], db: Session) -> None:
        cls._ensure_configured()
        if not cls.verify_ipn_signature(payload):
            raise ValueError("Invalid MoMo IPN signature")

        order_id = str(payload.get("orderId") or "").strip()
        transaction = (
            db.query(PaymentTransaction)
            .filter(
                PaymentTransaction.payment_method == "momo",
                PaymentTransaction.reference_id == order_id,
            )
            .first()
        )
        if not transaction:
            raise ValueError("MoMo transaction not found")

        payload_amount = int(payload.get("amount") or 0)
        if int(round(float(transaction.amount))) != payload_amount:
            raise ValueError("MoMo IPN amount mismatch")

        already_completed = transaction.status == "completed"
        transaction.provider_response = json.dumps(payload, ensure_ascii=False)
        transaction.error_message = None
        transaction.status = cls._map_remote_status(payload.get("resultCode"))

        if transaction.status == "failed":
            transaction.error_message = payload.get("message", "MoMo payment failed")
            db.commit()
            return

        if transaction.status == "completed" and not already_completed:
            balance_reference = f"MOMO:{order_id}"
            existing_balance_tx = (
                db.query(BalanceTransaction)
                .filter(BalanceTransaction.reference_id == balance_reference)
                .first()
            )
            if not existing_balance_tx:
                ok, message, _ = BalanceService.deposit_balance(
                    transaction.user_id,
                    float(payload_amount),
                    db,
                    payment_method="momo",
                    transaction_type="deposit",
                    description=f"Nạp tiền qua MoMo, orderId={order_id}",
                    reference_id=balance_reference,
                    commit=False,
                )
                if not ok:
                    raise ValueError(message)

        db.commit()

    @classmethod
    def verify_ipn_signature(cls, payload: dict[str, Any]) -> bool:
        required = {
            "amount": payload.get("amount", ""),
            "extraData": payload.get("extraData", ""),
            "message": payload.get("message", ""),
            "orderId": payload.get("orderId", ""),
            "orderInfo": payload.get("orderInfo", ""),
            "orderType": payload.get("orderType", ""),
            "partnerCode": payload.get("partnerCode", ""),
            "payType": payload.get("payType", ""),
            "requestId": payload.get("requestId", ""),
            "responseTime": payload.get("responseTime", ""),
            "resultCode": payload.get("resultCode", ""),
            "transId": payload.get("transId", ""),
        }
        raw_signature = (
            f"accessKey={config.MOMO_ACCESS_KEY}"
            f"&amount={required['amount']}"
            f"&extraData={required['extraData']}"
            f"&message={required['message']}"
            f"&orderId={required['orderId']}"
            f"&orderInfo={required['orderInfo']}"
            f"&orderType={required['orderType']}"
            f"&partnerCode={required['partnerCode']}"
            f"&payType={required['payType']}"
            f"&requestId={required['requestId']}"
            f"&responseTime={required['responseTime']}"
            f"&resultCode={required['resultCode']}"
            f"&transId={required['transId']}"
        )
        expected = cls._sign(raw_signature)
        return hmac.compare_digest(expected, str(payload.get("signature", "")))

    @classmethod
    def get_user_transactions(cls, *, user_id: int, db: Session, limit: int = 50) -> list[PaymentTransaction]:
        return (
            db.query(PaymentTransaction)
            .filter(
                PaymentTransaction.user_id == user_id,
                PaymentTransaction.payment_method == "momo",
            )
            .order_by(PaymentTransaction.created_at.desc())
            .limit(limit)
            .all()
        )

    @classmethod
    def _get_user_transaction(cls, *, transaction_id: int, user_id: int, db: Session) -> PaymentTransaction:
        transaction = (
            db.query(PaymentTransaction)
            .filter(
                PaymentTransaction.id == transaction_id,
                PaymentTransaction.user_id == user_id,
                PaymentTransaction.payment_method == "momo",
            )
            .first()
        )
        if not transaction:
            raise ValueError("MoMo transaction not found")
        return transaction

    @staticmethod
    def _encode_extra_data(data: dict[str, Any]) -> str:
        encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return base64.b64encode(encoded).decode("utf-8")

    @staticmethod
    def _generate_order_id(user_id: int) -> str:
        return f"MOMO-{user_id}-{int(time.time() * 1000)}"

    @staticmethod
    def _generate_request_id(seed: int) -> str:
        return f"REQ-{seed}-{uuid.uuid4().hex[:12]}"

    @staticmethod
    def _map_remote_status(result_code: Any) -> str:
        try:
            code = int(result_code)
        except (TypeError, ValueError):
            return "pending"
        if code == 0:
            return "completed"
        if code == 9000:
            return "authorized"
        return "failed"

    @staticmethod
    def _sign(raw_signature: str) -> str:
        return hmac.new(
            config.MOMO_SECRET_KEY.encode("utf-8"),
            raw_signature.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @classmethod
    def _post(cls, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{config.MOMO_API_ENDPOINT.rstrip('/')}{path}"
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Invalid MoMo response payload")
        return data

    @staticmethod
    def _ensure_configured() -> None:
        required = {
            "MOMO_PARTNER_CODE": config.MOMO_PARTNER_CODE,
            "MOMO_ACCESS_KEY": config.MOMO_ACCESS_KEY,
            "MOMO_SECRET_KEY": config.MOMO_SECRET_KEY,
            "MOMO_API_ENDPOINT": config.MOMO_API_ENDPOINT,
        }
        missing = [key for key, value in required.items() if not str(value or "").strip()]
        if missing:
            raise ValueError(f"Missing MoMo configuration: {', '.join(missing)}")
