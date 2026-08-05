const I18nLegal = (() => {
  async function init() {
    const lang = I18n.getLang();
    const legalBlocks = document.querySelectorAll(`.lang-${lang}`);
    const otherBlocks = document.querySelectorAll(
      `.lang-${lang === "id" ? "en" : "id"}`,
    );
    legalBlocks.forEach((b) => (b.style.display = ""));
    otherBlocks.forEach((b) => (b.style.display = "none"));
    document.documentElement.lang = lang;
  }

  async function toggle() {
    const current = I18n.getLang();
    const newLang = current === "id" ? "en" : "id";
    await I18n.setLang(newLang);
    init();
  }

  function renderToggle(container) {
    const lang = I18n.getLang();
    const btn = document.createElement("button");
    btn.className =
      "px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer border-none " +
      "bg-transparent text-muted hover:text-primary";
    btn.textContent = lang === "id" ? "EN" : "ID";
    btn.onclick = () => toggle();
    if (container) container.appendChild(btn);
  }

  return { init, toggle, renderToggle };
})();
