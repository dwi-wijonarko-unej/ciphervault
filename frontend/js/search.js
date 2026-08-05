const Search = (() => {
  let debounceTimer = null;

  function render(container, onSearch) {
    container.innerHTML = `
      <div class="mb-4">
        <div class="relative flex items-center">
          <svg class="absolute left-3.5 pointer-events-none" style="color: var(--muted);" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-md text-sm text-primary placeholder-muted outline-none transition-all focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[rgba(45,106,79,0.1)]" type="text" id="search-input" placeholder="${I18n.t("search.placeholder")}" autocomplete="off">
        </div>
      </div>
    `;

    const input = document.getElementById("search-input");
    if (input) {
      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const query = input.value.trim();
          if (onSearch) onSearch(query);
        }, 350);
      });
    }
  }

  return { render };
})();
