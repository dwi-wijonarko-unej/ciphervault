const Profile = (() => {
  async function render(container, user) {
    if (!user) return;
    container.innerHTML = `
      <div class="page-enter">
        <div class="mb-6">
          <h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("profile.title")}</h1>
          <p class="text-sm text-muted mt-1">${I18n.t("profile.subtitle")}</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
          <div class="space-y-6">
            <div class="bg-surface-card border border-border rounded-lg p-5">
              <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                 ${I18n.t("profile.account")}
              </h3>
              <div class="space-y-2.5">
                <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("profile.username")}</span><span class="text-sm font-medium">${escapeHtml(user.username)}</span></div>
                <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("profile.email")}</span><span class="text-sm font-medium truncate ml-2">${escapeHtml(user.email || "—")}</span></div>
                <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("profile.role")}</span><span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${user.role === "admin" ? "" : ""}" style="background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary);">${user.role}</span></div>
                <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("profile.status")}</span><span class="text-sm font-medium" style="color: var(--success);">${user.is_active ? I18n.t("common.active") : I18n.t("common.inactive")}</span></div>
                <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("profile.member_since")}</span><span class="text-sm font-medium">${formatDate(user.created_at)}</span></div>
              </div>
            </div>

            <div class="bg-surface-card border border-border rounded-lg p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                   ${I18n.t("profile.api_keys")}
                </h3>
                <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" style="background: var(--primary);" onclick="Profile.openCreateKeyModal()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                   ${I18n.t("profile.generate")}
                </button>
              </div>
              <div id="api-keys-list" class="space-y-2"></div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="bg-surface-card border border-border rounded-lg p-5">
              <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                 ${I18n.t("profile.api_guide")}
              </h3>
              <p class="text-sm text-secondary mb-3">${I18n.t("profile.api_guide_desc")} <code class="px-1.5 py-0.5 rounded text-xs font-mono" style="background: var(--surface); color: var(--primary);">X-API-Key</code> ${I18n.t("profile.api_guide_header")}</p>
              <div class="bg-surface border border-border rounded-lg p-4 mb-3">
                <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">${I18n.t("profile.upload_python")}</div>
                <pre class="text-xs overflow-x-auto whitespace-pre-wrap font-mono" style="color: var(--text-primary);">import requests

resp = requests.post(
    "http://localhost:8000/files/upload",
    headers={"X-API-Key": "cv_your_key_here"},
    files={"file": open("document.pdf", "rb")},
)
print(resp.json())</pre>
              </div>
              <div class="bg-surface border border-border rounded-lg p-4 mb-3">
                <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">${I18n.t("profile.list_curl")}</div>
                <pre class="text-xs overflow-x-auto whitespace-pre-wrap font-mono" style="color: var(--text-primary);">curl -H "X-API-Key: cv_your_key_here" \\
  http://localhost:8000/files</pre>
              </div>
              <div class="bg-surface border border-border rounded-lg p-4">
                <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">${I18n.t("profile.download_curl")}</div>
                <pre class="text-xs overflow-x-auto whitespace-pre-wrap font-mono" style="color: var(--text-primary);">curl -H "X-API-Key: cv_your_key_here" \\
  -o decrypted_file.pdf \\
  http://localhost:8000/files/1/download</pre>
              </div>
            </div>

            <div class="bg-surface-card border border-border rounded-lg p-5">
              <h3 class="text-base font-semibold mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                 ${I18n.t("profile.public_links")}
              </h3>
              <p class="text-sm text-secondary">${I18n.t("profile.public_links_desc")}</p>
            </div>
          </div>
        </div>
      </div>
    `;
    await loadApiKeys();
  }

  async function loadApiKeys() {
    const list = document.getElementById("api-keys-list");
    if (!list) return;
    list.innerHTML =
      `<div class="text-xs text-muted text-center py-3">${I18n.t("common.loading")}</div>`;
    try {
      const res = await API.request("GET", "/api-keys");
      if (!res.keys || res.keys.length === 0) {
        list.innerHTML = `<p class="text-xs text-muted text-center py-4">${I18n.t("profile.no_keys")}</p>`;
        return;
      }
      list.innerHTML = res.keys
        .map((key) => {
          const expired =
            key.expires_at && new Date(key.expires_at) < new Date();
          return `
          <div class="flex items-center justify-between p-3 bg-surface border border-border rounded-md">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">${escapeHtml(key.label)}</span>
                ${key.is_active && !expired ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full" style="background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success);">${I18n.t("common.active")}</span>` : `<span class="text-[10px] px-1.5 py-0.5 rounded-full" style="background: color-mix(in srgb, var(--error) 15%, transparent); color: var(--error);">${I18n.t("common.expired")}</span>`}
              </div>
              <div class="text-xs text-muted font-mono mt-0.5">${key.key_prefix}••••••••</div>
              <div class="text-[10px] text-muted mt-0.5">
                ${key.last_used ? `${I18n.t("profile.last_used")} ${formatDate(key.last_used)}` : I18n.t("common.never")}
                ${key.expires_at ? ` · ${I18n.t("profile.expires_label")} ${formatDate(key.expires_at)}` : ` · ${I18n.t("common.no_expiry")}`}
              </div>
            </div>
            <button class="p-2 rounded-md text-muted hover:text-error hover:bg-[rgba(196,69,69,0.08)] transition-all cursor-pointer bg-transparent border-none flex-shrink-0" onclick="Profile.revokeKey(${key.id})" title="${I18n.t("profile.revoke")}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>`;
        })
        .join("");
    } catch (e) {
      list.innerHTML = `<p class="text-xs" style="color: var(--error);">${e.detail || I18n.t("profile.load_keys_error")}</p>`;
    }
  }

  function openCreateKeyModal() {
    UI.modal(
      I18n.t("profile.generate_title"),
      `
        <p class="text-secondary mb-4">${I18n.t("profile.generate_desc")}</p>
        <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">${I18n.t("profile.label")}</label>
        <input class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" id="key-label" placeholder="${I18n.t("profile.label_placeholder")}" value="default" autocomplete="off">
        <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5 mt-4">${I18n.t("profile.expires_days")}</label>
        <input class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" id="key-expires" type="number" placeholder="${I18n.t("profile.expires_days_placeholder")}" min="1" max="3650">
        <div id="key-result" class="mt-4"></div>
      `,
      `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">${I18n.t("common.close")}</button>
       <button class="px-4 py-2 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" id="btn-generate-key" style="background: var(--primary);">${I18n.t("profile.generate_button")}</button>`,
    );

    setTimeout(() => {
      const btn = document.getElementById("btn-generate-key");
      const labelInput = document.getElementById("key-label");
      const expiresInput = document.getElementById("key-expires");
      const result = document.getElementById("key-result");

      if (btn) {
        btn.addEventListener("click", async () => {
          const label = labelInput.value.trim() || "default";
          btn.disabled = true;
          btn.textContent = I18n.t("profile.generating");
          try {
            const body = { label };
            const days = parseInt(expiresInput.value);
            if (days > 0) body.expires_in_days = days;
            const res = await API.request("POST", "/api-keys", body);
            result.innerHTML = `
              <div class="p-4 rounded-md border-2" style="border-color: var(--success); background: color-mix(in srgb, var(--success) 5%, transparent);">
                <div class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: var(--success);">${I18n.t("profile.key_warning")}</div>
                <div class="flex items-center gap-2">
                  <code class="flex-1 text-xs font-mono break-all bg-surface px-3 py-2 rounded border border-border" style="color: var(--primary);">${escapeHtml(res.key)}</code>
                  <button class="px-3 py-2 rounded-md text-xs font-medium hover:bg-surface-hover transition-all cursor-pointer bg-transparent border border-border" onclick="navigator.clipboard.writeText('${res.key}'); UI.toast('${I18n.t("profile.link_copied")}', 'success', 2000)">${I18n.t("common.copy")}</button>
                </div>
              </div>`;
            btn.style.display = "none";
            UI.toast(I18n.t("profile.key_generated"), "success");
            loadApiKeys();
          } catch (e) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">${e.detail || I18n.t("profile.key_generate_failed")}</p>`;
            btn.disabled = false;
            btn.textContent = I18n.t("profile.generate_button");
          }
        });
        labelInput.focus();
        labelInput.select();
      }
    }, 100);
  }

  async function revokeKey(keyId) {
    const confirmed = await UI.confirmDialog(
      I18n.t("profile.revoke_key_confirm"),
    );
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request("DELETE", `/api-keys/${keyId}`);
      UI.toast(I18n.t("profile.key_revoked"), "success");
      loadApiKeys();
    } catch (e) {
      UI.toast(e.detail || I18n.t("profile.revoke_key_failed"), "error");
    } finally {
      UI.loading(false);
    }
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { render, openCreateKeyModal, revokeKey, loadApiKeys };
})();

