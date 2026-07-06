const FileList = (() => {
  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const cats = { pdf: 'pdf', jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
      webp: 'image', svg: 'image', doc: 'doc', docx: 'doc', xls: 'doc',
      xlsx: 'doc', ppt: 'doc', pptx: 'doc', mp4: 'video', avi: 'video',
      mkv: 'video', mov: 'video', zip: 'archive', rar: 'archive',
      '7z': 'archive', tar: 'archive', gz: 'archive', js: 'code',
      ts: 'code', py: 'code', java: 'code', html: 'code', css: 'code',
      json: 'code', xml: 'code', md: 'code' };
    const svg = {
      pdf: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      image: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      doc: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      video: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
      archive: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      code: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    };
    const c = cats[ext] || 'default';
    return { cls: `file-icon-${c}`, svg: svg[c] || svg.doc };
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  async function render(container, searchQuery = '') {
    container.innerHTML = '<div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border border-t-blue-500 rounded-full animate-[spin_0.6s_linear_infinite] mx-auto"></div></div>';
    try {
      const path = searchQuery ? `/files/search?q=${encodeURIComponent(searchQuery)}` : '/files';
      const res = await API.request('GET', path);
      renderStats(res.total);

      if (res.items.length === 0) {
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 text-center animate-[fadeIn_0.3s_ease]">
            <svg class="w-16 h-16 opacity-40 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            <h3 class="text-lg font-semibold">${searchQuery ? 'No files found' : 'No files yet'}</h3>
            <p class="text-sm text-muted mt-2">${searchQuery ? 'Try a different search term.' : 'Upload your first file to get started.'}</p>
          </div>`;
        return;
      }

      let html = `<div class="bg-surface-card border border-border rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-surface">
                <th class="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Name</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Size</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider hidden md:table-cell">Date</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>`;
      res.items.forEach((file) => {
        const icon = getFileIcon(file.filename_original);
        const ext = file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE';
        html += `
          <tr class="border-t border-border hover:bg-[rgba(59,130,246,0.02)] transition-colors file-list-enter">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5 cursor-pointer" onclick="FileList.showDetail(${file.id})">
                  <span class="file-icon ${icon.cls}">${icon.svg}</span>
                  <div class="min-w-0">
                    <div class="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">${file.filename_original}</div>
                    <div class="text-xs text-muted flex items-center gap-2">
                      <span>ID: ${file.id}</span>
                      <span class="inline-flex items-center gap-0.5 text-emerald-400 text-[10px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        UHC+AES+RSA
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            <td class="px-4 py-3 text-sm text-[#94a3b8] whitespace-nowrap">${file.file_size_formatted || '—'}</td>
            <td class="px-4 py-3 hidden sm:table-cell"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ext === 'PDF' ? 'text-amber-400 bg-[rgba(234,179,8,0.1)]' : 'text-emerald-400 bg-[rgba(34,197,94,0.1)]'}">${ext}</span></td>
            <td class="px-4 py-3 text-sm text-muted whitespace-nowrap hidden md:table-cell">${formatDate(file.created_at)}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button class="p-2 rounded-lg text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="Download.handle(${file.id}, '${file.filename_original}')" title="Download">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="p-2 rounded-lg text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="UI.openShareModal(${file.id}, '${file.filename_original}')" title="Share">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button class="p-2 rounded-lg text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="FileList.verifyIntegrity(${file.id})" title="Verify">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </button>
                <button class="p-2 rounded-lg text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="SecurityUI.renderFileAnalysis(${file.id})" title="Analyze Security">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </button>
                <button class="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-[rgba(239,68,68,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="FileList.deleteFile(${file.id})" title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      });
      html += '</tbody></table></div></div>';
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<div class="bg-surface-card border border-border rounded-xl p-10 text-center"><p class="text-red-400">${e.detail || 'Failed to load files'}</p></div>`;
    }
  }

  function renderStats(total) {
    const area = document.getElementById('stats-area');
    if (!area) return;
    area.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-surface-card border border-border rounded-xl p-5">
          <div class="text-xs font-medium text-muted">Total Files</div>
          <div class="text-2xl font-bold mt-1">${total}</div>
        </div>
        <div class="bg-surface-card border border-border rounded-xl p-5">
          <div class="text-xs font-medium text-muted">Encryption</div>
          <div class="mt-2"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-emerald-400 bg-[rgba(34,197,94,0.1)]">UHC + AES-256</span></div>
        </div>
        <div class="bg-surface-card border border-border rounded-xl p-5">
          <div class="text-xs font-medium text-muted">Storage</div>
          <div class="mt-2"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-emerald-400 bg-[rgba(34,197,94,0.1)]">Zero-Knowledge</span></div>
        </div>
        <div class="bg-surface-card border border-border rounded-xl p-5">
          <div class="text-xs font-medium text-muted">Status</div>
          <div class="mt-2"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-emerald-400 bg-[rgba(34,197,94,0.1)]">Protected</span></div>
        </div>
      </div>`;
  }

  async function deleteFile(fileId) {
    const confirmed = await UI.confirmDialog('Are you sure you want to delete this file? This action cannot be undone.');
    if (!confirmed) return;
    UI.loading(true);
    try {
      await API.request('DELETE', `/files/${fileId}`);
      UI.toast('File deleted successfully', 'success');
      App.navigate('dashboard');
    } catch (e) {
      UI.toast(e.detail || 'Delete failed', 'error');
    } finally {
      UI.loading(false);
    }
  }

  async function verifyIntegrity(fileId) {
    UI.loading(true);
    try {
      const res = await API.request('POST', `/files/${fileId}/verify`);
      UI.toast(res.message || 'Integrity check passed', 'success');
    } catch (e) {
      UI.toast(e.detail || 'Integrity check failed', 'error');
    } finally {
      UI.loading(false);
    }
  }

  async function showDetail(fileId) {
    try {
      const file = await API.request('GET', `/files/${fileId}`);
      const icon = getFileIcon(file.filename_original);
      UI.renderFileDetail(file, icon);
    } catch {
      UI.toast('Failed to load file details', 'error');
    }
  }

  return { render, deleteFile, verifyIntegrity, getFileIcon, showDetail };
})();
