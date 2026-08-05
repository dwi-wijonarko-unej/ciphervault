const I18n = (() => {
  let dict = {};
  let currentLang = "en";

  function detectLang() {
    const saved = localStorage.getItem("cv_lang");
    if (saved === "id" || saved === "en") return saved;
    const nav = navigator.language || "";
    return nav.startsWith("id") ? "id" : "en";
  }

  async function init() {
    currentLang = detectLang();
    await loadDict(currentLang);
    applyAll();
    document.documentElement.lang = currentLang;
    window.dispatchEvent(new CustomEvent("cv:i18n-ready"));
  }

  async function loadDict(lang) {
    try {
      const res = await fetch(`lang/${lang}.json?v=20260805`);
      if (!res.ok) throw new Error(res.status);
      dict = await res.json();
    } catch {
      dict = {};
    }
  }

  function t(key, vars) {
    let val = dict[key];
    if (val === undefined) val = key;
    if (vars && typeof val === "string") {
      Object.keys(vars).forEach((k) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      });
    }
    return val;
  }

  function applyAll() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      el.title = t(key);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      el.innerHTML = t(key);
    });
  }

  function applyDynamic() {
    applyAll();
  }

  async function setLang(lang) {
    if (lang !== "id" && lang !== "en") return;
    localStorage.setItem("cv_lang", lang);
    currentLang = lang;
    await loadDict(lang);
    applyAll();
    document.documentElement.lang = lang;
    renderSwitcher();
    window.dispatchEvent(new CustomEvent("cv:i18n-changed"));
  }

  function getLang() {
    return currentLang;
  }

  function renderSwitcher() {
    document.querySelectorAll(".lang-switcher").forEach((sw) => {
      sw.innerHTML = "";
      const langs = ["id", "en"];
      langs.forEach((l) => {
        const btn = document.createElement("button");
        btn.className =
          "px-2 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer border-none " +
          (l === currentLang
            ? "bg-primary text-white"
            : "bg-transparent text-muted hover:text-primary");
        btn.textContent = l.toUpperCase();
        btn.onclick = () => setLang(l);
        sw.appendChild(btn);
      });
    });
  }

  function attachAntiFlash() {
    const s = document.createElement("script");
    s.textContent = `
      (function(){
        var lang = localStorage.getItem('cv_lang');
        if (!lang) {
          var nav = navigator.language || '';
          lang = nav.startsWith('id') ? 'id' : 'en';
        }
        document.documentElement.lang = lang;
        document.documentElement.dataset.i18nLang = lang;
      })();
    `;
    document.head.appendChild(s);
  }

  return {
    init,
    t,
    applyAll,
    applyDynamic,
    setLang,
    getLang,
    renderSwitcher,
    attachAntiFlash,
  };
})();
