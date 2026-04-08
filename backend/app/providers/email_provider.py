import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session
from app.config import config
from app.models.email_template import EmailLog

logger = logging.getLogger(__name__)


# ── HTML Email Templates ───────────────────────────────────────────────

TEMPLATES = {
    "welcome": {
        "subject": "Chào mừng bạn đến với {project_name}!",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">🎉 Chào mừng, {full_name}!</h1>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Cảm ơn bạn đã đăng ký tài khoản tại <strong>{project_name}</strong>.</p>
                <p style="color:#333;font-size:16px;line-height:1.6">Tài khoản của bạn đã sẵn sàng. Hãy bắt đầu khám phá các tính năng tuyệt vời!</p>
                <div style="text-align:center;margin:30px 0">
                    <a href="{login_url}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Đăng Nhập Ngay</a>
                </div>
                <p style="color:#999;font-size:13px;text-align:center">Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
    "verification": {
        "subject": "Xác thực email - {project_name}",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">🔐 Xác thực Email</h1>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Xin chào <strong>{full_name}</strong>,</p>
                <p style="color:#333;font-size:16px;line-height:1.6">Mã xác thực của bạn là:</p>
                <div style="text-align:center;margin:30px 0">
                    <div style="display:inline-block;background:#f0f4ff;border:2px dashed #667eea;border-radius:12px;padding:20px 40px">
                        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#667eea">{code}</span>
                    </div>
                </div>
                <p style="color:#999;font-size:14px;text-align:center">Mã này có hiệu lực trong 15 phút.</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
    "password_reset": {
        "subject": "Đặt lại mật khẩu - {project_name}",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">🔑 Đặt Lại Mật Khẩu</h1>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Xin chào <strong>{full_name}</strong>,</p>
                <p style="color:#333;font-size:16px;line-height:1.6">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <div style="text-align:center;margin:30px 0">
                    <a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Đặt Lại Mật Khẩu</a>
                </div>
                <p style="color:#999;font-size:14px;text-align:center">Link có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua.</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
    "api_token": {
        "subject": "API Token của bạn - {project_name}",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">🔑 API Token</h1>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Xin chào <strong>{full_name}</strong>,</p>
                <p style="color:#333;font-size:16px;line-height:1.6">API Token mới của bạn:</p>
                <div style="background:#1a1a2e;border-radius:8px;padding:20px;margin:20px 0">
                    <code style="color:#38ef7d;font-size:14px;word-break:break-all">{token}</code>
                </div>
                <p style="color:#e74c3c;font-size:14px"><strong>⚠️ Lưu ý:</strong> Vui lòng lưu trữ token an toàn. Token này sẽ không được hiển thị lại.</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
    "payment_receipt": {
        "subject": "Biên lai thanh toán #{invoice_number} - {project_name}",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">🧾 Biên Lai Thanh Toán</h1>
                <p style="color:rgba(255,255,255,.8);margin:10px 0 0;font-size:16px">#{invoice_number}</p>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Xin chào <strong>{full_name}</strong>,</p>
                <p style="color:#333;font-size:16px;line-height:1.6">Thanh toán của bạn đã được xử lý thành công!</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0">
                    <tr style="border-bottom:1px solid #eee">
                        <td style="padding:12px 0;color:#666">Gói dịch vụ</td>
                        <td style="padding:12px 0;text-align:right;font-weight:600;color:#333">{plan_name}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee">
                        <td style="padding:12px 0;color:#666">Số tiền</td>
                        <td style="padding:12px 0;text-align:right;font-weight:600;color:#333">{amount} VND</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee">
                        <td style="padding:12px 0;color:#666">Giảm giá</td>
                        <td style="padding:12px 0;text-align:right;font-weight:600;color:#38ef7d">-{discount} VND</td>
                    </tr>
                    <tr>
                        <td style="padding:12px 0;color:#333;font-weight:700;font-size:18px">Tổng cộng</td>
                        <td style="padding:12px 0;text-align:right;font-weight:700;font-size:18px;color:#667eea">{total} VND</td>
                    </tr>
                </table>
                <p style="color:#999;font-size:13px;text-align:center">Ngày thanh toán: {payment_date}</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
    "renewal_reminder": {
        "subject": "Nhắc nhở gia hạn gói - {project_name}",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#fa709a 0%,#fee140 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">⏰ Sắp Hết Hạn</h1>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Xin chào <strong>{full_name}</strong>,</p>
                <p style="color:#333;font-size:16px;line-height:1.6">Gói <strong>{plan_name}</strong> của bạn sẽ hết hạn trong <strong style="color:#e74c3c">{days_left} ngày</strong>.</p>
                <div style="text-align:center;margin:30px 0">
                    <a href="{renew_url}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Gia Hạn Ngay</a>
                </div>
                <p style="color:#999;font-size:14px;text-align:center">Gia hạn sớm để không bị gián đoạn dịch vụ.</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
    "subscription_confirmation": {
        "subject": "Xác nhận đăng ký gói {plan_name} - {project_name}",
        "html": """
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%);padding:40px 30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">✅ Đăng Ký Thành Công</h1>
            </div>
            <div style="padding:30px">
                <p style="color:#333;font-size:16px;line-height:1.6">Xin chào <strong>{full_name}</strong>,</p>
                <p style="color:#333;font-size:16px;line-height:1.6">Bạn đã đăng ký thành công gói <strong>{plan_name}</strong>!</p>
                <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0">
                    <p style="margin:8px 0;color:#333"><strong>Gói:</strong> {plan_name}</p>
                    <p style="margin:8px 0;color:#333"><strong>Giá:</strong> {price} VND/tháng</p>
                    <p style="margin:8px 0;color:#333"><strong>Ngày bắt đầu:</strong> {start_date}</p>
                    <p style="margin:8px 0;color:#333"><strong>Ngày hết hạn:</strong> {expiry_date}</p>
                </div>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center">
                <p style="color:#999;font-size:12px;margin:0">© 2026 {project_name}. All rights reserved.</p>
            </div>
        </div>
        """,
    },
}


class EmailService:
    """Service for sending emails via SMTP"""

    @staticmethod
    def _get_smtp_connection():
        """Create and return an SMTP connection"""
        try:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT)
            if config.SMTP_USE_TLS:
                server.starttls()
            if config.SMTP_USER and config.SMTP_PASSWORD:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            return server
        except Exception as e:
            logger.error(f"Failed to connect to SMTP server: {e}")
            raise

    @staticmethod
    def _build_message(to_email: str, subject: str, html_body: str) -> MIMEMultipart:
        """Build MIME email message"""
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        # Plain text fallback
        text_part = MIMEText("Vui lòng sử dụng email client hỗ trợ HTML để xem nội dung.", "plain", "utf-8")
        html_part = MIMEText(html_body, "html", "utf-8")

        msg.attach(text_part)
        msg.attach(html_part)
        return msg

    @staticmethod
    def _send(to_email: str, subject: str, html_body: str, db: Optional[Session] = None, template_key: str = "") -> bool:
        """Send an email and optionally log it"""
        log_entry = None
        if db:
            log_entry = EmailLog(
                recipient_email=to_email,
                subject=subject,
                template_key=template_key,
                status="pending",
            )
            db.add(log_entry)
            db.flush()

        try:
            msg = EmailService._build_message(to_email, subject, html_body)
            server = EmailService._get_smtp_connection()
            server.send_message(msg)
            server.quit()

            if log_entry:
                log_entry.status = "sent"
                db.commit()

            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            if log_entry:
                log_entry.status = "failed"
                log_entry.error_message = str(e)
                db.commit()
            return False

    @staticmethod
    def _render_template(template_key: str, **kwargs) -> tuple:
        """Render a template with variables, returns (subject, html)"""
        tmpl = TEMPLATES.get(template_key)
        if not tmpl:
            raise ValueError(f"Email template '{template_key}' not found")

        kwargs.setdefault("project_name", config.PROJECT_NAME)
        kwargs.setdefault("login_url", "http://localhost:5173/login")
        kwargs.setdefault("renew_url", "http://localhost:5173/subscriptions")

        subject = tmpl["subject"].format(**kwargs)
        html = tmpl["html"].format(**kwargs)
        return subject, html

    # ── Public convenience methods ────────────────────────────────────

    @staticmethod
    def send_welcome_email(user, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "welcome",
            full_name=user.full_name,
        )
        return EmailService._send(user.email, subject, html, db, "welcome")

    @staticmethod
    def send_verification_email(user, code: str, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "verification",
            full_name=user.full_name,
            code=code,
        )
        return EmailService._send(user.email, subject, html, db, "verification")

    @staticmethod
    def send_password_reset(user, reset_link: str, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "password_reset",
            full_name=user.full_name,
            reset_link=reset_link,
        )
        return EmailService._send(user.email, subject, html, db, "password_reset")

    @staticmethod
    def send_api_token(user, token: str, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "api_token",
            full_name=user.full_name,
            token=token,
        )
        return EmailService._send(user.email, subject, html, db, "api_token")

    @staticmethod
    def send_payment_receipt(user, invoice_number: str, plan_name: str, amount: float, discount: float, total: float, payment_date: str, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "payment_receipt",
            full_name=user.full_name,
            invoice_number=invoice_number,
            plan_name=plan_name,
            amount=f"{amount:,.0f}",
            discount=f"{discount:,.0f}",
            total=f"{total:,.0f}",
            payment_date=payment_date,
        )
        return EmailService._send(user.email, subject, html, db, "payment_receipt")

    @staticmethod
    def send_renewal_reminder(user, plan_name: str, days_left: int, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "renewal_reminder",
            full_name=user.full_name,
            plan_name=plan_name,
            days_left=str(days_left),
        )
        return EmailService._send(user.email, subject, html, db, "renewal_reminder")

    @staticmethod
    def send_subscription_confirmation(user, plan_name: str, price: float, start_date: str, expiry_date: str, db: Optional[Session] = None) -> bool:
        subject, html = EmailService._render_template(
            "subscription_confirmation",
            full_name=user.full_name,
            plan_name=plan_name,
            price=f"{price:,.0f}",
            start_date=start_date,
            expiry_date=expiry_date,
        )
        return EmailService._send(user.email, subject, html, db, "subscription_confirmation")

    @staticmethod
    def get_available_templates() -> list:
        """Return list of available template keys with descriptions"""
        return [
            {"key": k, "subject": v["subject"]}
            for k, v in TEMPLATES.items()
        ]
