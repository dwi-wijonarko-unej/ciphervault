const App = (() => {
  let currentView = "dashboard";
  let currentUser = null;
  let systemConfig = null;

  async function init() {
    currentUser = await Auth.ensureAuthenticated();
    if (!currentUser) return;

    try {
      systemConfig = await API.request("GET", "/system/config");
    } catch {
      systemConfig = null;
    }

    hydrateUserUI(currentUser);
    setupNavbar();
    setupRouter();
    navigate(window.location.hash.replace("#", "") || "dashboard");
  }

  function hydrateUserUI(user) {
    const avatar = document.getElementById("nav-avatar");
    if (avatar) avatar.textContent = user.username[0].toUpperCase();

    const name = document.getElementById("nav-username");
    if (name) name.textContent = user.username;
  }

  function setupNavbar() {
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", Auth.logout);

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
  }

  function navigate(view) {
    currentView = view;
    window.location.hash = view;

    document.querySelectorAll(".nav-tab").forEach((el) => {
      const isActive = el.dataset.nav === view;
      el.classList.toggle("active", isActive);
      el.classList.toggle("bg-surface-card", isActive);
      el.classList.toggle("shadow-sm", isActive);
      el.classList.toggle("text-primary", isActive);
      el.classList.toggle("text-secondary", !isActive);
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

  async function renderDashboard(container) {
    const encryptionSummary = buildEncryptionSummary();

    container.innerHTML = `
      <div class="page-enter">
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 class="text-2xl font-bold">My Files</h1>
            <p class="text-sm text-muted mt-1">Securely encrypted with <span class="text-emerald-400 font-medium">${encryptionSummary}</span></p>
          </div>
          <button class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer border-none" onclick="document.getElementById('file-input').click()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload File
          </button>
        </div>
        <div id="stats-area"></div>
        <div id="upload-area"></div>
        <div id="search-area"></div>
        <div id="file-list-area"></div>
      </div>
    `;
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
          <h1 class="text-2xl font-bold">Shared with Me</h1>
          <p class="text-sm text-muted mt-1">Files shared by other users</p>
        </div>
        <div id="shared-list-area"></div>
      </div>
    `;
    await SharedList.render(document.getElementById("shared-list-area"));
  }

  async function renderSystem(container) {
    container.innerHTML = `
      <div class="page-enter">
        <div id="system-content"></div>
      </div>
    `;
    await SystemPage.render(document.getElementById("system-content"));
  }

  async function renderActivity(container) {
    container.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border border-t-blue-500 rounded-full animate-[spin_0.6s_linear_infinite] mx-auto"></div></div>';
    try {
      const res = await API.request("GET", "/activities");
      const actionColors = {
        upload: "text-blue-400 bg-[rgba(59,130,246,0.1)]",
        share: "text-purple-400 bg-[rgba(139,92,246,0.1)]",
        verify: "text-emerald-400 bg-[rgba(34,197,94,0.1)]",
        delete: "text-red-400 bg-[rgba(239,68,68,0.1)]",
        download: "text-amber-400 bg-[rgba(234,179,8,0.1)]",
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
        download:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        login:
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
      };

      if (res.items.length === 0) {
        container.innerHTML = `
          <div class="page-enter">
            <div class="mb-6"><h1 class="text-2xl font-bold">Activity Log</h1><p class="text-sm text-muted mt-1">Recent actions and events</p></div>
            <div class="bg-surface-card border border-border rounded-xl p-10 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" class="mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <p class="text-muted text-sm">No activity yet.</p>
            </div>
          </div>`;
        return;
      }

      let html = `
        <div class="page-enter">
          <div class="flex items-center justify-between mb-6">
            <div><h1 class="text-2xl font-bold">Activity Log</h1><p class="text-sm text-muted mt-1">Recent actions and events</p></div>
            <span class="text-xs text-muted">${res.total} events</span>
          </div>
          <div class="space-y-1">`;
      res.items.forEach((a) => {
        const ac = actionColors[a.action] || actionColors.login;
        const ai = actionIcons[a.action] || actionIcons.login;
        html += `
            <div class="flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-[rgba(59,130,246,0.02)] transition-colors">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ac}">${ai}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm">${a.details}</div>
                ${a.file_name ? `<div class="text-xs text-muted mt-0.5">File: ${a.file_name}</div>` : ""}
              </div>
              <span class="text-xs text-muted whitespace-nowrap flex-shrink-0">${new Date(a.timestamp).toLocaleDateString("en-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>`;
      });
      html += "</div></div>";
      container.innerHTML = html;
    } catch {
      container.innerHTML = `<div class="page-enter"><div class="mb-6"><h1 class="text-2xl font-bold">Activity Log</h1><p class="text-sm text-muted mt-1">Recent actions and events</p></div><div class="bg-surface-card border border-border rounded-xl p-10 text-center"><p class="text-red-400">Failed to load activity.</p></div></div>`;
    }
  }

  return { init, navigate, getSystemConfig: () => systemConfig };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
