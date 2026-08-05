const Download = (() => {
  async function handle(fileId, filename) {
    UI.loading(true);
    try {
      UI.toast(I18n.t("download.decrypting", { filename }), "info");
      const res = await fetch(`/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { detail: err.detail || I18n.t("download.failed") };
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

      UI.toast(I18n.t("download.success", { filename }), "success");
    } catch (e) {
      UI.toast(e.detail || I18n.t("download.failed"), "error");
    } finally {
      UI.loading(false);
    }
  }

  return { handle };
})();