const PublicLinkUI = (() => {
  async function openModal(fileId, fileName) {
    UI.modal(
      I18n.t("profile.public_link_title"),
      `
        <p class="text-secondary mb-4">${I18n.t("profile.public_link_desc")} <strong>"${escapeHtml(fileName)}"</strong>. ${I18n.t("profile.public_link_no_login")}</p>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">${I18n.t("profile.pwd_optional")}</label>
            <input class="w-full px-3 py-2 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f]" id="pl-password" type="text" placeholder="${I18n.t("common.no_password")}">
          </div>
          <div>
            <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">${I18n.t("profile.max_downloads")}</label>
            <input class="w-full px-3 py-2 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f]" id="pl-max" type="number" placeholder="${I18n.t("common.unlimited_short")}" min="1">
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">${I18n.t("profile.expires_hours")}</label>
          <input class="w-full px-3 py-2 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f]" id="pl-expires" type="number" placeholder="${I18n.t("common.no_expiry")}" min="1">
        </div>
        <button class="mt-4 w-full px-4 py-2.5 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" id="btn-create-pl" style="background: var(--primary);">${I18n.t("profile.create_link_button")}</button>
        <div id="pl-result" class="mt-3"></div>
        <div id="pl-existing" class="mt-4"></div>
      `,
      `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">${I18n.t("common.close")}</button>`,
    );

    setTimeout(() => {
      const btn = document.getElementById("btn-create-pl");
      if (btn) {
        btn.addEventListener("click", () =>
          createLink(fileId),
        );
      }
      loadExistingLinks(fileId);
    }, 100);
  }

  async function createLink(fileId) {
    const btn = document.getElementById("btn-create-pl");
    const result = document.getElementById("pl-result");
    const body = {};
    const pw = document.getElementById("pl-password").value.trim();
    const max = parseInt(document.getElementById("pl-max").value);
    const hours = parseInt(document.getElementById("pl-expires").value);
    if (pw) body.password = pw;
    if (max > 0) body.max_access = max;
    if (hours > 0) body.expires_in_hours = hours;

    btn.disabled = true;
    btn.textContent = I18n.t("profile.creating_link");
    try {
      const res = await API.request(
        "POST",
        `/files/${fileId}/public-link`,
        body,
      );
      const baseUrl = API.getBaseUrl();
      const fullUrl = `${baseUrl}${res.url}`;
      result.innerHTML = `
        <div class="p-4 rounded-md border-2" style="border-color: var(--success); background: color-mix(in srgb, var(--success) 5%, transparent);">
          <div class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: var(--success);">${I18n.t("profile.link_created")}</div>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-xs font-mono break-all bg-surface px-3 py-2 rounded border border-border" style="color: var(--primary);">${fullUrl}</code>
            <button class="px-3 py-2 rounded-md text-xs font-medium hover:bg-surface-hover transition-all cursor-pointer bg-transparent border border-border" onclick="navigator.clipboard.writeText('${fullUrl}'); UI.toast('${I18n.t("common.copied")}', 'success', 2000)">${I18n.t("common.copy")}</button>
          </div>
          ${res.has_password ? `<div class="text-xs text-muted mt-2">${I18n.t("profile.link_password_protected")}</div>` : ""}
          ${res.max_access ? `<div class="text-xs text-muted mt-1">${I18n.t("profile.max_downloads_label")} ${res.max_access}</div>` : ""}
        </div>`;
      btn.style.display = "none";
      UI.toast(I18n.t("profile.link_created_ok"), "success");
      loadExistingLinks(fileId);
    } catch (e) {
      result.innerHTML = `<p class="text-xs" style="color: var(--error);">${e.detail || I18n.t("profile.link_create_failed")}</p>`;
      btn.disabled = false;
      btn.textContent = I18n.t("profile.create_link_button");
    }
  }

  async function loadExistingLinks(fileId) {
    const area = document.getElementById("pl-existing");
    if (!area) return;
    try {
      const res = await API.request("GET", `/files/${fileId}/public-links`);
      if (!res.links || res.links.length === 0) {
        area.innerHTML = "";
        return;
      }
      const baseUrl = API.getBaseUrl();
      area.innerHTML = `
        <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">${I18n.t("profile.existing_links")}</div>
        ${res.links
          .map((link) => {
            const url = `${baseUrl}${link.url}`;
            return `
            <div class="flex items-center justify-between p-2.5 bg-surface border border-border rounded-md mb-1.5">
              <div class="min-w-0 flex-1">
                <code class="text-xs font-mono break-all">${url.substring(0, 60)}...</code>
                <div class="text-[10px] text-muted mt-0.5">
                  ${link.access_count} ${I18n.t("profile.downloads_label")}
                  ${link.has_password ? ` · ${I18n.t("profile.link_password")}` : ""}
                  ${link.expires_at ? ` · ${I18n.t("profile.expires_label")} ${formatDate(link.expires_at)}` : ""}
                </div>
              </div>
              <button class="p-1.5 rounded-md text-muted hover:text-error hover:bg-[rgba(196,69,69,0.08)] transition-all cursor-pointer bg-transparent border-none flex-shrink-0" onclick="PublicLinkUI.revoke(${link.id}, ${fileId})" title="${I18n.t("profile.revoke")}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>`;
          })
          .join("")}`;
    } catch {
      area.innerHTML = "";
    }
  }

  async function revoke(linkId, fileId) {
    const confirmed = await UI.confirmDialog(
      I18n.t("profile.revoke_link_confirm"),
    );
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request("DELETE", `/public-links/${linkId}`);
      UI.toast(I18n.t("profile.link_revoked"), "success");
      loadExistingLinks(fileId);
    } catch (e) {
      UI.toast(e.detail || I18n.t("profile.revoke_link_failed"), "error");
    } finally {
      UI.loading(false);
    }
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { openModal, revoke };
})();
