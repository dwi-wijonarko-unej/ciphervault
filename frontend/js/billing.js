const Billing = (() => {
  async function render(container) {
    container.innerHTML = `
      <div class="page-enter max-w-[1100px] mx-auto">
        <h1 class="text-3xl font-black font-heading tracking-tight mb-6" data-i18n="billing.title">Langganan Saya</h1>
        <section id="billing-current-plan" class="bg-surface-card border border-border rounded-lg p-6 mb-6">
          <h2 class="text-lg font-bold mb-3" data-i18n="billing.current">Paket Saat Ini</h2>
          <p id="billing-plan-info" class="text-sm text-secondary">Memuat...</p>
          <p id="billing-usage-info" class="text-sm text-muted mt-2"></p>
          <button id="billing-btn-cancel" class="mt-4 px-4 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 hidden" data-i18n="billing.cancel">Batalkan Langganan</button>
        </section>
        <section class="bg-surface-card border border-border rounded-lg p-6 mb-6">
          <h2 class="text-lg font-bold mb-4" data-i18n="billing.choose">Pilih Paket</h2>
          <div id="billing-plans" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
        </section>
        <section class="bg-surface-card border border-border rounded-lg p-6">
          <h2 class="text-lg font-bold mb-4" data-i18n="billing.history">Riwayat Tagihan</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm"><thead><tr class="text-left text-muted border-b border-border"><th class="pb-2 font-medium" data-i18n="billing.invoice_no">Nomor</th><th class="pb-2 font-medium" data-i18n="billing.amount">Jumlah</th><th class="pb-2 font-medium">PPN</th><th class="pb-2 font-medium" data-i18n="billing.status">Status</th><th class="pb-2 font-medium" data-i18n="common.actions">Aksi</th></tr></thead><tbody id="billing-invoices" class="divide-y divide-border"></tbody></table>
          </div>
        </section>
      </div>
      <div id="billing-checkout-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[8000] hidden flex items-center justify-center p-5" onclick="if(event.target===this)Billing.closeModal()">
        <div class="bg-surface-card border border-border rounded-xl shadow-2xl w-full max-w-[420px] p-6">
          <h3 class="text-lg font-bold mb-2" id="billing-modal-name">Paket</h3>
          <p class="text-sm text-muted mb-4" id="billing-modal-desc"></p>
          <div class="flex gap-3">
            <button class="flex-1 py-2.5 rounded-md text-sm font-semibold text-white" style="background:var(--primary)" id="billing-btn-confirm" data-i18n="common.confirm">Konfirmasi</button>
            <button class="flex-1 py-2.5 rounded-md text-sm font-medium border border-border" onclick="Billing.closeModal()" data-i18n="common.cancel">Batal</button>
          </div>
        </div>
      </div>
    `;
    I18n.applyDynamic();
    document.getElementById("billing-btn-confirm")?.addEventListener("click", checkoutPending);
    await loadBilling();
  }

  let pendingPlanId = null;

  function openModal(planId, planName) {
    pendingPlanId = planId;
    const nameEl = document.getElementById("billing-modal-name");
    if (nameEl && planName) nameEl.textContent = planName;
    document.getElementById("billing-checkout-modal")?.classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("billing-checkout-modal")?.classList.add("hidden");
    pendingPlanId = null;
  }

  async function loadBilling() {
    try {
      const plans = await API.request("GET", "/billing/plans");
      const grid = document.getElementById("billing-plans");
      grid.innerHTML = "";
      plans.forEach((plan) => {
        const card = document.createElement("div");
        card.className = "border border-border rounded-lg p-5 bg-surface hover:bg-surface-hover transition-colors";
        const monthly = (plan.price_monthly / 100).toLocaleString("id-ID");
        card.innerHTML =
          `<h3 class="font-bold text-base mb-1">${plan.name}</h3>` +
          `<p class="text-lg font-black mb-2" style="color:var(--primary)">Rp${monthly}<span class="text-sm font-normal text-muted">/bln</span></p>` +
          `<p class="text-sm text-secondary mb-4">${(plan.storage_bytes / 1073741824).toFixed(0)} GB penyimpanan</p>` +
          `<button class="w-full py-2 rounded-md text-sm font-semibold text-white" style="background:var(--primary)" data-plan="${plan.id}" data-name="${plan.name}">Pilih</button>`;
        grid.appendChild(card);
      });
      grid.querySelectorAll("button[data-plan]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(Number(btn.dataset.plan), btn.dataset.name));
      });
    } catch (err) {
      UI.toast("Gagal memuat paket: " + (err.detail || err.message), "error");
    }

    try {
      const sub = await API.request("GET", "/billing/subscription");
      const infoEl = document.getElementById("billing-plan-info");
      infoEl.textContent = sub ? `Plan ID ${sub.plan_id} — status ${sub.status}` : "Belum berlangganan (paket gratis).";
      const cancel = document.getElementById("billing-btn-cancel");
      if (sub && (sub.status === "active" || sub.status === "trial")) {
        cancel.classList.remove("hidden");
        cancel.onclick = async () => {
          await API.request("POST", "/billing/subscription/cancel");
          UI.toast("Langganan akan berakhir di akhir periode.", "success");
          loadBilling();
        };
      } else {
        cancel.classList.add("hidden");
      }
    } catch {
      const infoEl = document.getElementById("billing-plan-info");
      if (infoEl) infoEl.textContent = "Belum berlangganan.";
    }

    try {
      const usage = await API.request("GET", "/billing/usage");
      const usageEl = document.getElementById("billing-usage-info");
      if (usageEl) usageEl.textContent = `Terpakai ${(usage.storage_used_bytes / 1048576).toFixed(1)} MB dari ${(usage.storage_quota_bytes / 1073741824).toFixed(1)} GB (${usage.plan_name}).`;
    } catch {}

    try {
      const invoices = await API.request("GET", "/billing/invoices");
      const body = document.getElementById("billing-invoices");
      body.innerHTML = "";
      invoices.forEach((inv) => {
        const row = document.createElement("tr");
        row.className = "border-b border-border last:border-0";
        const total = ((inv.amount + inv.tax_amount) / 100).toLocaleString("id-ID");
        const tax = (inv.tax_amount / 100).toLocaleString("id-ID");
        const statusColor = inv.status === "paid" ? "text-green-600" : inv.status === "pending" ? "text-yellow-600" : "text-muted";
        row.innerHTML =
          `<td class="py-2">${inv.invoice_number}</td><td class="py-2">Rp${total}</td>` +
          `<td class="py-2">Rp${tax}</td><td class="py-2 ${statusColor}">${inv.status}</td>` +
          `<td class="py-2"><button class="text-sm hover:underline" style="color:var(--primary)" data-invoice="${inv.id}">PDF</button></td>`;
        body.appendChild(row);
      });
      body.querySelectorAll("button[data-invoice]").forEach((btn) => {
        btn.addEventListener("click", () => downloadInvoice(Number(btn.dataset.invoice)));
      });
    } catch {}
  }

  async function downloadInvoice(invoiceId) {
    try {
      const token = API.getToken();
      const res = await fetch(`/billing/invoices/${invoiceId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Gagal mengunduh invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      const cd = res.headers.get("Content-Disposition");
      if (cd) {
        const m = cd.match(/filename="?([^"]+)"?/);
        if (m) a.download = m[1];
      }
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      UI.toast("Gagal mengunduh PDF: " + (err.detail || err.message), "error");
    }
  }

  async function checkoutPending() {
    if (pendingPlanId == null) return;
    try {
      const result = await API.request("POST", "/billing/checkout", { plan_id: pendingPlanId, cycle: "monthly" });
      if (result.free) UI.toast("Paket gratis diaktifkan.", "success");
      else if (result.snap_token) UI.toast("Checkout dibuat. Snap token: " + result.snap_token, "success");
      else UI.toast("Invoice dibuat: " + result.invoice_number, "success");
      closeModal();
      loadBilling();
    } catch (err) {
      UI.toast("Checkout gagal: " + (err.detail || err.message), "error");
    }
  }

  return { render, closeModal, checkoutPending };
})();
window.Billing = Billing;
