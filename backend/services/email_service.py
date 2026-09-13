import logging
import smtplib
from email.message import EmailMessage

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP not configured; skipping email to %s", to)
        return False
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as client:
            if settings.smtp_tls:
                client.starttls()
            if settings.smtp_user:
                client.login(settings.smtp_user, settings.smtp_password)
            client.send_message(message)
    except OSError as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False
    return True


def send_welcome_email(to: str, username: str) -> bool:
    return send_email(
        to,
        "Welcome to CipherVault",
        f"Hello {username},\n\nYour CipherVault account has been created.",
    )


def send_share_notification(to: str, filename: str, shared_by: str) -> bool:
    return send_email(
        to,
        f"File shared with you: {filename}",
        f"Hello,\n\n{shared_by} shared '{filename}' with you on CipherVault.",
    )


def send_payment_receipt(to: str, invoice_number: str, amount: str) -> bool:
    return send_email(
        to,
        f"CipherVault receipt {invoice_number}",
        f"Hello,\n\nPayment of {amount} for invoice {invoice_number} succeeded.",
    )
