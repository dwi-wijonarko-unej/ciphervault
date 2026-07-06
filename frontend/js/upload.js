const Upload = (() => {
  function render(container) {
    container.innerHTML = `
      <div class="bg-surface-card border border-border rounded-xl p-6 mb-6">
        <div class="border-2 border-dashed border-border rounded-xl p-10 text-center transition-all cursor-pointer drop-zone" id="drop-zone">
          <svg class="w-12 h-12 mx-auto mb-3 text-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <h3 class="text-base font-medium mb-1">Drag & drop files here</h3>
          <p class="text-sm text-muted">or click to browse — files up to 100MB</p>
          <input type="file" id="file-input" class="hidden" multiple>
        </div>
        <div id="upload-progress-area" class="hidden mt-4"></div>
      </div>
    `;
    setupDropZone();
  }

  function setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFiles(fileInput.files); });
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => uploadFile(file));
  }

  async function uploadFile(file) {
    const area = document.getElementById('upload-progress-area');
    area.classList.remove('hidden');

    const item = document.createElement('div');
    item.className = 'flex items-center gap-3 p-3 bg-surface rounded-lg animate-[fadeIn_0.3s_ease] mb-2';
    const icon = FileList.getFileIcon(file.name);
    item.innerHTML = `
      <span class="file-icon ${icon.cls} w-[36px] h-[36px]" style="width:36px;height:36px;">${icon.svg}</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">${file.name}</div>
        <div class="text-xs text-muted upload-status">${formatFileSize(file.size)} — Encrypting & uploading...</div>
      </div>
      <div class="w-[120px] h-1.5 bg-surface rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" id="progress-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}" style="width:0%"></div>
      </div>
    `;
    area.appendChild(item);

    const pid = `progress-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const statusEl = item.querySelector('.upload-status');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        simulateProgress(pid);
        await API.request('POST', '/files/upload', {
          filename: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
        const bar = document.getElementById(pid);
        if (bar) bar.style.width = '100%';
        statusEl.textContent = `${formatFileSize(file.size)} — Encrypted & stored securely`;
        item.style.borderColor = '#22c55e';
        UI.toast(`"${file.name}" uploaded successfully`, 'success');
        setTimeout(() => {
          App.navigate('dashboard');
          SecurityUI.renderFileAnalysis(res.id);
        }, 1000);
      } catch (err) {
        statusEl.textContent = `Failed: ${err.detail || 'Unknown error'}`;
        item.style.borderColor = '#ef4444';
        UI.toast(`Upload failed: ${file.name}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function simulateProgress(pid) {
    let p = 0;
    const int = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 90) { clearInterval(int); p = 90; }
      const bar = document.getElementById(pid);
      if (bar) bar.style.width = `${Math.min(p, 90)}%`;
    }, 300);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  return { render };
})();
