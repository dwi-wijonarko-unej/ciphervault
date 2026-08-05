const App = (() => {
  let currentView = "dashboard";
  let currentUser = null;
  let systemConfig = null;
  let currentDirectoryId = null;

  async function init() {
    await I18n.init();
    currentUser = await Auth.ensureAuthenticated();
    if (!currentUser) return;

    // System config is admin-only; regular users get a null fallback
    try {
      if (currentUser.role === "admin") {
        systemConfig = await API.request("GET", "/system/config");
      }
    } catch {
      systemConfig = null;
    }

    hydrateUserUI(currentUser);
    setupNavbar();
    applyRoleBasedUI(currentUser);
    setupRouter();
    navigate(window.location.hash.replace("#", "") || "dashboard");
  }

  function hydrateUserUI(user) {
    const avatar = document.getElementById("nav-avatar");
    if (avatar) avatar.textContent = user.username[0].toUpperCase();

    const name = document.getElementById("nav-username");
    if (name) name.textContent = user.username;

    const roleBadge = document.getElementById("nav-role");
    if (roleBadge) {
      roleBadge.textContent = user.role;
      roleBadge.style.display = "inline-flex";
      if (user.role === "admin") {
        roleBadge.style.background =
          "color-mix(in srgb, var(--primary) 15%, transparent)";
        roleBadge.style.color = "var(--primary)";
      }
    }
  }

  function applyRoleBasedUI(user) {
    const isAdmin = user.role === "admin";

    const adminTab = document.querySelector('[data-nav="admin"]');
    if (adminTab) adminTab.style.display = isAdmin ? "" : "none";

    const systemTab = document.querySelector('[data-nav="system"]');
    if (systemTab) systemTab.style.display = isAdmin ? "" : "none";
  }

  function setupNavbar() {
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", Auth.logout);

    const profileBtn = document.getElementById("btn-profile");
    if (profileBtn)
      profileBtn.addEventListener("click", () => navigate("profile"));

    document.querySelectorAll(".nav-tab").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(link.dataset.nav);
      });
    });
  }

  function setupRouter() {
    window.addEventListener("hashchange", () => {
      navigate(window.location.hash.replace("#", "") || "dashboard");
    });
    window.addEventListener("cv:i18n-changed", () => {
      navigate(currentView);
    });
  }

  function navigate(view) {
    currentView = view;
    window.location.hash = view;

    document.querySelectorAll(".nav-tab").forEach((el) => {
      const isActive = el.dataset.nav === view;
      el.classList.toggle("active", isActive);
      el.classList.toggle("text-primary", isActive);
      el.classList.toggle("text-secondary", !isActive);

      const bar = el.querySelector(".tab-active-bar");
      if (bar) {
        bar.classList.toggle("scale-x-100", isActive);
        bar.classList.toggle("scale-x-0", !isActive);
      }
    });

    const container = document.getElementById("view-container");
    if (!container) return;

    switch (view) {
      case "dashboard":
        renderDashboard(container);
        break;
      case "shared":
        renderShared(container);
        break;
      case "system":
        renderSystem(container);
        break;
      case "activity":
        renderActivity(container);
        break;
      case "profile":
        renderProfile(container);
        break;
      case "admin":
        if (currentUser?.role === "admin") {
          AdminPanel.render(container);
        } else {
          renderDashboard(container);
        }
        break;
      default:
        renderDashboard(container);
    }
  }

  function buildEncryptionSummary() {
    const aiMode = systemConfig?.ai_mode || "multi_feature_adaptive";
    const adaptiveR =
      systemConfig?.ai_adaptive_r === true ? "adaptive-r" : "fixed-r";
    const layer2 = systemConfig?.layer2_algorithm || "AES-256-CBC + RSA-OAEP";

    return `UHC + ${layer2} (${aiMode}, ${adaptiveR})`;
  }

  function setDirectory(dirId) {
    currentDirectoryId = dirId ?? null;
  }

  function getDirectory() {
    return currentDirectoryId;
  }

  async function renderDashboard(container) {
    const encryptionSummary = buildEncryptionSummary();

    container.innerHTML = `
      <div class="page-enter">
        <div id="directory-toolbar"></div>
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("dashboard.title")}</h1>
            <p class="text-sm text-muted mt-1">${I18n.t("dashboard.encrypted_with")} <span style="color: var(--success);" class="font-medium">${encryptionSummary}</span></p>
          </div>
          <div class="flex items-center gap-2">
            <button class="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-all duration-200 cursor-pointer bg-transparent border border-border" onclick="DirectoryUI.openCreateModal()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              ${I18n.t("dashboard.new_folder")}
            </button>
            <button class="flex items-center gap-2 px-5 py-2.5 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" style="background: var(--primary);" onclick="document.getElementById('file-input').click()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              ${I18n.t("dashboard.upload_file")}
            </button>
          </div>
        </div>
        <div id="stats-area"></div>
        <div id="upload-area"></div>
        <div id="search-area"></div>
        <div id="file-list-area"></div>
      </div>
    `;
    DirectoryUI.renderToolbar(document.getElementById("directory-toolbar"));
    Search.render(document.getElementById("search-area"), (query) =>
      FileList.render(document.getElementById("file-list-area"), query),
    );
    Upload.render(document.getElementById("upload-area"));
    await FileList.render(document.getElementById("file-list-area"));
  }

  async function renderShared(container) {
    container.innerHTML = `
      <div class="page-enter">
        <div class="mb-6">
          <h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("shared.title")}</h1>
          <p class="text-sm text-muted mt-1">${I18n.t("shared.desc")}</p>
        </div>
        <div id="shared-list-area"></div>
      </div>
    `;
    await SharedList.render(document.getElementById("shared-list-area"));
  }

  async function renderSystem(container) {
    if (currentUser?.role !== "admin") {
      container.innerHTML = `
        <div class="page-enter">
          <div class="bg-surface-card border border-border rounded-lg p-10 text-center">
            <p class="text-muted">${I18n.t("dashboard.admin_required")}</p>
          </div>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div class="page-enter">
        <div id="system-content"></div>
      </div>
    `;
    await SystemPage.render(document.getElementById("system-content"));
  }

  async function renderProfile(container) {
    container.innerHTML = `
      <div class="page-enter">
        <div id="profile-content"></div>
      </div>
    `;
    await Profile.render(
      document.getElementById("profile-content"),
      currentUser,
    );
  }

  async function renderActivity(container) {
    container.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div></div>';
    try {
      const res = await API.request("GET", "/activities");
      const actionColors = {
        upload: "text-primary bg-[rgba(45,106,79,0.1)]",
        share: "text-[#d4a72c] bg-[rgba(212,167,44,0.1)]",
        verify: "text-primary bg-[rgba(45,106,79,0.1)]",
        delete: "text-[#c44545] bg-[rgba(196,69,69,0.1)]",
        delete_folder: "text-[#c44545] bg-[rgba(196,69,69,0.1)]",
        download: "text-[#d4a72c] bg-[rgba(212,167,44,0.1)]",
        login: "text-muted bg-surface",
      };
      const darkActionColors = {
        upload: "text-[#40916c] bg-[rgba(64,145,108,0.1)]",
        share: "text-[#e0b94a] bg-[rgba(224,185,74,0.1)]",
        verify: "text-[#40916c] bg-[rgba(64,145,108,0.1)]",
        delete: "text-[#d15151] bg-[rgba(209,81,81,0.1)]",
        delete_folder: "text-[#d15151] bg-[rgba(209,81,81,0.1)]",
        download: "text-[#e0b94a] bg-[rgba(224,185,74,0.1)]",
        login: "text-muted bg-surface",
      };
      const actionIcons = {
        upload:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        share:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
        verify:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
        delete:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        delete_folder:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        download:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        login:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
      };

      if (res.items.length === 0) {
        container.innerHTML = `
          <div class="page-enter">
            <div class="mb-6"><h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("activity.title")}</h1><p class="text-sm text-muted mt-1">${I18n.t("activity.desc")}</p></div>
            <div class="bg-surface-card border border-border rounded-lg p-10 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2 opacity-40" style="color: var(--muted);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <p class="text-muted text-sm">${I18n.t("activity.empty")}</p>
            </div>
          </div>`;
        return;
      }

      const isDark = document.documentElement.classList.contains("dark");
      const acMap = isDark ? darkActionColors : actionColors;

      let html = `
        <div class="page-enter">
          <div class="flex items-center justify-between mb-6">
            <div><h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("activity.title")}</h1><p class="text-sm text-muted mt-1">${I18n.t("activity.desc")}</p></div>
            <span class="text-xs text-muted">${res.total} ${I18n.t("activity.events")}</span>
          </div>
          <div class="space-y-1">`;
      res.items.forEach((a) => {
        const ac = acMap[a.action] || acMap.login;
        const ai = actionIcons[a.action] || actionIcons.login;
        html += `
            <div class="flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors duration-150">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ac}">${ai}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm">${a.details}</div>
                ${a.file_name ? `<div class="text-xs text-muted mt-0.5">${I18n.t("activity.file_prefix")} ${a.file_name}</div>` : ""}
              </div>
              <span class="text-xs text-muted whitespace-nowrap flex-shrink-0">${new Date(a.timestamp).toLocaleDateString("en-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>`;
      });
      html += "</div></div>";
      container.innerHTML = html;
    } catch {
      container.innerHTML = `<div class="page-enter"><div class="mb-6"><h1 class="text-3xl font-black font-heading tracking-tight">${I18n.t("activity.title")}</h1><p class="text-sm text-muted mt-1">${I18n.t("activity.desc")}</p></div><div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-error">${I18n.t("activity.load_error")}</p></div></div>`;
    }
  }

  return {
    init,
    navigate,
    getSystemConfig: () => systemConfig,
    getCurrentUser: () => currentUser,
    setDirectory,
    getDirectory,
  };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
