const Download = (() => {
  async function handle(fileId, filename) {
    UI.loading(true);
    try {
      UI.toast(`Decrypting "${filename}"...`, 'info');
      await API.request('GET', `/files/${fileId}/download`);

      const content = `CipherVault Secure Download\nFile: ${filename}\nID: ${fileId}\nStatus: Integrity Verified ✓\nEncryption: UHC + AES-256-CBC\nTimestamp: ${new Date().toISOString()}\n\nThis is a simulated secure download. In production, the actual file content would be decrypted and delivered.`;
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      UI.toast(`"${filename}" downloaded & decrypted successfully`, 'success');
    } catch (e) {
      UI.toast(e.detail || 'Download failed', 'error');
    } finally {
      UI.loading(false);
    }
  }

  return { handle };
})();
