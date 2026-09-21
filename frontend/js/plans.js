async function loadPlans() {
  const grid = document.getElementById("plans");
  const errEl = document.getElementById("plans-error");
  try {
    const plans = await API.request("GET", "/billing/plans");
    grid.innerHTML = "";
    errEl.classList.add("hidden");
    plans.forEach((plan) => {
      const card = document.createElement("div");
      const isFree = plan.price_monthly === 0 && plan.price_yearly === 0;
      const monthly = (plan.price_monthly / 100).toLocaleString("id-ID");
      const yearly = (plan.price_yearly / 100).toLocaleString("id-ID");
      card.className = "shadcn-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col";
      card.innerHTML =
        `<h3 class="font-bold text-lg mb-1">${plan.name}</h3>` +
        `<p class="text-sm text-muted-foreground mb-3">${plan.storage_bytes ? (plan.storage_bytes / 1073741824).toFixed(0) + " GB" : ""} ${plan.max_file_bytes ? "• " + (plan.max_file_bytes / 1048576).toFixed(0) + " MB/file" : ""}</p>` +
        `<div class="mb-4"><p class="text-2xl font-black" style="color:var(--primary)">Rp${monthly}<span class="text-sm font-normal text-muted-foreground">/bln</span></p>` +
        `<p class="text-xs text-muted-foreground">Rp${yearly}/thn</p></div>` +
        `<p class="text-sm text-muted-foreground mb-4 flex-1">${plan.description || ""}</p>` +
        `<button class="shadcn-btn shadcn-btn-default w-full py-2.5" data-plan="${plan.id}" data-free="${isFree}">${isFree ? "Mulai Gratis" : "Pilih Paket"}</button>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll("button[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => openCheckoutModal(Number(btn.dataset.plan)));
    });
    const loginBtn = document.getElementById("nav-login");
    const subLink = document.getElementById("nav-my-subscription");
    if (API.getToken && API.getToken()) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (subLink) subLink.classList.remove("hidden");
    }
  } catch (err) {
    errEl.classList.remove("hidden");
    UI.toast("Gagal memuat paket: " + (err.detail || err.message), "error");
  }
}

let pendingPlanId = null;

function openCheckoutModal(planId) {
  pendingPlanId = planId;
  const modal = document.getElementById("checkout-modal");
  modal.classList.remove("hidden");
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal").classList.add("hidden");
  pendingPlanId = null;
}

document.getElementById("btn-confirm-checkout")?.addEventListener("click", async () => {
  if (pendingPlanId == null) return;
  if (!API.getToken || !API.getToken()) {
    UI.toast(I18n.t("plans.login_required") || "Login diperlukan", "info");
    window.location.href = "login.html?next=plans.html";
    return;
  }
  try {
    const result = await API.request("POST", "/billing/checkout", { plan_id: pendingPlanId, cycle: "monthly" });
    if (result.free) {
      UI.toast("Paket gratis diaktifkan.", "success");
      setTimeout(() => (window.location.href = "index.html#billing"), 800);
    } else if (result.snap_token) {
      UI.toast("Checkout dibuat. Snap token: " + result.snap_token, "success");
    } else {
      UI.toast("Invoice dibuat: " + result.invoice_number, "success");
      window.location.href = "index.html#billing";
    }
    closeCheckoutModal();
  } catch (err) {
    UI.toast("Checkout gagal: " + (err.detail || err.message), "error");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await I18n.init();
  loadPlans();
  document.getElementById("btn-theme")?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("cv_theme", isDark ? "dark" : "light");
    document.getElementById("theme-icon-sun")?.classList.toggle("hidden", isDark);
    document.getElementById("theme-icon-moon")?.classList.toggle("hidden", !isDark);
  });
});
