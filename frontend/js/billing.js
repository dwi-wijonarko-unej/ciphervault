async function loadBilling() {
  try {
    const plans = await API.request("GET", "/billing/plans");
    const grid = document.getElementById("plans");
    grid.innerHTML = "";
    plans.forEach((plan) => {
      const card = document.createElement("div");
      card.className = "plan-card";
      const monthly = (plan.price_monthly / 100).toLocaleString("id-ID");
      card.innerHTML =
        `<h3>${plan.name}</h3>` +
        `<p class="price">Rp${monthly}/bln</p>` +
        `<p>${(plan.storage_bytes / 1073741824).toFixed(0)} GB penyimpanan</p>` +
        `<button class="btn btn-primary" data-plan="${plan.id}">Pilih</button>`;
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
      row.innerHTML =
        `<td>${inv.invoice_number}</td><td>Rp${((inv.amount + inv.tax_amount) / 100).toLocaleString("id-ID")}</td>` +
        `<td>Rp${(inv.tax_amount / 100).toLocaleString("id-ID")}</td><td>${inv.status}</td>` +
        `<td><a href="/billing/invoices/${inv.id}" target="_blank">PDF</a></td>`;
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
