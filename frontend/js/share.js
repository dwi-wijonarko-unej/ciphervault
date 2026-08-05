const ShareUI = (() => {
  async function openShareModal(fileId, fileName) {
    UI.modal(
      I18n.t("share.title"),
      `
        <p class="text-secondary mb-4">${I18n.t("share.desc_prefix")} <strong>"${fileName}"</strong> ${I18n.t("share.desc_suffix")}</p>
        <div class="flex items-center gap-2">
          <div class="flex-1">
            <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">${I18n.t("share.recipient")}</label>
            <input class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" id="share-recipient" placeholder="${I18n.t("share.recipient_placeholder")}" autocomplete="off">
          </div>
          <button class="mt-6 px-5 py-2.5 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none flex items-center gap-2" id="btn-share-confirm" style="background: var(--primary);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            ${I18n.t("share.share_button")}
          </button>
        </div>
        <div class="mt-3">
          <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">${I18n.t("share.expires")}</label>
          <input class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" id="share-expires" type="number" placeholder="${I18n.t("share.expires_placeholder")}" min="1" max="720">
        </div>
        <div id="share-result" class="mt-3"></div>
      `,
      `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">${I18n.t("common.cancel")}</button>`,
    );

    setTimeout(() => {
      const btn = document.getElementById("btn-share-confirm");
      const input = document.getElementById("share-recipient");
      const expires = document.getElementById("share-expires");
      const result = document.getElementById("share-result");

      if (btn && input) {
        btn.addEventListener("click", async () => {
          const recipient = input.value.trim();
          if (!recipient) {
            result.innerHTML =
              `<p class="text-xs" style="color: var(--error);">${I18n.t("share.enter_recipient")}</p>`;
            return;
          }
          btn.disabled = true;
          btn.innerHTML =
            `<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> ${I18n.t("share.sharing")}`;
          try {
            const body = { recipient_username: recipient };
            const hours = parseInt(expires?.value);
            if (hours > 0) body.expires_in_hours = hours;
            const res = await API.request(
              "POST",
              `/files/${fileId}/share`,
              body,
            );
            result.innerHTML = `<p class="text-xs" style="color: var(--success);">${I18n.t("share.success_prefix")} <strong>${res.recipient.username}</strong>. ${I18n.t("share.token_label")} <code class="bg-surface px-1.5 py-0.5 rounded text-[10px] font-mono">${res.access_token.substring(0, 16)}...</code></p>`;
            UI.toast(I18n.t("share.success_prefix") + " " + res.recipient.username, "success");
          } catch (e) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">✗ ${e.detail || I18n.t("share.failed")}</p>`;
            btn.disabled = false;
            btn.innerHTML = I18n.t("share.share_button");
          }
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") btn.click();
        });
        input.focus();
      }
    }, 100);
  }

  return { openShareModal };
})();

const SharedList = (() => {
  async function render(container) {
    container.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div></div>';
    try {
      const res = await API.request("GET", "/files/shared");

      if (res.items.length === 0) {
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 text-center animate-[fadeIn_0.3s_ease]">
            <svg class="w-16 h-16 opacity-40 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h3 class="text-lg font-bold font-heading">${I18n.t("shared.empty")}</h3>
            <p class="text-sm text-muted mt-2">${I18n.t("shared.empty_desc")}</p>
          </div>`;
        return;
      }

      let html = `<div class="bg-surface-card border border-border rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="bg-surface border-b border-border">
                      <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">${I18n.t("common.name")}</th>
                      <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">${I18n.t("shared.shared_by")}</th>
                      <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">${I18n.t("common.size")}</th>
                      <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider hidden md:table-cell">${I18n.t("common.date")}</th>
                      <th class="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">${I18n.t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>`;
      res.items.forEach((file) => {
        const icon = FileList.getFileIcon(file.filename_original);
        html += `
          <tr class="border-b border-border last:border-0 hover:bg-surface-hover transition-colors duration-150 file-list-enter">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="file-icon ${icon.cls} w-[36px] h-[36px]" style="width:36px;height:36px;">${icon.svg}</span>
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate max-w-[200px]">${file.filename_original}</div>
                  <div class="text-xs text-muted">ID: ${file.id}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style="background: var(--primary);">${(file.shared_by?.[0] || "?").toUpperCase()}</span>
                <span class="text-sm">${file.shared_by || "Unknown"}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap hidden sm:table-cell">${file.file_size_formatted || "—"}</td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap hidden md:table-cell">${new Date(file.created_at).toLocaleDateString("en-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
            <td class="px-4 py-3 text-right">
              <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="Download.handle(${file.id}, '${file.filename_original}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                ${I18n.t("files.tooltip_download")}
              </button>
            </td>
          </tr>`;
      });
      html += "</tbody></table></div></div>";
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-error">${e.detail || I18n.t("activity.load_error")}</p></div>`;
    }
  }

  return { render };
})();
