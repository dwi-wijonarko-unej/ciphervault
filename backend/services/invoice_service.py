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
    text = text.encode("latin-1", errors="replace").decode("latin-1")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


BRAND_GREEN = (0.176, 0.416, 0.310)

PAGE_W = 595
MARGIN = 50
RIGHT_X = PAGE_W - MARGIN


def _font_op(bold: bool) -> str:
    return "/F2" if bold else "/F1"


def _color_op(color) -> str:
    if color is None:
        return "0 0 0 rg "
    if color == "gray":
        return "0.4 0.4 0.4 rg "
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} rg "


def _txt(x: float, y: float, text: str, size: int = 10, bold: bool = False, color=None) -> str:
    return (
        f"BT {_font_op(bold)} {size} Tf {_color_op(color)}"
        f"{x:.1f} {y:.1f} Td ({_pdf_escape(text)}) Tj ET"
    )


def _rtxt(x_right: float, y: float, text: str, size: int = 10, bold: bool = False, color=None) -> str:
    width = len(text) * size * 0.55
    return _txt(x_right - width, y, text, size, bold, color)


def _band(y: float, height: float = 20) -> str:
    return f"0.93 g {MARGIN:.1f} {y:.1f} {RIGHT_X - MARGIN:.1f} {height:.1f} re f"


def _rule(y: float) -> str:
    return f"0.85 g {MARGIN:.1f} {y:.1f} {RIGHT_X - MARGIN:.1f} 1 re f"


def _idr(cents: int) -> str:
    return "Rp" + f"{int(cents):,}".replace(",", ".")


def _fmt_date(value) -> str:
    if not value:
        return "-"
    return value.strftime("%d %b %Y")


def render_invoice_pdf(
    invoice: Invoice, plan: Plan, user: User, payment_method: str | None = None
) -> bytes:
    plan_name = plan.name if plan else "-"
    gateway = (payment_method or "manual").lower()
    method_label = "Midtrans" if gateway == "midtrans" else "Manual"
    total = (invoice.amount or 0) + (invoice.tax_amount or 0)

    ops: list[str] = []
    y = 800.0

    ops.append(_txt(MARGIN, y, "CIPHERVAULT", size=22, bold=True, color=BRAND_GREEN))
    ops.append(_rtxt(RIGHT_X, y + 8, f"Invoice #: {invoice.invoice_number}", size=10, bold=True))
    ops.append(_rtxt(RIGHT_X, y - 6, f"Created: {_fmt_date(invoice.issued_at)}", size=9, color="gray"))
    ops.append(_rtxt(RIGHT_X, y - 18, f"Due: {_fmt_date(invoice.due_at)}", size=9, color="gray"))
    y -= 34
    ops.append(_rule(y))

    y -= 26
    ops.append(_txt(MARGIN, y, "CipherVault", size=11, bold=True))
    ops.append(_rtxt(RIGHT_X, y, user.username, size=11, bold=True))
    y -= 14
    ops.append(_txt(MARGIN, y, "Zero-Knowledge Cloud Storage", size=9, color="gray"))
    ops.append(_rtxt(RIGHT_X, y, user.email, size=9, color="gray"))

    y -= 30
    ops.append(_band(y - 14))
    ops.append(_txt(MARGIN + 6, y, "Payment Method", size=10, bold=True))
    ops.append(_rtxt(RIGHT_X - 6, y, "Status", size=10, bold=True))
    y -= 18
    ops.append(_txt(MARGIN + 6, y, method_label, size=10))
    ops.append(_rtxt(RIGHT_X - 6, y, invoice.status, size=10))

    y -= 30
    ops.append(_band(y - 14))
    ops.append(_txt(MARGIN + 6, y, "Item", size=10, bold=True))
    ops.append(_rtxt(RIGHT_X - 6, y, "Price", size=10, bold=True))
    y -= 18
    ops.append(_txt(MARGIN + 6, y, f"Langganan {plan_name} (monthly)", size=10))
    ops.append(_rtxt(RIGHT_X - 6, y, _idr(invoice.amount), size=10))
    y -= 16
    ops.append(_txt(MARGIN + 6, y, "PPN 11%", size=10))
    ops.append(_rtxt(RIGHT_X - 6, y, _idr(invoice.tax_amount), size=10))

    y -= 10
    ops.append(_rule(y))
    y -= 18
    ops.append(_txt(MARGIN + 6, y, "TOTAL", size=12, bold=True))
    ops.append(_rtxt(RIGHT_X - 6, y, _idr(total), size=12, bold=True))

    y -= 40
    ops.append(_txt(MARGIN, y, "Terima kasih. Disimpan sebagai ciphertext, selalu.", size=9, color="gray"))

    content = "\n".join(ops)
    content_bytes = content.encode("latin-1")

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
        b"<< /Length " + str(len(content_bytes)).encode() + b" >>\nstream\n"
        + content_bytes + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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
