// Apply a saved preference before paint; first visits retain the original night palette.
(() => {
  let theme = 'night';
  try { if (localStorage.getItem('planet-excode-theme') === 'day') theme = 'day'; } catch {}
  document.documentElement.dataset.theme = theme;
})();
