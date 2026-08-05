const FileList = (() => {
  function getFileIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const cats = {
      pdf: "pdf",
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      webp: "image",
      svg: "image",
      doc: "doc",
      docx: "doc",
      xls: "doc",
      xlsx: "doc",
      ppt: "doc",
      pptx: "doc",
      mp4: "video",
      avi: "video",
      mkv: "video",
      mov: "video",
      zip: "archive",
      rar: "archive",
      "7z": "archive",
      tar: "archive",
      gz: "archive",
      js: "code",
      ts: "code",
      py: "code",
      java: "code",
      html: "code",
      css: "code",
      json: "code",
      xml: "code",
      md: "code",
    };
    const svg = {
      pdf: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      image:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      doc: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      video:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
      archive:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      code: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    };
    const c = cats[ext] || "default";
    return { cls: `file-icon-${c}`, svg: svg[c] || svg.doc };
  }

  const folderIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
  }

  async function render(container, searchQuery = "") {
    container.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div></div>';
    try {
      const dirId = App.getDirectory();
      let folders = [];
      let files = [];
      let total = 0;

      if (dirId && !searchQuery) {
        const dirRes = await API.request(
          "GET",
          `/files/directories?parent_id=${dirId}`,
        );
        folders = dirRes.items.filter((i) => i.is_directory);
        files = dirRes.items.filter((i) => !i.is_directory);
        total = dirRes.total;
      } else if (!searchQuery) {
        const dirRes = await API.request("GET", "/files/directories");
        folders = dirRes.items.filter((i) => i.is_directory);
        const fileRes = await API.request("GET", "/files");
        files = fileRes.items;
        total = fileRes.total + folders.length;
      } else {
        const fileRes = await API.request(
          "GET",
          `/files/search?q=${encodeURIComponent(searchQuery)}`,
        );
        files = fileRes.items;
        total = fileRes.total;
      }

      if (!searchQuery) renderStats(total);

      if (total === 0) {
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 text-center animate-[fadeIn_0.3s_ease]">
            <svg class="w-16 h-16 opacity-40 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            <h3 class="text-lg font-bold font-heading">${searchQuery ? I18n.t("files.empty_found") : I18n.t("files.empty_yet")}</h3>
            <p class="text-sm text-muted mt-2">${searchQuery ? I18n.t("files.search_hint") : I18n.t("files.get_started")}</p>
          </div>`;
        return;
      }

      let html = `<div class="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface border-b border-border">
                <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">${I18n.t("common.name")}</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">${I18n.t("common.size")}</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">${I18n.t("common.type")}</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider hidden md:table-cell">${I18n.t("common.date")}</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">${I18n.t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>`;

      folders.forEach((folder) => {
        const safeName = escapeAttr(folder.name);
        html += `
          <tr class="border-b border-border last:border-0 hover:bg-surface-hover transition-colors duration-150 file-list-enter" style="background: color-mix(in srgb, var(--primary) 3%, transparent);">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5 cursor-pointer" onclick="DirectoryUI.navigate(${folder.id})">
                <span class="file-icon file-icon-folder" style="color: var(--primary);">${folderIconSvg}</span>
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">${folder.name}</div>
                  <div class="text-xs text-muted">${I18n.t("files.folder")}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap">—</td>
            <td class="px-4 py-3 hidden sm:table-cell"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary);">${I18n.t("files.folder_badge")}</span></td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap hidden md:table-cell">${formatDate(folder.created_at)}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="DirectoryUI.navigate(${folder.id})" title="${I18n.t("files.tooltip_open")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="DirectoryUI.openMoveModal(${folder.id}, '${safeName}')" title="${I18n.t("files.tooltip_move")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                </button>
                <button class="p-2 rounded-md text-muted hover:text-error hover:bg-[rgba(196,69,69,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="DirectoryUI.deleteFolder(${folder.id}, '${safeName}')" title="${I18n.t("files.tooltip_delete")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      });

      files.forEach((file) => {
        const icon = getFileIcon(file.filename_original);
        const ext = (
          file.filename_original?.split(".").pop() || "FILE"
        ).toUpperCase();
        const safeName = escapeAttr(file.filename_original);
        html += `
          <tr class="border-b border-border last:border-0 hover:bg-surface-hover transition-colors duration-150 file-list-enter">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5 cursor-pointer" onclick="FileList.showDetail(${file.id})">
                  <span class="file-icon ${icon.cls}">${icon.svg}</span>
                  <div class="min-w-0">
                    <div class="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">${file.filename_original}</div>
                    <div class="text-xs text-muted flex items-center gap-2">
                      <span>ID: ${file.id}</span>
                      <span class="inline-flex items-center gap-0.5 text-[10px]" style="color: var(--success);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        ${file.encryption_type || "UHC+AES+RSA"}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap">${file.file_size_formatted || "—"}</td>
            <td class="px-4 py-3 hidden sm:table-cell"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary);">${ext}</span></td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap hidden md:table-cell">${formatDate(file.created_at)}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="Download.handle(${file.id}, '${safeName}')" title="${I18n.t("files.tooltip_download")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="UI.openShareModal(${file.id}, '${safeName}')" title="${I18n.t("files.tooltip_share")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="PublicLinkUI.openModal(${file.id}, '${safeName}')" title="${I18n.t("files.tooltip_public_link")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="FileList.verifyIntegrity(${file.id})" title="${I18n.t("files.tooltip_verify")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </button>
                <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="DirectoryUI.openMoveModal(${file.id}, '${safeName}')" title="${I18n.t("files.tooltip_move")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                </button>
                ${(() => {
                  const user = App.getCurrentUser();
                  if (user?.role !== "admin") return "";
                  return `<button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="SecurityUI.renderFileAnalysis(${file.id})" title="${I18n.t("files.tooltip_analyze")}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </button>`;
                })()}
                <button class="p-2 rounded-md text-muted hover:text-error hover:bg-[rgba(196,69,69,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="FileList.deleteFile(${file.id})" title="${I18n.t("files.tooltip_delete")}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      });
      html += "</tbody></table></div></div>";
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-error">${e.detail || I18n.t("files.load_error")}</p></div>`;
    }
  }

  function renderStats(total) {
    const area = document.getElementById("stats-area");
    if (!area) return;
    const cfg = App.getSystemConfig();
    const encLabel = cfg
      ? `UHC + ${cfg.layer2_algorithm || "AES-256-CBC + RSA-OAEP"}`
      : "UHC + AES + RSA";
    area.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="meta">${I18n.t("files.stats_total")}</div>
          <div style="font-size: 1.75rem; font-weight: 900; letter-spacing: -0.025em; color: var(--primary);">${total}</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="meta">${I18n.t("files.stats_encryption")}</div>
          <div class="mt-2"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success);">${encLabel}</span></div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="meta">${I18n.t("files.stats_storage")}</div>
          <div class="mt-2"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success);">${I18n.t("files.stats_zero_knowledge")}</span></div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="meta">${I18n.t("files.stats_status")}</div>
          <div class="mt-2"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success);">${I18n.t("files.stats_protected")}</span></div>
        </div>
      </div>`;
  }

  async function deleteFile(fileId) {
    const confirmed = await UI.confirmDialog(
      I18n.t("files.delete_confirm"),
    );
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request("DELETE", `/files/${fileId}`);
      UI.toast(I18n.t("files.deleted"), "success");
      App.navigate("dashboard");
    } catch (e) {
      UI.toast(e.detail || I18n.t("files.delete_failed"), "error");
    } finally {
      UI.loading(false);
    }
  }

  async function verifyIntegrity(fileId) {
    UI.loading(true);
    try {
      const res = await API.request("POST", `/files/${fileId}/verify`);
      UI.toast(res.message || I18n.t("files.integrity_ok"), "success");
    } catch (e) {
      UI.toast(e.detail || I18n.t("files.integrity_fail"), "error");
    } finally {
      UI.loading(false);
    }
  }

  async function showDetail(fileId) {
    try {
      const file = await API.request("GET", `/files/${fileId}`);
      const icon = getFileIcon(file.filename_original);
      UI.renderFileDetail(file, icon);
    } catch {
      UI.toast(I18n.t("files.detail_error"), "error");
    }
  }

  return { render, deleteFile, verifyIntegrity, getFileIcon, showDetail };
})();
