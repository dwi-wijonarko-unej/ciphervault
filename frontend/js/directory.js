const DirectoryUI = (() => {
  function renderToolbar(container) {
    if (!container) return;
    container.innerHTML = `<div id="breadcrumb-area" class="mb-4"></div>`;
    loadBreadcrumbs();
  }

  async function loadBreadcrumbs() {
    const area = document.getElementById("breadcrumb-area");
    if (!area) return;
    const dirId = App.getDirectory();

    try {
      const params = dirId ? `?parent_id=${dirId}` : "";
      const res = await API.request("GET", `/files/directories${params}`);
      renderBreadcrumb(res.current_path);
    } catch {
      area.innerHTML = "";
    }
  }

  function renderBreadcrumb(path) {
    const area = document.getElementById("breadcrumb-area");
    if (!area) return;

    let html = `<nav class="flex items-center gap-1 text-sm flex-wrap">`;
    html += `<button class="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none font-medium" onclick="DirectoryUI.navigate(null)">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      Home
    </button>`;

    path.forEach((crumb, idx) => {
      const isLast = idx === path.length - 1;
      html += `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><polyline points="9 18 15 12 9 6"/></svg>`;
      if (isLast) {
        html += `<span class="px-2 py-1 font-semibold" style="color: var(--primary);">${escapeHtml(crumb.name)}</span>`;
      } else {
        html += `<button class="px-2 py-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="DirectoryUI.navigate(${crumb.id})">${escapeHtml(crumb.name)}</button>`;
      }
    });
    html += `</nav>`;
    area.innerHTML = html;
  }

  async function navigate(dirId) {
    App.setDirectory(dirId);
    await loadBreadcrumbs();
    const listArea = document.getElementById("file-list-area");
    if (listArea) await FileList.render(listArea);
  }

  function openCreateModal() {
    const currentDir = App.getDirectory();
    UI.modal(
      "New Folder",
      `
        <p class="text-secondary mb-4">Create a new folder${currentDir ? " in the current location" : " at the root level"}.</p>
        <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Folder Name</label>
        <input class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" id="folder-name-input" placeholder="My Documents" autocomplete="off">
        <div id="folder-result" class="mt-3"></div>
      `,
      `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">Cancel</button>
       <button class="px-4 py-2 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" id="btn-create-folder" style="background: var(--primary);">Create Folder</button>`,
    );

    setTimeout(() => {
      const btn = document.getElementById("btn-create-folder");
      const input = document.getElementById("folder-name-input");
      const result = document.getElementById("folder-result");

      if (btn && input) {
        btn.addEventListener("click", async () => {
          const name = input.value.trim();
          if (!name) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">Please enter a folder name.</p>`;
            return;
          }
          btn.disabled = true;
          btn.textContent = "Creating...";
          try {
            await API.request("POST", "/files/directories", {
              name,
              parent_id: App.getDirectory(),
            });
            UI.toast("Folder created successfully", "success");
            document.querySelector(".fixed.inset-0.bg-black\\/50")?.remove();
            navigate(App.getDirectory());
          } catch (e) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">${e.detail || "Failed to create folder"}</p>`;
            btn.disabled = false;
            btn.textContent = "Create Folder";
          }
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") btn.click();
        });
        input.focus();
      }
    }, 100);
  }

  async function deleteFolder(folderId, folderName) {
    const confirmed = await UI.confirmDialog(
      `Delete folder "${folderName}" and all its contents? This action cannot be undone.`,
    );
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request("DELETE", `/files/directories/${folderId}`);
      UI.toast("Folder deleted successfully", "success");
      navigate(App.getDirectory());
    } catch (e) {
      UI.toast(e.detail || "Failed to delete folder", "error");
    } finally {
      UI.loading(false);
    }
  }

  function openMoveModal(itemId, itemName) {
    UI.modal(
      "Move Item",
      `
        <p class="text-secondary mb-4">Move <strong>"${escapeHtml(itemName)}"</strong> to a different folder.</p>
        <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Target Folder</label>
        <select class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary outline-none transition-all focus:border-[#2d6a4f]" id="move-target-select">
          <option value="">— Root (Home) —</option>
        </select>
        <div id="move-result" class="mt-3"></div>
      `,
      `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">Cancel</button>
       <button class="px-4 py-2 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" id="btn-move-item" style="background: var(--primary);">Move</button>`,
    );

    setTimeout(async () => {
      const select = document.getElementById("move-target-select");
      const btn = document.getElementById("btn-move-item");
      const result = document.getElementById("move-result");

      try {
        const res = await API.request("GET", "/files/directories");
        res.items
          .filter((i) => i.is_directory)
          .forEach((folder) => {
            const opt = document.createElement("option");
            opt.value = folder.id;
            opt.textContent = folder.name;
            select.appendChild(opt);
          });
      } catch {
        // ignore — root option still available
      }

      if (btn) {
        btn.addEventListener("click", async () => {
          const targetVal = select.value;
          btn.disabled = true;
          btn.textContent = "Moving...";
          try {
            const body = {
              target_parent_id: targetVal ? parseInt(targetVal) : null,
            };
            await API.request("PATCH", `/files/${itemId}/move`, body);
            UI.toast("Item moved successfully", "success");
            document.querySelector(".fixed.inset-0.bg-black\\/50")?.remove();
            navigate(App.getDirectory());
          } catch (e) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">${e.detail || "Move failed"}</p>`;
            btn.disabled = false;
            btn.textContent = "Move";
          }
        });
      }
    }, 100);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { renderToolbar, navigate, openCreateModal, deleteFolder, openMoveModal };
})();
