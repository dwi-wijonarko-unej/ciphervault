let coPlan = null;
let coCycle = "monthly";
let coMethod = "all";

function coFmtRp(cents) {
  return "Rp" + (Number(cents || 0) / 100).toLocaleString("id-ID");
}

function coActiveBtn(selector, attr, value) {
  document.querySelectorAll(selector).forEach((btn) => {
    const on = btn.dataset[attr] === value;
    btn.style.borderColor = on ? "var(--brand)" : "var(--border)";
    btn.style.background = on ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "transparent";
  });
}

function coRenderSummary() {
  if (!coPlan) return;
  const amount = coCycle === "monthly" ? coPlan.price_monthly : coPlan.price_yearly;
  const tax = Math.round(amount * 0.11);
  document.getElementById("co-plan-initial").textContent = coPlan.name[0].toUpperCase();
  document.getElementById("co-plan-name").textContent = coPlan.name;
  document.getElementById("co-plan-storage").textContent =
    `${(coPlan.storage_bytes / 1073741824).toFixed(0)} GB • ${(coPlan.max_file_bytes / 1048576).toFixed(0)} MB/file`;
  document.getElementById("co-cycle-label").textContent =
    coCycle === "monthly" ? I18n.t("checkout.monthly") : I18n.t("checkout.yearly");
  document.getElementById("co-subtotal").textContent = coFmtRp(amount);
  document.getElementById("co-tax").textContent = coFmtRp(tax);
  document.getElementById("co-total").textContent = coFmtRp(amount + tax);
  document.getElementById("co-price-monthly").textContent = `${coFmtRp(coPlan.price_monthly)}/bln`;
  document.getElementById("co-price-yearly").textContent = `${coFmtRp(coPlan.price_yearly)}/thn`;
  document.getElementById("co-method-card").style.display = amount <= 0 ? "none" : "";
  coActiveBtn(".co-cycle-btn", "cycle", coCycle);
  coActiveBtn(".co-method-btn", "method", coMethod);
}

async function loadCheckout() {
  const params = new URLSearchParams(window.location.search);
  const planId = Number(params.get("plan"));
  coCycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";
  const loading = document.getElementById("checkout-loading");
  const errBox = document.getElementById("checkout-error");
  const content = document.getElementById("checkout-content");

  try {
    const plans = await API.request("GET", "/billing/plans");
    coPlan = plans.find((p) => p.id === planId);
    if (!coPlan) throw new Error(I18n.t("checkout.plan_not_found"));
    loading.classList.add("hidden");
    content.classList.remove("hidden");
    coRenderSummary();
  } catch (err) {
    loading.classList.add("hidden");
    document.getElementById("checkout-error-text").textContent = err.detail || err.message;
    errBox.classList.remove("hidden");
  }

  document.querySelectorAll(".co-cycle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      coCycle = btn.dataset.cycle;
      coRenderSummary();
    });
  });
  document.querySelectorAll(".co-method-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      coMethod = btn.dataset.method;
      coRenderSummary();
    });
  });
  document.getElementById("btn-pay").addEventListener("click", async () => {
    try {
      const result = await API.request("POST", "/billing/checkout", {
        plan_id: coPlan.id,
        cycle: coCycle,
        payment_method: coMethod,
      });
      if (result.free) {
        UI.toast(I18n.t("checkout.free_activated"), "success");
        setTimeout(() => (window.location.href = "index.html#billing"), 800);
      } else if (result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        window.location.href = `pay.html?invoice=${result.invoice_id}&method=${coMethod}&mock=1`;
      }
    } catch (err) {
      UI.toast(I18n.t("checkout.failed") + ": " + (err.detail || err.message), "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await I18n.init();
  const me = await Auth.ensureAuthenticated();
  if (!me) return;
  loadCheckout();
});
