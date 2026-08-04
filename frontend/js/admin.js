const AdminPanel = (() => {
  let activeSection = "users";
  let usersCache = [];

  async function render(container) {
    container.innerHTML = `
      <div class="page-enter">
        <div class="mb-6">
          <h1 class="text-3xl font-black font-heading tracking-tight">Admin Panel</h1>
          <p class="text-sm text-muted mt-1">Manage users, monitor system health, and review security metrics</p>
        </div>

        <div class="flex items-center gap-1 mb-6 border-b border-border">
          <button class="admin-tab px-4 py-2.5 text-sm font-semibold transition-all relative cursor-pointer bg-transparent border-none" data-admin-section="users" onclick="AdminPanel.switchSection('users')">
            Users
            <span class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-transform duration-200 admin-bar"></span>
          </button>
          <button class="admin-tab px-4 py-2.5 text-sm font-semibold transition-all relative cursor-pointer bg-transparent border-none" data-admin-section="stats" onclick="AdminPanel.switchSection('stats')">
            System Stats
            <span class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-transform duration-200 admin-bar"></span>
          </button>
          <button class="admin-tab px-4 py-2.5 text-sm font-semibold transition-all relative cursor-pointer bg-transparent border-none" data-admin-section="security" onclick="AdminPanel.switchSection('security')">
            Security
            <span class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-transform duration-200 admin-bar"></span>
          </button>
        </div>

        <div id="admin-content"></div>
      </div>
    `;
    updateTabState();
    await loadSection(activeSection);
  }

  function switchSection(section) {
    activeSection = section;
    updateTabState();
    loadSection(section);
  }

  function updateTabState() {
    document.querySelectorAll(".admin-tab").forEach((el) => {
      const isActive = el.dataset.adminSection === activeSection;
      el.style.color = isActive ? "var(--primary)" : "var(--text-secondary)";
      const bar = el.querySelector(".admin-bar");
      if (bar) {
        bar.style.background = isActive ? "var(--primary)" : "transparent";
        bar.style.transform = isActive ? "scaleX(1)" : "scaleX(0)";
      }
    });
  }

  async function loadSection(section) {
    const content = document.getElementById("admin-content");
    if (!content) return;
    content.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div></div>';

    try {
      if (section === "users") await renderUsers(content);
      else if (section === "stats") await renderStats(content);
      else if (section === "security") await renderSecurity(content);
    } catch (e) {
      content.innerHTML = `<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-error">${e.detail || "Failed to load"}</p></div>`;
    }
  }

  async function renderUsers(container) {
    const res = await API.request("GET", "/admin/users?per_page=100");
    usersCache = res.items;

    if (res.items.length === 0) {
      container.innerHTML = `<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-muted">No users found.</p></div>`;
      return;
    }

    let html = `<div class="bg-surface-card border border-border rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-surface border-b border-border">
              <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">User</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider hidden md:table-cell">Joined</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>`;

    res.items.forEach((user) => {
      html += `
        <tr class="border-b border-border last:border-0 hover:bg-surface-hover transition-colors duration-150">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background: var(--primary);">${user.username[0].toUpperCase()}</span>
              <div class="min-w-0">
                <div class="text-sm font-medium">${user.username}</div>
                <div class="text-xs text-muted truncate max-w-[200px]">${user.email}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase" style="background: ${user.role === "admin" ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--surface)"}; color: ${user.role === "admin" ? "var(--primary)" : "var(--text-secondary)"};">${user.role}</span>
          </td>
          <td class="px-4 py-3 hidden sm:table-cell">
            <span class="text-xs font-medium" style="color: ${user.is_active ? "var(--success)" : "var(--error)"};">${user.is_active ? "Active" : "Inactive"}</span>
          </td>
          <td class="px-4 py-3 text-sm text-muted whitespace-nowrap hidden md:table-cell">${formatDate(user.created_at)}</td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1">
              <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="AdminPanel.toggleRole(${user.id}, '${user.role}')" title="${user.role === "admin" ? "Demote to User" : "Promote to Admin"}">
                ${user.role === "admin"
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>'}
              </button>
              <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="AdminPanel.toggleActive(${user.id}, ${user.is_active})" title="${user.is_active ? "Deactivate" : "Activate"}">
                ${user.is_active
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'}
              </button>
              <button class="p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="AdminPanel.resetPassword(${user.id}, '${user.username}')" title="Reset Password">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              </button>
              <button class="p-2 rounded-md text-muted hover:text-error hover:bg-[rgba(196,69,69,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="AdminPanel.deleteUser(${user.id}, '${user.username}')" title="Delete User">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    });
    html += "</tbody></table></div></div>";
    container.innerHTML = html;
  }

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const confirmed = await UI.confirmDialog(
      `Change this user's role to "${newRole}"?`,
    );
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request("PATCH", `/admin/users/${userId}/role`, {
        role: newRole,
      });
      UI.toast(`Role updated to ${newRole}`, "success");
      await loadSection("users");
    } catch (e) {
      UI.toast(e.detail || "Failed to update role", "error");
    } finally {
      UI.loading(false);
    }
  }

  async function toggleActive(userId, currentActive) {
    UI.loading(true);
    try {
      await API.request("PATCH", `/admin/users/${userId}/active`, {
        is_active: !currentActive,
      });
      UI.toast(
        `User ${!currentActive ? "activated" : "deactivated"}`,
        "success",
      );
      await loadSection("users");
    } catch (e) {
      UI.toast(e.detail || "Failed to update status", "error");
    } finally {
      UI.loading(false);
    }
  }

  function resetPassword(userId, username) {
    UI.modal(
      `Reset Password: ${username}`,
      `
        <p class="text-secondary mb-4">Set a new password for this user.</p>
        <label class="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">New Password</label>
        <input class="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" id="reset-pw-input" type="password" placeholder="Minimum 6 characters" autocomplete="new-password">
        <div id="reset-pw-result" class="mt-3"></div>
      `,
      `<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">Cancel</button>
       <button class="px-4 py-2 rounded-none text-sm font-semibold text-white shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none" id="btn-reset-pw" style="background: var(--primary);">Reset Password</button>`,
    );

    setTimeout(() => {
      const btn = document.getElementById("btn-reset-pw");
      const input = document.getElementById("reset-pw-input");
      const result = document.getElementById("reset-pw-result");

      if (btn && input) {
        btn.addEventListener("click", async () => {
          const pw = input.value;
          if (pw.length < 6) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">Password must be at least 6 characters.</p>`;
            return;
          }
          btn.disabled = true;
          btn.textContent = "Resetting...";
          try {
            await API.request(
              "POST",
              `/admin/users/${userId}/reset-password`,
              { new_password: pw },
            );
            UI.toast("Password reset successfully", "success");
            document.querySelector(".fixed.inset-0.bg-black\\/50")?.remove();
          } catch (e) {
            result.innerHTML = `<p class="text-xs" style="color: var(--error);">${e.detail || "Failed"}</p>`;
            btn.disabled = false;
            btn.textContent = "Reset Password";
          }
        });
        input.focus();
      }
    }, 100);
  }

  async function deleteUser(userId, username) {
    const confirmed = await UI.confirmDialog(
      `Permanently delete user "${username}"? All their files and data will be removed.`,
    );
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request("DELETE", `/admin/users/${userId}`);
      UI.toast("User deleted", "success");
      await loadSection("users");
    } catch (e) {
      UI.toast(e.detail || "Failed to delete user", "error");
    } finally {
      UI.loading(false);
    }
  }

  async function renderStats(container) {
    const res = await API.request("GET", "/admin/stats");
    const storageMB = (res.files.storage_used_bytes / 1048576).toFixed(1);

    container.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Total Users</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">${res.users.total}</div>
          <div class="text-xs text-muted mt-1">${res.users.active} active · ${res.users.admins} admins</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Total Files</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">${res.files.total}</div>
          <div class="text-xs text-muted mt-1">${storageMB} MB stored</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Shares</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">${res.shares.total}</div>
          <div class="text-xs text-muted mt-1">${res.shares.active} active</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Public Links</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">${res.public_links.total}</div>
          <div class="text-xs text-muted mt-1">${res.public_links.active} active · ${res.api_keys} API keys</div>
        </div>
      </div>

      <div class="bg-surface-card border border-border rounded-lg p-5">
        <h3 class="text-base font-semibold mb-4">Recent Activity</h3>
        <div class="space-y-1">
          ${res.recent_activities.length === 0
        ? '<p class="text-sm text-muted text-center py-4">No recent activity.</p>'
        : res.recent_activities
            .map((a) => {
              return `<div class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: var(--primary);"></span>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm truncate">${a.details}</div>
                  </div>
                  <span class="text-xs text-muted whitespace-nowrap flex-shrink-0">${formatDate(a.timestamp)}</span>
                </div>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  async function renderSecurity(container) {
    container.innerHTML =
      '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div><p class="text-xs text-muted mt-3">Analyzing ciphertext security...</p></div>';

    const res = await API.request("GET", "/admin/security/stats");

    if (res.files_analyzed === 0) {
      container.innerHTML = `<div class="bg-surface-card border border-border rounded-lg p-10 text-center"><p class="text-muted">No encrypted files available for analysis yet.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Files Analyzed</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">${res.files_analyzed}</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Avg Security Score</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: ${res.average_score >= 70 ? "var(--success)" : "var(--warning)"};">${res.average_score}</div>
          <div class="text-xs text-muted mt-1">Range: ${res.min_score}–${res.max_score}</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Avg Entropy</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary);">${res.average_entropy}</div>
          <div class="text-xs text-muted mt-1">bits/byte (ideal: ~7.9)</div>
        </div>
        <div class="bg-surface-card border border-border rounded-lg p-4">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider">Lowest Score</div>
          <div style="font-size: 1.75rem; font-weight: 900; color: ${res.min_score < 50 ? "var(--error)" : "var(--warning)"};">${res.min_score}</div>
        </div>
      </div>

      <div class="bg-surface-card border border-border rounded-lg p-5">
        <h3 class="text-base font-semibold mb-4">Per-File Security Metrics</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left px-3 py-2 text-xs font-semibold text-secondary uppercase tracking-wider">File</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-secondary uppercase tracking-wider">Score</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-secondary uppercase tracking-wider">Entropy</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">Size</th>
              </tr>
            </thead>
            <tbody>
              ${res.per_file
        .map((f) => {
          const scoreColor =
              f.score >= 70
                ? "var(--success)"
                : f.score >= 50
                  ? "var(--warning)"
                  : "var(--error)";
          return `<tr class="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td class="px-3 py-2 text-sm font-medium truncate max-w-[200px]">${f.filename}</td>
                  <td class="px-3 py-2"><span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold" style="background: color-mix(in srgb, ${scoreColor} 15%, transparent); color: ${scoreColor};">${f.score}</span></td>
                  <td class="px-3 py-2 text-sm font-mono">${f.entropy.toFixed(4)}</td>
                  <td class="px-3 py-2 text-sm text-muted hidden sm:table-cell">${f.size_encrypted} bytes</td>
                </tr>`;
        })
        .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
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
    render,
    switchSection,
    toggleRole,
    toggleActive,
    resetPassword,
    deleteUser,
  };
})();
