from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from backend.models import Invoice, Plan, Subscription, User

PPN_RATE = 0.11


def _next_invoice_number(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(Invoice).count() + 1
    return f"CV-{year}-{count:04d}"


def create_invoice_for_subscription(
    db: Session, user: User, subscription: Subscription, amount: int
) -> Invoice:
    tax = int(round(amount * PPN_RATE))
    now = datetime.now(timezone.utc)
    invoice = Invoice(
        subscription_id=subscription.id,
        user_id=user.id,
        amount=amount,
        tax_amount=tax,
        currency="IDR",
        status="open",
        invoice_number=_next_invoice_number(db),
        issued_at=now,
        due_at=now + timedelta(days=1),
    )
    db.add(invoice)
    return invoice


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def render_invoice_pdf(invoice: Invoice, plan: Plan, user: User) -> bytes:
    lines = [
        "CIPHERVAULT - INVOICE",
        f"Invoice: {invoice.invoice_number}",
        f"Customer: {user.username} <{user.email}>",
        f"Plan: {plan.name}",
        f"Subtotal: IDR {invoice.amount}",
        f"PPN 11%: IDR {invoice.tax_amount}",
        f"Total: IDR {invoice.amount + invoice.tax_amount}",
        f"Status: {invoice.status}",
        f"Issued: {invoice.issued_at.isoformat()}",
    ]
    content = "BT /F1 12 Tf 50 780 Td 15 TL " + " Tj T* ".join(
        f"({_pdf_escape(line)})" for line in lines
    ) + " Tj ET"
    content_bytes = content.encode("latin-1")

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(content_bytes)).encode() + b" >>\nstream\n"
        + content_bytes + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = b"%PDF-1.4\n"
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_pos = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF".encode()
    )
    return pdf
