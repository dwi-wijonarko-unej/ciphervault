const Theme = (() => {
  const STORAGE_KEY = 'cv_theme';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved !== null ? saved === 'dark' : prefersDark;
    setTheme(isDark);

    document.getElementById('btn-theme')?.addEventListener('click', toggle);
  }

  function setTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (sun && moon) {
      sun.classList.toggle('hidden', dark);
      moon.classList.toggle('hidden', !dark);
    }
  }

  function toggle() {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(!isDark);
  }

  return { init, toggle, setTheme };
})();

document.addEventListener('DOMContentLoaded', () => Theme.init());
