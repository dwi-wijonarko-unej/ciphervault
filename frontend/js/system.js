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
            <h1 class="text-3xl font-black font-heading tracking-tight">System Configuration</h1>
            <p class="text-sm text-muted mt-1">All encryption parameters are configurable via .env</p>
          </div>

          <!-- Asymmetrical 60/40 layout per design guide -->
          <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <!-- LEFT 60%: Encryption Config + Security Summary -->
            <div class="space-y-6">
              <!-- Encryption Engine Config -->
              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Encryption Engine
                </h3>
                <div class="space-y-2.5">
                  ${renderConfigRow("AI Mode", config.ai_mode, "multi_feature_adaptive atau legacy")}
                  ${renderConfigRow("Adaptive R", String(config.ai_adaptive_r), "true = entropy-based logistic r")}
                  ${renderConfigRow("Layer 2", config.layer2_algorithm, "hybrid = AES data + RSA key wrap")}
                  ${renderConfigRow("UHC Modulus", config.uhc_modulus, "257 (prime) or 256")}
                  ${renderConfigRow("Matrix Size", config.uhc_matrix_size, "Auto-selected or fixed")}
                  ${renderConfigRow("Logistic R", config.uhc_logistic_r, "Chaos parameter 3.5-4.0")}
                  ${renderConfigRow("Session Key", config.session_key_bytes + " bytes", "Random per file")}
                  ${renderConfigRow("PBKDF2", config.pbkdf2_iterations + " iterations", "Key derivation")}
                </div>
              </div>

              <!-- Security Summary -->
              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Security Summary
                </h3>
                <div class="space-y-2.5">
                  <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-sm text-muted">Encryption Layers</span>
                    <span class="text-sm font-medium">UHC + ${config.layer2_algorithm || "AES + RSA"}</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-sm text-muted">AI Mode</span>
                    <span class="text-sm font-medium">${config.ai_mode || "multi_feature_adaptive"}${config.ai_adaptive_r ? " (adaptive-r)" : ""}</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-sm text-muted">Integrity</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success);">SHA-256</span>
                  </div>
                  <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-muted">Key Storage</span>
                    <span class="text-sm font-medium">Wrapped + RSA Encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT 40%: RSA Keys + Storage -->
            <div class="space-y-6">
              <!-- RSA Keys -->
              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  RSA Keys (Global Server)
                </h3>
                <div class="space-y-2.5">
                  ${renderConfigRow("Status", status.rsa_status === "ready" ? "✅ Generated" : "❌ Not Generated", "")}
                  ${renderConfigRow("Key Size", status.rsa_key_size + "-bit", "")}
                  ${renderConfigRow("Fingerprint", status.rsa_fingerprint || "—", "SHA-256 of public key")}
                  ${renderConfigRow("Generated", status.rsa_generated_at || "—", "")}
                </div>
              </div>

              <!-- Storage -->
              <div class="bg-surface-card border border-border rounded-lg p-5">
                <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  Storage
                </h3>
                <div class="space-y-2.5">
                  ${renderConfigRow("Files", status.storage_files || "0", "")}
                  ${renderConfigRow("Used", status.storage_used || "0 MB", "")}
                  ${renderConfigRow("Limit", status.storage_limit || "—", "")}
                  ${renderConfigRow("Database", status.database || "SQLite", "")}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch {
      container.innerHTML =
        '<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-error">Failed to load system configuration.</p></div>';
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
