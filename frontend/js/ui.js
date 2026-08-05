const UI = (() => {
  let toastContainer = null;

  function init() {
    toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className =
        "fixed top-5 right-5 z-[9999] flex flex-col gap-2";
      document.body.appendChild(toastContainer);
    }
  }

  function toast(message, type = "info", duration = 4000) {
    init();
    const colors = {
      success: "border-l-[3px] border-l-success",
      error: "border-l-[3px] border-l-error",
      info: "border-l-[3px] border-l-info",
    };
    const borderColors = {
      success: "var(--success)",
      error: "var(--error)",
      info: "var(--info)",
    };
    const icons = {
      success:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const el = document.createElement("div");
    el.className = `toast-enter flex items-center gap-3 px-4 py-3.5 bg-surface-card border border-border rounded-lg shadow-2xl min-w-[320px] max-w-[420px] ${colors[type]}`;
    el.innerHTML = `
      <span class="flex-shrink-0">${icons[type] || icons.info}</span>
      <span class="flex-1 text-sm">${message}</span>
      <button class="flex-shrink-0 text-muted hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-1 rounded-md hover:bg-surface-hover" onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    toastContainer.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(100px)";
      el.style.transition = "all 0.3s ease";
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  function modal(title, bodyHtml, footerHtml = "") {
    init();
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-[8000] flex items-center justify-center p-5 modal-enter";
    overlay.innerHTML = `
      <div class="bg-surface-card border border-border rounded-xl shadow-2xl w-full max-w-[480px] max-h-[80vh] overflow-y-auto modal-enter">
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
          <h3 class="text-lg font-bold">${title}</h3>
          <button class="p-2 rounded-md text-muted hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="px-6 py-5">${bodyHtml}</div>
        ${footerHtml ? `<div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">${footerHtml}</div>` : ""}
      </div>
    `;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = modal(
        I18n.t("common.confirm"),
        `<p class="text-secondary">${message}</p>`,
        `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove(); window.__confirmResolve && window.__confirmResolve(false)">${I18n.t("common.cancel")}</button>
         <button class="px-4 py-2 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" onclick="this.closest('.fixed.inset-0').remove(); window.__confirmResolve && window.__confirmResolve(true)" style="background: var(--error);">${I18n.t("common.delete")}</button>`,
      );
      window.__confirmResolve = resolve;
    });
  }

  function loading(show) {
    const existing = document.getElementById("global-loading");
    if (show) {
      if (!existing) {
        const el = document.createElement("div");
        el.id = "global-loading";
        el.className =
          "fixed inset-0 bg-black/30 z-[9999] flex items-center justify-center";
        el.innerHTML =
          '<div class="w-10 h-10 rounded-full border-2 border-border animate-spin" style="border-top-color: var(--primary);"></div>';
        document.body.appendChild(el);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  function openShareModal(fileId, fileName) {
    ShareUI.openShareModal(fileId, fileName);
  }

  function renderFileDetail(file, icon) {
    const aiMode = file?.metadata?.ai_mode || "—";
    const matrixSize = file?.metadata?.matrix_size || "—";
    const modulus = file?.metadata?.modulus || 257;
    const logisticR = file?.logistic_r || file?.metadata?.logistic_r || "—";

    const sidePanel = document.createElement("div");
    sidePanel.className = "fixed inset-0 z-[7000] flex justify-end modal-enter";
    sidePanel.innerHTML = `
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
      <div class="relative w-full max-w-[420px] bg-surface-card border-l border-border h-full overflow-y-auto p-6 slide-in-right">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <span class="file-icon" style="width:36px;height:36px;">${icon.svg}</span>
            <div>
              <h3 class="text-base font-semibold font-heading truncate max-w-[280px]">${file.filename_original}</h3>
              <span class="text-xs" style="color: var(--success);">${I18n.t("common.active")}</span>
            </div>
          </div>
          <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="bg-surface border border-border rounded-lg p-4">
            <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">${I18n.t("files.stats_encryption")}</h4>
            <div class="space-y-2.5">
              <div class="flex justify-between"><span class="text-sm text-muted">Layer 1</span><span class="text-sm font-medium">UHC (mod ${modulus})</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Layer 2</span><span class="text-sm font-medium">${
                file.encryption_type
                  ? file.encryption_type
                      .split("+")
                      .filter((p) => p !== "UHC")
                      .join(" + ")
                  : "AES-256-CBC + RSA-OAEP"
              }</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Key Wrap</span><span class="text-sm font-medium">RSA-OAEP (SHA-256)</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">AI Mode</span><span class="text-sm font-medium">${aiMode}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Matrix Size</span><span class="text-sm font-medium">${matrixSize}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Modulus</span><span class="text-sm font-medium">${modulus}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Logistic R</span><span class="text-sm font-medium">${logisticR}</span></div>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-lg p-4">
            <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">${I18n.t("common.type")}</h4>
            <div class="space-y-2.5">
              <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("common.size")}</span><span class="text-sm font-medium">${file.file_size_formatted || formatBytes(file.file_size_original)}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("files.stats_encryption")} ${I18n.t("common.size")}</span><span class="text-sm font-medium">${formatBytes(file.file_size_encrypted)}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("common.type")}</span><span class="text-sm font-medium">${file.mime_type || "—"}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">${I18n.t("common.date")}</span><span class="text-sm font-medium">${formatDate(file.created_at)}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">File ID</span><span class="text-sm font-mono" style="color: var(--primary);">${file.id}</span></div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="flex-1 px-4 py-2.5 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" style="background: var(--primary);" onclick="Download.handle(${file.id}, '${file.filename_original}');this.closest('.fixed.inset-0').remove()">
              ${I18n.t("files.tooltip_download")}
            </button>
            <button class="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer border-none hover:bg-surface-hover" style="background: var(--surface); color: var(--text-primary);" onclick="SecurityUI.renderFileAnalysis(${file.id})">
              ${I18n.t("files.tooltip_analyze")}
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidePanel);
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return {
    init,
    toast,
    modal,
    confirmDialog,
    loading,
    openShareModal,
    renderFileDetail,
  };
})();

document.addEventListener("DOMContentLoaded", () => UI.init());
