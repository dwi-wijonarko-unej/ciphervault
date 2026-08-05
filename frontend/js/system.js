const SystemPage = (() => {
  async function render(container) {
    container.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div></div>';
    try {
      const config = await API.request("GET", "/system/config");
      const status = await API.request("GET", "/system/status");

      container.innerHTML = `
        <div class="page-enter">
          <div class="mb-6">
            <h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("system.title")}</h1>
            <p class="text-sm text-muted mt-1">${I18n.t("system.subtitle")}</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <div class="space-y-6">
              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ${I18n.t("system.encryption_engine")}
                </h3>
                <div class="space-y-2.5">
                  ${renderConfigRow(I18n.t("system.ai_mode"), config.ai_mode, I18n.t("system.ai_mode_hint"))}
                  ${renderConfigRow(I18n.t("system.adaptive_r"), String(config.ai_adaptive_r), I18n.t("system.adaptive_r_hint"))}
                  ${renderConfigRow(I18n.t("system.layer2"), config.layer2_algorithm, I18n.t("system.layer2_hint"))}
                  ${renderConfigRow(I18n.t("system.uhc_modulus"), config.uhc_modulus, I18n.t("system.uhc_modulus_hint"))}
                  ${renderConfigRow(I18n.t("system.matrix_size"), config.uhc_matrix_size, I18n.t("system.matrix_size_hint"))}
                  ${renderConfigRow(I18n.t("system.logistic_r"), config.uhc_logistic_r, I18n.t("system.logistic_r_hint"))}
                  ${renderConfigRow(I18n.t("system.session_key"), config.session_key_bytes + " bytes", I18n.t("system.session_key_hint"))}
                  ${renderConfigRow(I18n.t("system.pbkdf2"), config.pbkdf2_iterations + " " + I18n.t("common.iterations"), I18n.t("system.pbkdf2_hint"))}
                </div>
              </div>

              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  ${I18n.t("system.security_summary")}
                </h3>
                <div class="space-y-2.5">
                  <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-sm text-muted">${I18n.t("system.encryption_layers")}</span>
                    <span class="text-sm font-medium">UHC + ${config.layer2_algorithm || "AES + RSA"}</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-sm text-muted">${I18n.t("system.ai_mode")}</span>
                    <span class="text-sm font-medium">${config.ai_mode || "multi_feature_adaptive"}${config.ai_adaptive_r ? " (adaptive-r)" : ""}</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-sm text-muted">${I18n.t("system.integrity")}</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success);">SHA-256</span>
                  </div>
                  <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-muted">${I18n.t("system.key_storage")}</span>
                    <span class="text-sm font-medium">${I18n.t("system.wrapped_rsa")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  ${I18n.t("system.rsa_keys")}
                </h3>
                <div class="space-y-2.5">
                  ${renderConfigRow(I18n.t("system.status"), status.rsa_status === "ready" ? I18n.t("system.generated") : I18n.t("system.not_generated"), "")}
                  ${renderConfigRow(I18n.t("system.key_size"), status.rsa_key_size + "-bit", "")}
                  ${renderConfigRow(I18n.t("system.fingerprint"), status.rsa_fingerprint || "—", I18n.t("system.rsa_hint"))}
                  ${renderConfigRow(I18n.t("system.generated_at"), status.rsa_generated_at || "—", "")}
                </div>
              </div>

              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  ${I18n.t("system.storage")}
                </h3>
                <div class="space-y-2.5">
                  ${renderConfigRow(I18n.t("system.files_label"), status.storage_files || "0", "")}
                  ${renderConfigRow(I18n.t("system.used"), status.storage_used || "0 MB", "")}
                  ${renderConfigRow(I18n.t("system.limit"), status.storage_limit || "—", "")}
                  ${renderConfigRow(I18n.t("system.database"), status.database || "SQLite", "")}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch {
      container.innerHTML =
        `<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-error">${I18n.t("system.load_error")}</p></div>`;
    }
  }

  function renderConfigRow(label, value, hint) {
    return `
      <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
        <div>
          <span class="text-sm text-muted">${label}</span>
          ${hint ? `<p class="meta mt-0.5">${hint}</p>` : ""}
        </div>
        <span class="text-sm font-medium">${value}</span>
      </div>
    `;
  }

  return { render };
})();
