let payInvoiceId = null;
let payPollTimer = null;

const PAY_METHOD_INFO = {
  transfer: { code: "8808 1234 5678 90", title: "Transfer Bank / Virtual Account" },
  qris: { code: "QRIS-CV-MOCK-001", title: "QRIS" },
  ewallet: { code: "0812-MOCK-CV", title: "E-wallet" },
  card: { code: "4111 •••• •••• 1111", title: "Kartu Kredit / Debit" },
  all: { code: "8808 1234 5678 90", title: "Transfer Bank / Virtual Account" },
};

function payFmtRp(cents) {
  return "Rp" + (Number(cents || 0) / 100).toLocaleString("id-ID");
}

function payStepsFor(method) {
  const t = (k) => I18n.t(k);
  const base = [t("pay.step_amount"), t("pay.step_wait")];
  if (method === "qris") return [t("pay.step_qr"), ...base];
  if (method === "ewallet") return [t("pay.step_ewallet"), ...base];
  if (method === "card") return [t("pay.step_card"), ...base];
  return [t("pay.step_va"), ...base];
}

function payCountdown(dueAt) {
  const el = document.getElementById("pay-countdown");
  if (!dueAt) {
    el.textContent = "—";
    return;
  }
  const tick = () => {
    const ms = new Date(dueAt).getTime() - Date.now();
    if (ms <= 0) {
      el.textContent = I18n.t("pay.expired");
      clearInterval(tick._t);
      return;
    }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  tick();
  tick._t = setInterval(tick, 1000);
}

async function payCheckStatus() {
  try {
    const inv = await API.request("GET", `/billing/invoices/${payInvoiceId}/detail`);
    if (inv.status === "paid") {
      clearInterval(payPollTimer);
      window.location.href = `success.html?invoice=${payInvoiceId}`;
    }
  } catch {}
}

async function loadPay() {
  const params = new URLSearchParams(window.location.search);
  payInvoiceId = Number(params.get("invoice"));
  const method = PAY_METHOD_INFO[params.get("method")] ? params.get("method") : "all";
  const loading = document.getElementById("pay-loading");
  const errBox = document.getElementById("pay-error");
  const content = document.getElementById("pay-content");

  if (!payInvoiceId) {
    loading.classList.add("hidden");
    document.getElementById("pay-error-text").textContent = I18n.t("invoice.not_found");
    errBox.classList.remove("hidden");
    return;
  }

  try {
    const inv = await API.request("GET", `/billing/invoices/${payInvoiceId}/detail`);
    if (inv.status === "paid") {
      window.location.href = `success.html?invoice=${payInvoiceId}`;
      return;
    }
    const info = PAY_METHOD_INFO[method];
    document.getElementById("pay-number").textContent = inv.invoice_number;
    document.getElementById("pay-total").textContent = payFmtRp(inv.amount + inv.tax_amount);
    document.getElementById("pay-method-title").textContent = info.title;
    document.getElementById("pay-code").textContent = info.code;
    const steps = document.getElementById("pay-steps");
    steps.innerHTML = "";
    payStepsFor(method).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      steps.appendChild(li);
    });
    payCountdown(inv.due_at);
    loading.classList.add("hidden");
    content.classList.remove("hidden");
    payPollTimer = setInterval(payCheckStatus, 3000);
  } catch (err) {
    loading.classList.add("hidden");
    document.getElementById("pay-error-text").textContent = err.detail || I18n.t("invoice.not_found");
    errBox.classList.remove("hidden");
  }

  document.getElementById("btn-paid").addEventListener("click", payCheckStatus);
  document.getElementById("btn-mock-pay").addEventListener("click", async () => {
    try {
      await API.request("POST", `/billing/invoices/${payInvoiceId}/mock-confirm`);
      clearInterval(payPollTimer);
      window.location.href = `success.html?invoice=${payInvoiceId}`;
    } catch (err) {
      UI.toast(err.detail || I18n.t("pay.mock_failed"), "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await I18n.init();
  const me = await Auth.ensureAuthenticated();
  if (!me) return;
  loadPay();
});
