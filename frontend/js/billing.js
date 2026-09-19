async function loadBilling() {
  try {
    const plans = await API.request("GET", "/billing/plans");
    const grid = document.getElementById("plans");
    grid.innerHTML = "";
    plans.forEach((plan) => {
      const card = document.createElement("div");
      card.className = "border border-border rounded-lg p-5 bg-surface hover:bg-surface-hover transition-colors";
      const monthly = (plan.price_monthly / 100).toLocaleString("id-ID");
      card.innerHTML =
        `<h3 class="font-bold text-base mb-1">${plan.name}</h3>` +
        `<p class="text-lg font-black mb-2" style="color:var(--primary)">Rp${monthly}<span class="text-sm font-normal text-muted">/bln</span></p>` +
        `<p class="text-sm text-secondary mb-4">${(plan.storage_bytes / 1073741824).toFixed(0)} GB penyimpanan</p>` +
        `<button class="w-full py-2 rounded-md text-sm font-semibold text-white" style="background:var(--primary)" data-plan="${plan.id}">Pilih</button>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll("button[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => checkoutPlan(Number(btn.dataset.plan)));
    });
  } catch (err) {
    UI.toast("Gagal memuat paket: " + err.message, "error");
  }

  try {
    const sub = await API.request("GET", "/billing/subscription");
    document.getElementById("plan-info").textContent = sub
      ? `Plan ID ${sub.plan_id} — status ${sub.status}`
      : "Belum berlangganan (paket gratis).";
    if (sub && (sub.status === "active" || sub.status === "trial")) {
      const cancel = document.getElementById("btn-cancel");
      cancel.style.display = "";
      cancel.onclick = async () => {
        await API.request("POST", "/billing/subscription/cancel");
        UI.toast("Langganan akan berakhir di akhir periode.", "success");
        loadBilling();
      };
    }
  } catch (err) {
    document.getElementById("plan-info").textContent = "Belum berlangganan.";
  }

  try {
    const usage = await API.request("GET", "/billing/usage");
    document.getElementById("usage-info").textContent =
      `Terpakai ${(usage.storage_used_bytes / 1048576).toFixed(1)} MB ` +
      `dari ${(usage.storage_quota_bytes / 1073741824).toFixed(1)} GB (${usage.plan_name}).`;
  } catch (err) {
    /* ignore */
  }

  try {
    const invoices = await API.request("GET", "/billing/invoices");
    const body = document.getElementById("invoices");
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
        `<td class="py-2"><a href="/billing/invoices/${inv.id}" target="_blank" class="text-sm hover:underline" style="color:var(--primary)">PDF</a></td>`;
      body.appendChild(row);
    });
  } catch (err) {
    /* ignore */
  }
}

async function checkoutPlan(planId) {
  try {
    const result = await API.request("POST", "/billing/checkout", { plan_id: planId, cycle: "monthly" });
    if (result.free) {
      UI.toast("Paket gratis diaktifkan.", "success");
    } else if (result.snap_token) {
      UI.toast("Checkout dibuat. Snap token: " + result.snap_token, "success");
    } else {
      UI.toast("Invoice dibuat: " + result.invoice_number, "success");
    }
    loadBilling();
  } catch (err) {
    UI.toast("Checkout gagal: " + err.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", loadBilling);
