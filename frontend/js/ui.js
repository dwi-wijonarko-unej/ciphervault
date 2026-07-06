const UI = (() => {
  let toastContainer = null;

  function init() {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2';
      document.body.appendChild(toastContainer);
    }
  }

  function toast(message, type = 'info', duration = 4000) {
    init();
    const colors = {
      success: 'border-l-[3px] border-l-emerald-500',
      error: 'border-l-[3px] border-l-red-500',
      info: 'border-l-[3px] border-l-blue-500',
    };
    const icons = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const el = document.createElement('div');
    el.className = `toast-enter flex items-center gap-3 px-4 py-3.5 bg-surface-card border border-border rounded-lg shadow-2xl min-w-[320px] max-w-[420px] ${colors[type]}`;
    el.innerHTML = `
      <span class="flex-shrink-0">${icons[type] || icons.info}</span>
      <span class="flex-1 text-sm">${message}</span>
      <button class="flex-shrink-0 text-muted hover:text-[#e2e8f0] transition-colors cursor-pointer bg-transparent border-none p-1" onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    toastContainer.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  function modal(title, bodyHtml, footerHtml = '') {
    init();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[8000] flex items-center justify-center p-5 modal-enter';
    overlay.innerHTML = `
      <div class="bg-surface-card border border-border rounded-xl shadow-2xl w-full max-w-[480px] max-h-[80vh] overflow-y-auto modal-enter">
        <div class="flex items-center justify-between px-6 pt-5">
          <h3 class="text-lg font-semibold">${title}</h3>
          <button class="p-2 rounded-lg text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="px-6 py-5">${bodyHtml}</div>
        ${footerHtml ? `<div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">${footerHtml}</div>` : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = modal(
        'Confirm',
        `<p class="text-[#94a3b8]">${message}</p>`,
        `<button class="px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove(); window.__confirmResolve && window.__confirmResolve(false)">Cancel</button>
         <button class="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer border-none" onclick="this.closest('.fixed.inset-0').remove(); window.__confirmResolve && window.__confirmResolve(true)">Delete</button>`
      );
      window.__confirmResolve = resolve;
    });
  }

  function loading(show) {
    const existing = document.getElementById('global-loading');
    if (show) {
      if (!existing) {
        const el = document.createElement('div');
        el.id = 'global-loading';
        el.className = 'fixed inset-0 bg-black/30 z-[9999] flex items-center justify-center';
        el.innerHTML = '<div class="w-10 h-10 border-2 border-border border-t-blue-500 rounded-full animate-[spin_0.6s_linear_infinite]"></div>';
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
    const sidePanel = document.createElement('div');
    sidePanel.className = 'fixed inset-0 z-[7000] flex justify-end modal-enter';
    sidePanel.innerHTML = `
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
      <div class="relative w-full max-w-[420px] bg-surface-card border-l border-border h-full overflow-y-auto p-6 slide-in-right">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <span class="file-icon" style="width:36px;height:36px;">${icon.svg}</span>
            <div>
              <h3 class="text-base font-semibold truncate max-w-[280px]">${file.filename_original}</h3>
              <span class="text-xs text-emerald-400">Encrypted</span>
            </div>
          </div>
          <button class="p-2 rounded-lg text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="this.closest('.fixed.inset-0').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="bg-surface border border-border rounded-lg p-4">
            <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Encryption Details</h4>
            <div class="space-y-2.5">
              <div class="flex justify-between"><span class="text-sm text-muted">Layer 1</span><span class="text-sm font-medium">UHC (mod 257)</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Layer 2</span><span class="text-sm font-medium">AES-256-CBC</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Key Wrap</span><span class="text-sm font-medium">RSA-OAEP</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">AI Mode</span><span class="text-sm font-medium">adaptive_split</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Modulus</span><span class="text-sm font-medium">257</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Logistic R</span><span class="text-sm font-medium">${file.logistic_r || '3.99'}</span></div>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-lg p-4">
            <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">File Info</h4>
            <div class="space-y-2.5">
              <div class="flex justify-between"><span class="text-sm text-muted">Size</span><span class="text-sm font-medium">${file.file_size_formatted || formatBytes(file.file_size_original)}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Encrypted Size</span><span class="text-sm font-medium">${formatBytes(file.file_size_encrypted)}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Type</span><span class="text-sm font-medium">${file.mime_type || '—'}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">Created</span><span class="text-sm font-medium">${formatDate(file.created_at)}</span></div>
              <div class="flex justify-between"><span class="text-sm text-muted">File ID</span><span class="text-sm font-mono text-blue-400">${file.id}</span></div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer border-none" onclick="Download.handle(${file.id}, '${file.filename_original}');this.closest('.fixed.inset-0').remove()">
              Download
            </button>
            <button class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-[#e2e8f0] bg-[rgba(59,130,246,0.1)] hover:bg-[rgba(59,130,246,0.18)] transition-all cursor-pointer border-none" onclick="SecurityUI.renderFileAnalysis(${file.id})">
              Analyze Security
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidePanel);
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  return { init, toast, modal, confirmDialog, loading, openShareModal, renderFileDetail };
})();

document.addEventListener('DOMContentLoaded', () => UI.init());
