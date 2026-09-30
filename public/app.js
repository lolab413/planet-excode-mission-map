(() => {
  const themeToggle = document.getElementById('theme-toggle');
  function syncThemeButton() {
    const day = document.documentElement.dataset.theme === 'day';
    themeToggle.setAttribute('aria-label', day ? 'Switch to night mode' : 'Switch to day mode');
    themeToggle.title = day ? 'Switch to night mode' : 'Switch to day mode';
    themeToggle.querySelector('span').textContent = day ? '\u263e' : '\u2600';
  }
  syncThemeButton();
  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'day' ? 'night' : 'day';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('planet-excode-theme', theme); } catch { /* Storage is optional. */ }
    syncThemeButton();
  });
  const dialog = document.getElementById('mission-dialog');
  const panel = document.querySelector('.mission-card');
  document.getElementById('coordinate-title').textContent = panel.querySelector('h2').textContent;
  document.getElementById('coordinate-description').textContent = panel.querySelector('p').textContent;
  // Keep each game's destination independent; empty or unsafe URLs cannot navigate.
  document.querySelectorAll('[data-activity]').forEach(button => {
    const value = window.PLANET_EXCODE_CONFIG?.[button.dataset.activity];
    if (typeof value !== 'string' || !value.trim()) return;
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
      button.disabled = false;
      document.getElementById(button.getAttribute('aria-describedby')).hidden = true;
      button.addEventListener('click', () => window.location.assign(url.href));
    } catch { /* Leave unconfigured activities visibly unavailable. */ }
  });
  let opener;
  document.querySelectorAll('[data-mission-open]').forEach(control => {
    control.addEventListener('click', () => {
      opener = control;
      dialog.showModal();
    });
  });
  document.getElementById('mission-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  // Native dialog handles Escape and contains keyboard focus.
})();


