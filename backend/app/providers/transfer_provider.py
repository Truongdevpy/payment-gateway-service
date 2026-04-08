import hashlib
import hmac
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

import requests
from sqlalchemy.orm import Session

from app.config import config
from app.models.payment_transaction import PaymentTransaction

logger = logging.getLogger(__name__)


class TransferService:
    """Service for handling money transfers via Momo, ZaloPay, VCB"""

    # ── Momo Transfer ─────────────────────────────────────────────────

    @staticmethod
    def send_money_momo(
        user_id: int,
        phone: str,
        amount: float,
        message: str,
        db: Session,
    ) -> Dict[str, Any]:
        """Initiate a Momo transfer"""
        transaction = PaymentTransaction(
            user_id=user_id,
            transaction_type="transfer",
            amount=amount,
            payment_method="momo",
            recipient_account=phone,
            description=message,
            status="pending",
            reference_id=str(uuid.uuid4()),
        )
        db.add(transaction)
        db.flush()

        try:
            # Build Momo API request
            request_id = str(uuid.uuid4())
            order_id = f"MOMO-{transaction.id}-{int(time.time())}"
            raw_signature = (
                f"accessKey={config.MOMO_ACCESS_KEY}"
                f"&amount={int(amount)}"
                f"&extraData="
                f"&orderId={order_id}"
                f"&orderInfo={message}"
                f"&partnerCode={config.MOMO_PARTNER_CODE}"
                f"&requestId={request_id}"
                f"&requestType=captureWallet"
            )
            signature = hmac.new(
                config.MOMO_SECRET_KEY.encode("utf-8"),
                raw_signature.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            payload = {
                "partnerCode": config.MOMO_PARTNER_CODE,
                "requestId": request_id,
                "amount": int(amount),
                "orderId": order_id,
                "orderInfo": message,
                "extraData": "",
                "requestType": "captureWallet",
                "signature": signature,
                "lang": "vi",
            }

            resp = requests.post(
                f"{config.MOMO_API_ENDPOINT}/v2/gateway/api/create",
                json=payload,
                timeout=30,
            )
            data = resp.json()

            transaction.reference_id = order_id
            transaction.provider_response = json.dumps(data)

            if data.get("resultCode") == 0:
                transaction.status = "completed"
                db.commit()
                return {
                    "success": True,
                    "transactionId": transaction.id,
                    "referenceId": order_id,
                    "message": "Chuyển tiền Momo thành công",
                    "payUrl": data.get("payUrl"),
                }
            else:
                transaction.status = "failed"
                transaction.error_message = data.get("message", "Unknown error")
                db.commit()
                return {
                    "success": False,
                    "transactionId": transaction.id,
                    "message": data.get("message", "Chuyển tiền Momo thất bại"),
                }

        except Exception as e:
            logger.error(f"Momo transfer error: {e}")
            transaction.status = "failed"
            transaction.error_message = str(e)
            db.commit()
            return {
                "success": False,
                "transactionId": transaction.id,
                "message": f"Lỗi kết nối Momo: {str(e)}",
            }

    # ── ZaloPay Transfer ──────────────────────────────────────────────

    @staticmethod
    def send_money_zalopay(
        user_id: int,
        phone: str,
        amount: float,
        message: str,
        db: Session,
    ) -> Dict[str, Any]:
        """Initiate a ZaloPay transfer"""
        transaction = PaymentTransaction(
            user_id=user_id,
            transaction_type="transfer",
            amount=amount,
            payment_method="zalopay",
            recipient_account=phone,
            description=message,
            status="pending",
            reference_id=str(uuid.uuid4()),
        )
        db.add(transaction)
        db.flush()

        try:
            app_trans_id = f"{datetime.now().strftime('%y%m%d')}_{transaction.id}_{int(time.time())}"
            app_time = int(round(time.time() * 1000))

            raw_data = (
                f"{config.ZALOPAY_APP_ID}|{app_trans_id}|{phone}"
                f"|{int(amount)}|{app_time}|{{}}"
                f"|{message}"
            )
            mac = hmac.new(
                config.ZALOPAY_KEY1.encode("utf-8"),
                raw_data.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            payload = {
                "app_id": config.ZALOPAY_APP_ID,
                "app_user": phone,
                "app_trans_id": app_trans_id,
                "app_time": app_time,
                "amount": int(amount),
                "item": json.dumps([]),
                "embed_data": json.dumps({}),
                "description": message,
                "mac": mac,
            }

            resp = requests.post(
                f"{config.ZALOPAY_API_ENDPOINT}/v2/create",
                data=payload,
                timeout=30,
            )
            data = resp.json()

            transaction.reference_id = app_trans_id
            transaction.provider_response = json.dumps(data)

            if data.get("return_code") == 1:
                transaction.status = "completed"
                db.commit()
                return {
                    "success": True,
                    "transactionId": transaction.id,
                    "referenceId": app_trans_id,
                    "message": "Chuyển tiền ZaloPay thành công",
                    "orderUrl": data.get("order_url"),
                }
            else:
                transaction.status = "failed"
                transaction.error_message = data.get("return_message", "Unknown error")
                db.commit()
                return {
                    "success": False,
                    "transactionId": transaction.id,
                    "message": data.get("return_message", "Chuyển tiền ZaloPay thất bại"),
                }

        except Exception as e:
            logger.error(f"ZaloPay transfer error: {e}")
            transaction.status = "failed"
            transaction.error_message = str(e)
            db.commit()
            return {
                "success": False,
                "transactionId": transaction.id,
                "message": f"Lỗi kết nối ZaloPay: {str(e)}",
            }

    # ── VCB Transfer (with RSA) ───────────────────────────────────────

    @staticmethod
    def send_money_vcb(
        user_id: int,
        account_number: str,
        amount: float,
        message: str,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Initiate a VCB transfer. Step 1 – request OTP.
        """
        transaction = PaymentTransaction(
            user_id=user_id,
            transaction_type="transfer",
            amount=amount,
            payment_method="vcb",
            recipient_account=account_number,
            description=message,
            status="pending",
            otp_required="yes",
            reference_id=str(uuid.uuid4()),
        )
        db.add(transaction)
        db.flush()

        try:
            # Encrypt sensitive data with RSA if key is configured
            encrypted_data = TransferService._encrypt_rsa(json.dumps({
                "accountNumber": account_number,
                "amount": int(amount),
                "message": message,
            }))

            payload = {
                "merchantId": config.VCB_MERCHANT_ID,
                "data": encrypted_data,
                "transactionId": transaction.reference_id,
            }

            if config.VCB_API_URL:
                resp = requests.post(
                    f"{config.VCB_API_URL}/api/transfer/init",
                    json=payload,
                    timeout=30,
                )
                data = resp.json()
                transaction.provider_response = json.dumps(data)

                if data.get("status") == "otp_sent":
                    db.commit()
                    return {
                        "success": True,
                        "transactionId": transaction.id,
                        "requiresOtp": True,
                        "message": "OTP đã được gửi. Vui lòng xác nhận để hoàn tất giao dịch.",
                    }
                else:
                    transaction.status = "failed"
                    transaction.error_message = data.get("message", "Lỗi VCB")
                    db.commit()
                    return {
                        "success": False,
                        "transactionId": transaction.id,
                        "message": data.get("message", "Lỗi khởi tạo chuyển khoản VCB"),
                    }
            else:
                # Sandbox/mock mode
                db.commit()
                return {
                    "success": True,
                    "transactionId": transaction.id,
                    "requiresOtp": True,
                    "message": "[SANDBOX] OTP đã được gửi. Dùng OTP '123456' để test.",
                }

        except Exception as e:
            logger.error(f"VCB transfer error: {e}")
            transaction.status = "failed"
            transaction.error_message = str(e)
            db.commit()
            return {
                "success": False,
                "transactionId": transaction.id,
                "message": f"Lỗi kết nối VCB: {str(e)}",
            }

    @staticmethod
    def verify_otp_vcb(
        transaction_id: int,
        otp: str,
        db: Session,
    ) -> Dict[str, Any]:
        """Step 2 – verify OTP for a VCB transfer"""
        transaction = db.query(PaymentTransaction).filter(
            PaymentTransaction.id == transaction_id,
            PaymentTransaction.payment_method == "vcb",
            PaymentTransaction.otp_required == "yes",
        ).first()

        if not transaction:
            return {"success": False, "message": "Giao dịch không tồn tại hoặc không yêu cầu OTP"}

        if transaction.status != "pending":
            return {"success": False, "message": "Giao dịch đã được xử lý"}

        try:
            if config.VCB_API_URL:
                payload = {
                    "merchantId": config.VCB_MERCHANT_ID,
                    "transactionId": transaction.reference_id,
                    "otp": otp,
                }
                resp = requests.post(
                    f"{config.VCB_API_URL}/api/transfer/confirm",
                    json=payload,
                    timeout=30,
                )
                data = resp.json()
                transaction.provider_response = json.dumps(data)

                if data.get("status") == "success":
                    transaction.status = "completed"
                    transaction.otp_required = "verified"
                    db.commit()
                    return {"success": True, "message": "Chuyển khoản VCB thành công"}
                else:
                    return {"success": False, "message": data.get("message", "OTP không hợp lệ")}
            else:
                # Sandbox mode
                if otp == "123456":
                    transaction.status = "completed"
                    transaction.otp_required = "verified"
                    db.commit()
                    return {"success": True, "message": "[SANDBOX] Chuyển khoản VCB thành công"}
                return {"success": False, "message": "[SANDBOX] OTP không đúng. Dùng '123456'"}

        except Exception as e:
            logger.error(f"VCB OTP verify error: {e}")
            return {"success": False, "message": f"Lỗi xác thực OTP: {str(e)}"}

    # ── Helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _encrypt_rsa(data: str) -> str:
        """Encrypt data using RSA public key (VCB)"""
        if not config.VCB_RSA_PUBLIC_KEY:
            return data  # fallback if no key configured

        try:
            from Crypto.PublicKey import RSA
            from Crypto.Cipher import PKCS1_v1_5
            import base64

            key = RSA.import_key(config.VCB_RSA_PUBLIC_KEY)
            cipher = PKCS1_v1_5.new(key)
            encrypted = cipher.encrypt(data.encode("utf-8"))
            return base64.b64encode(encrypted).decode("utf-8")
        except ImportError:
            logger.warning("pycryptodome not installed, skipping RSA encryption")
            return data
        except Exception as e:
            logger.error(f"RSA encryption error: {e}")
            return data

    @staticmethod
    def get_transaction_status(transaction_id: int, db: Session) -> Optional[Dict[str, Any]]:
        """Get the status of a payment transaction"""
        transaction = db.query(PaymentTransaction).filter(
            PaymentTransaction.id == transaction_id,
        ).first()
        if not transaction:
            return None
        return transaction.to_dict()

    @staticmethod
    def get_user_transfer_history(user_id: int, db: Session, limit: int = 50) -> list:
        """Get transfer history for a user"""
        transactions = db.query(PaymentTransaction).filter(
            PaymentTransaction.user_id == user_id,
        ).order_by(PaymentTransaction.created_at.desc()).limit(limit).all()
        return [t.to_dict() for t in transactions]
