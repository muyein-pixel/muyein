(function () {
  const STORAGE_KEY = 'theme';
  const root = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');

  function getPreferredTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getCurrentTheme() {
    return root.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateButtonLabel(theme);
  }

  function updateButtonLabel(theme) {
    if (!toggleBtn) return;
    if (theme === 'dark') {
      toggleBtn.textContent = '☀ 라이트 모드';
      toggleBtn.setAttribute('aria-label', '라이트 모드로 전환');
    } else {
      toggleBtn.textContent = '🌙 다크 모드';
      toggleBtn.setAttribute('aria-label', '다크 모드로 전환');
    }
  }

  function toggleTheme() {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  setTheme(saved || getPreferredTheme());

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
})();
