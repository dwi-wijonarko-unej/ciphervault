const Download = (() => {
  async function handle(fileId, filename) {
    UI.loading(true);
    try {
      UI.toast(`Decrypting "${filename}"...`, "info");
      const res = await fetch(`/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { detail: err.detail || "Download failed" };
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      UI.toast(`"${filename}" downloaded & decrypted successfully`, "success");
    } catch (e) {
      UI.toast(e.detail || "Download failed", "error");
    } finally {
      UI.loading(false);
    }
  }

  return { handle };
})();
