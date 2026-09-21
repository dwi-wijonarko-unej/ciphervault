async function loadInvoicePreview() {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = Number(params.get("id"));
  const box = document.getElementById("invoice-box");
  const loading = document.getElementById("invoice-loading");
  const errBox = document.getElementById("invoice-error");
  const errText = document.getElementById("invoice-error-text");

  function showError(msg) {
    loading.classList.add("hidden");
    box.classList.add("hidden");
    errText.textContent = msg;
    errBox.classList.remove("hidden");
  }

  if (!invoiceId) {
    showError(I18n.t("invoice.not_found"));
    return;
  }

  try {
    const [inv, me] = await Promise.all([
      API.request("GET", `/billing/invoices/${invoiceId}/detail`),
      API.request("GET", "/auth/me"),
    ]);

    const fmtRp = (cents) => "Rp" + (Number(cents || 0) / 100).toLocaleString("id-ID");
    const fmtDate = (iso) =>
      iso
        ? new Date(iso).toLocaleDateString("en-ID", { day: "numeric", month: "short", year: "numeric" })
        : "-";

    document.getElementById("inv-number").textContent = inv.invoice_number;
    document.getElementById("inv-created").textContent = fmtDate(inv.issued_at);
    document.getElementById("inv-due").textContent = fmtDate(inv.due_at);
    document.getElementById("inv-username").textContent = me.username;
    document.getElementById("inv-email").textContent = me.email;
    document.getElementById("inv-method").textContent =
      inv.payment_gateway === "midtrans" ? "Midtrans" : "Manual";
    document.getElementById("inv-status").textContent = inv.status;
    document.getElementById("inv-plan").textContent = `Langganan ${inv.plan_name} (monthly)`;
    document.getElementById("inv-amount").textContent = fmtRp(inv.amount);
    document.getElementById("inv-tax").textContent = fmtRp(inv.tax_amount);
    document.getElementById("inv-total").textContent = fmtRp(inv.amount + inv.tax_amount);
    document.title = `CipherVault — ${inv.invoice_number}`;

    loading.classList.add("hidden");
    box.classList.remove("hidden");

    if (inv.status !== "paid" && inv.plan_id) {
      const payBtn = document.getElementById("btn-pay-now");
      payBtn.href = `checkout.html?plan=${inv.plan_id}`;
      payBtn.classList.remove("hidden");
    }

    document.getElementById("btn-download-pdf").addEventListener("click", async () => {
      try {
        const token = API.getToken();
        const res = await fetch(`/billing/invoices/${invoiceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Gagal mengunduh invoice");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${inv.invoice_number}.pdf`;
        const cd = res.headers.get("Content-Disposition");
        if (cd) {
          const m = cd.match(/filename="?([^"]+)"?/);
          if (m) a.download = m[1];
        }
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        UI.toast(I18n.t("invoice.download_failed") + ": " + (err.detail || err.message), "error");
      }
    });
  } catch (err) {
    showError(err.detail || I18n.t("invoice.not_found"));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await I18n.init();
  const me = await Auth.ensureAuthenticated();
  if (!me) return;
  loadInvoicePreview();
});
