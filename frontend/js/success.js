let successInvoiceId = null;
let successTimer = null;
let successTries = 0;

async function successPoll() {
  successTries += 1;
  try {
    const inv = await API.request("GET", `/billing/invoices/${successInvoiceId}/detail`);
    if (inv.status === "paid") {
      clearInterval(successTimer);
      const fmtRp = (c) => "Rp" + (Number(c || 0) / 100).toLocaleString("id-ID");
      const fmtDate = (iso) =>
        iso
          ? new Date(iso).toLocaleDateString("en-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : "-";
      document.getElementById("ok-number").textContent = inv.invoice_number;
      document.getElementById("ok-total").textContent = fmtRp(inv.amount + inv.tax_amount);
      document.getElementById("ok-method").textContent =
        inv.payment_gateway === "midtrans" ? "Midtrans" : "Manual";
      document.getElementById("ok-paid-at").textContent = fmtDate(inv.paid_at);
      document.getElementById("ok-invoice-link").href = `invoice.html?id=${successInvoiceId}`;
      document.getElementById("success-waiting").classList.add("hidden");
      document.getElementById("success-paid").classList.remove("hidden");
      return;
    }
    if (successTries >= 40) {
      clearInterval(successTimer);
      document.getElementById("success-waiting").classList.add("hidden");
      const errBox = document.getElementById("success-error");
      document.getElementById("success-error-text").textContent = I18n.t("success.timeout");
      errBox.classList.remove("hidden");
    }
  } catch (err) {
    clearInterval(successTimer);
    document.getElementById("success-waiting").classList.add("hidden");
    document.getElementById("success-error-text").textContent = err.detail || I18n.t("invoice.not_found");
    document.getElementById("success-error").classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await I18n.init();
  const me = await Auth.ensureAuthenticated();
  if (!me) return;
  const params = new URLSearchParams(window.location.search);
  successInvoiceId = Number(params.get("invoice"));
  if (!successInvoiceId) {
    document.getElementById("success-waiting").classList.add("hidden");
    document.getElementById("success-error-text").textContent = I18n.t("invoice.not_found");
    document.getElementById("success-error").classList.remove("hidden");
    return;
  }
  await successPoll();
  successTimer = setInterval(successPoll, 3000);
});
