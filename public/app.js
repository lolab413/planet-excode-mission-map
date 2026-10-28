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
  const completionKey = 'planet-excode-coordinate-completed-v1';
  const attemptKey = 'planet-excode-coordinate-attempt-v1';
  const currentUrl = new URL(window.location.href);
  const returning = currentUrl.searchParams.get('coordinateComplete') === '1';
  let coordinateComplete = false;
  let storageAvailable = true;
  try {
    coordinateComplete = localStorage.getItem(completionKey) === 'true';
    const attempt = currentUrl.searchParams.get('coordinateAttempt');
    if (returning && attempt && attempt === sessionStorage.getItem(attemptKey)) {
      coordinateComplete = true;
      localStorage.setItem(completionKey, 'true');
      sessionStorage.removeItem(attemptKey);
    }
  } catch { storageAvailable = false; }
  // Remove return markers so refreshing or copying this URL cannot complete another attempt.
  currentUrl.searchParams.delete('coordinateComplete');
  currentUrl.searchParams.delete('coordinateAttempt');
  if (returning) history.replaceState(null, '', currentUrl.href);
  const coordinateButton = document.querySelector('[data-activity="coordinateActivityUrl"]');
  if (coordinateComplete) {
    coordinateButton.textContent = 'Completed';
    coordinateButton.setAttribute('aria-label', 'Find your coordinates completed');
    coordinateButton.disabled = true;
    document.getElementById('coordinate-status').textContent = 'All five coordinate missions completed.';
    document.getElementById('link-status').textContent = 'Coordinate activity completed';
  }
  if (!storageAvailable) {
    document.getElementById('coordinate-status').textContent = 'Browser storage is unavailable. Completion cannot be saved.';
  }
  // Keep each game's destination independent; empty or unsafe URLs cannot navigate.
  document.querySelectorAll('[data-activity]').forEach(button => {
    if (button === coordinateButton && coordinateComplete) return;
    const value = window.PLANET_EXCODE_CONFIG?.[button.dataset.activity];
    if (typeof value !== 'string' || !value.trim()) return;
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
      button.disabled = false;
      document.getElementById(button.getAttribute('aria-describedby')).hidden = true;
      button.addEventListener('click', () => {
        if (button === coordinateButton) {
          const attempt = crypto.randomUUID();
          try { sessionStorage.setItem(attemptKey, attempt); } catch { /* Browsing still works. */ }
          url.searchParams.set('returnTo', currentUrl.href);
          url.searchParams.set('mapAttempt', attempt);
        }
        window.location.assign(url.href);
      });
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
  if (returning && coordinateComplete) {
    opener = document.getElementById('mission-start');
    dialog.showModal();
  }
  // Native dialog handles Escape and contains keyboard focus.
})();


