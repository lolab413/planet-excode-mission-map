/* Shared, opt-in preferences for the map and every native activity. */
(() => {
  'use strict';
  const key = 'planet-excode-accessibility-v1';
  const defaults = { contrast: false, text: false, motion: false, focus: false, gamepad: false, letters: false, spacing: 'default', selection: false };
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    for (const name of Object.keys(defaults).filter(name => name !== 'spacing')) preferences[name] = saved?.[name] === true;
    if (['default', 'comfortable', 'wide'].includes(saved?.spacing)) preferences.spacing = saved.spacing;
  } catch { /* Preferences also work for this visit without storage. */ }
  function apply() {
    for (const [name, enabled] of Object.entries(preferences).filter(([name]) => name !== 'spacing')) {
      document.documentElement.toggleAttribute(`data-access-${name}`, enabled);
    }
    for (const size of ['comfortable', 'wide']) document.documentElement.toggleAttribute(`data-access-spacing-${size}`, preferences.spacing === size);
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    const wordSearch = Boolean(document.getElementById('grid'));
    // Every page using this module gets the same persistent settings entry point.
    const launcher = document.createElement('button');
    launcher.type = 'button'; launcher.className = 'accessibility-launcher';
    launcher.setAttribute('data-accessibility-open', '');
    launcher.setAttribute('aria-label', 'Accessibility settings');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'accessibility-dialog');
    launcher.title = 'Accessibility settings';
    launcher.innerHTML = `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="14"/><circle cx="16" cy="8.5" r="2" fill="currentColor" stroke="none"/><path d="M8 13l8 2 8-2M16 15v6m0 0-5 6m5-6 5 6"/></svg><span class="accessibility-launcher-label" aria-hidden="true">Accessibility</span>`;
    document.body.append(launcher);
    const dialog = document.createElement('dialog');
    dialog.id = 'accessibility-dialog'; dialog.className = 'accessibility-dialog';
    dialog.setAttribute('aria-labelledby', 'accessibility-title');
    dialog.innerHTML = `<h2 id="accessibility-title" tabindex="-1" autofocus>Accessibility settings</h2>
      <p>Changes apply immediately and save on this browser. Puzzle difficulty and progress stay the same.</p>
      <fieldset><legend>Reading</legend><div id="reading-options" class="accessibility-options"></div></fieldset>
      <fieldset><legend>Puzzle layout</legend><div id="puzzle-options" class="accessibility-options"></div><p id="spacing-help">Space out word-search cells and coordinate diagrams. On smaller screens, larger grids scroll within their own area; keyboard navigation keeps the selected letter in view.</p></fieldset>
      <fieldset><legend>Appearance</legend><div id="appearance-options" class="accessibility-options"></div><p id="device-motion-status"></p></fieldset>
      <fieldset><legend>Navigation</legend><div id="navigation-options" class="accessibility-options"></div></fieldset>
      <fieldset><legend>Optional gamepad mode</legend><div id="gamepad-options" class="accessibility-options"></div><p>A controller is never required. Switch input methods anytime; your puzzle and progress stay in place.</p><p id="controller-status" role="status" aria-live="polite" aria-atomic="true"></p><details><summary>Controller buttons and movement</summary><ul><li>D-pad / left stick: move between controls or letters; change a focused choice.</li><li>Primary action (A / Cross): select. Back (B / Circle): cancel or close.</li><li>LB / RB: previous / next control, including leaving a grid or choice.</li></ul><p>Stick dead zone: 55%, with a 40% release threshold to reduce jitter. Held directions wait 400 ms, then repeat every 150 ms. Primary and cancel actions never repeat while held. Release the controls after enabling, reconnecting, or returning to this page.</p><p>Polling stops when this mode is off, the page is hidden or unfocused, or no supported controller is connected. Standard-mapped controllers are supported.</p></details></fieldset>
      ${wordSearch ? `<fieldset><legend>Word search controls</legend><p>Always available: arrows move between letters; Enter or Space chooses each endpoint; Escape cancels. Tab leaves the grid.</p><div id="word-search-options" class="accessibility-options"></div><p>The start has a dot, the selection has a dashed outline, and recovered letters have a double border and underline. These controls use the same puzzle.</p></fieldset>` : ''}
      <details><summary>Keyboard guide</summary>
        <p>Keyboard: Tab / Shift+Tab moves between controls. Enter or Space activates buttons. Escape closes dialogs.</p>
        <p>Word search: arrows move one letter; Home / End moves to the row edges; Ctrl+Home / Ctrl+End moves to the first / last letter. Enter or Space selects endpoints. Escape clears selection. Tab leaves the grid.</p>
        <p>Coordinate practice: use the x and y selectors, then Check point. In mission code, Tab / Shift+Tab leaves the editor; Ctrl+Enter (Command+Enter on Mac) launches code. Ctrl+] (Command+] on Mac) inserts indentation.</p>
      </details>
      <p id="accessibility-save-status" role="status"></p>
      <div class="accessibility-actions"><button type="button" id="accessibility-reset">Reset to defaults</button><button type="button" id="accessibility-close">Done</button></div>`;
    document.body.append(dialog);
    const options = [
      ['text', 'Larger interface text', 'reading'],
      ['letters', 'Larger puzzle letters and coordinate labels', 'puzzle'],
      ['contrast', 'High contrast', 'appearance'],
      ['motion', 'Reduce motion', 'appearance'],
      ['focus', 'Extra visible focus', 'navigation'],
      ['gamepad', 'Enable gamepad navigation', 'gamepad']
    ];
    if (wordSearch) options.push(['selection', 'Announce selected letters', 'word-search']);
    const inputs = {};
    for (const [name, label, group] of options) {
      const row = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = preferences[name]; inputs[name] = input;
      input.id = `access-${name}`;
      if (name === 'gamepad') input.setAttribute('aria-describedby', 'controller-status');
      input.addEventListener('change', () => { preferences[name] = input.checked; save(); });
      row.append(input, document.createTextNode(label));
      dialog.querySelector(`#${group}-options`).append(row);
    }
    const spacingLabel = document.createElement('label');
    const spacing = document.createElement('select');
    spacing.id = 'access-spacing'; spacing.setAttribute('aria-describedby', 'spacing-help');
    for (const [value, text] of [['default', 'Default'], ['comfortable', 'Comfortable'], ['wide', 'Wide']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; spacing.append(option);
    }
    spacing.value = preferences.spacing;
    spacing.addEventListener('change', () => { preferences.spacing = spacing.value; save(); });
    spacingLabel.className = 'accessibility-spacing';
    spacingLabel.append(document.createTextNode('Grid spacing'), spacing);
    dialog.querySelector('#puzzle-options').append(spacingLabel);
    const deviceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    function syncDeviceMotion() {
      dialog.querySelector('#device-motion-status').textContent = deviceMotion?.matches ?
        'Your device requests reduced motion. It stays reduced even when the switch above is off.' :
        'Your device’s reduced-motion preference is always respected, including after Reset to defaults.';
    }
    syncDeviceMotion(); deviceMotion?.addEventListener?.('change', syncDeviceMotion);
    function save() {
      apply();
      try { localStorage.setItem(key, JSON.stringify(preferences)); dialog.querySelector('#accessibility-save-status').textContent = 'Settings saved.'; }
      catch { dialog.querySelector('#accessibility-save-status').textContent = 'Settings apply for this visit. Browser storage is unavailable.'; }
      syncController();
    }
    let opener;
    document.querySelectorAll('[data-accessibility-open]').forEach(button => {
      button.addEventListener('click', () => { opener = button; dialog.showModal(); syncController(); });
    });
    dialog.querySelector('#accessibility-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener?.focus());
    dialog.querySelector('#accessibility-reset').addEventListener('click', () => {
      preferences = { ...defaults };
      for (const name of Object.keys(inputs)) inputs[name].checked = false;
      spacing.value = defaults.spacing;
      save();
    });
    let controllerBlocked = false;
    function connectedPads() {
      try { controllerBlocked = false; return Array.from(navigator.getGamepads?.() || []).filter(pad => pad?.connected); }
      catch { controllerBlocked = true; return []; /* Browser policy can disallow the API. */ }
    }
    function controllerStatus(connected = [], disconnected = false) {
      const text = !navigator.getGamepads ? 'Controller navigation is unavailable in this browser. Use keyboard, mouse, or touch.' :
        !preferences.gamepad ? 'Gamepad mode is off. Keyboard, mouse, and touch remain available.' :
        controllerBlocked ? 'Controller access is unavailable. Use keyboard, mouse, or touch.' :
        document.hidden || !document.hasFocus() ? 'Gamepad navigation is paused while this page is inactive.' :
        connected.some(pad => pad.mapping === 'standard') ? 'Standard controller connected. Release the controls, then navigate. Other input methods stay available.' :
        connected.length ? 'This controller has no standard mapping. Use a standard controller, keyboard, mouse, or touch.' :
        disconnected ? 'Controller disconnected. Progress is unchanged; reconnect or keep using keyboard, mouse, or touch.' :
        'Waiting for a standard controller. Press a controller button to connect, then release it. You can keep using the site without one.';
      const status = dialog.querySelector('#controller-status');
      if (status.textContent !== text) status.textContent = text;
    }
    function scope() { return Array.from(document.querySelectorAll('dialog[open]')).at(-1) || document; }
    function controls() {
      return Array.from(scope().querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex="0"]')).filter(el =>
        !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden],[inert]') && el.getClientRects().length);
    }
    function moveControl(delta) {
      const list = controls(); if (!list.length) return;
      const index = list.indexOf(document.activeElement);
      list[(index < 0 ? (delta > 0 ? 0 : list.length - 1) : (index + delta + list.length) % list.length)].focus();
    }
    function sendKey(key) {
      return document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    function action(name) {
      const active = document.activeElement;
      if (name === 'previous' || name === 'next') { moveControl(name === 'previous' ? -1 : 1); return; }
      if (name === 'back') {
        const modal = scope();
        if (modal !== document) {
          if (modal.dispatchEvent(new Event('cancel', { cancelable: true }))) modal.close();
          return;
        }
        if (!sendKey('Escape')) return;
        const help = document.getElementById('help-panel');
        if (help && !help.hidden) document.getElementById('close-help').click();
        return;
      }
      if (name === 'select') {
        if (!controls().includes(active)) { moveControl(1); return; }
        if (active.matches('.cell')) sendKey('Enter');
        else active.click();
        return;
      }
      if (active?.tagName === 'SELECT') {
        const delta = name === 'left' || name === 'up' ? -1 : 1;
        const index = Math.max(0, Math.min(active.options.length - 1, active.selectedIndex + delta));
        if (index !== active.selectedIndex) {
          active.selectedIndex = index;
          active.dispatchEvent(new Event('input', { bubbles: true }));
          active.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      if (active?.matches('.cell') && scope() === document) {
        sendKey({ left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[name]);
      } else moveControl(name === 'left' || name === 'up' ? -1 : 1);
    }
    let previous = new Set(), heldDirection = '', nextRepeat = 0, frameId = null;
    let needsNeutral = true, activePadIndex = null, controllerInUse = false, focusTarget = null;
    const actionButtons = [[0, 'select'], [1, 'back'], [4, 'previous'], [5, 'next']];
    const monitoredButtons = [0, 1, 4, 5, 12, 13, 14, 15];
    function markFocus() {
      focusTarget?.removeAttribute('data-gamepad-focus');
      focusTarget = controllerInUse ? document.activeElement : null;
      focusTarget?.setAttribute('data-gamepad-focus', '');
      focusTarget?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    function resetInput() {
      previous.clear(); heldDirection = ''; nextRepeat = 0; needsNeutral = true;
      controllerInUse = false; markFocus();
    }
    function stopPolling() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null; activePadIndex = null; resetInput();
    }
    function canPoll() { return preferences.gamepad && navigator.getGamepads && !document.hidden && document.hasFocus(); }
    function schedule() {
      if (canPoll() && frameId === null) frameId = requestAnimationFrame(poll);
    }
    function syncController(reset = false, disconnected = false) {
      if (reset) stopPolling();
      const connected = canPoll() ? connectedPads() : [];
      controllerStatus(connected, disconnected);
      if (!canPoll() || !connected.some(pad => pad.mapping === 'standard')) stopPolling();
      else schedule();
    }
    function stickDirection(x, y) {
      const direction = Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
      const threshold = direction === heldDirection ? .40 : .55;
      return Math.max(Math.abs(x), Math.abs(y)) >= threshold ? direction : '';
    }
    function perform(name) { controllerInUse = true; action(name); markFocus(); }
    function poll(now) {
      frameId = null;
      if (!canPoll()) { stopPolling(); controllerStatus(); return; }
      const connected = connectedPads();
      const pad = connected.find(pad => pad.mapping === 'standard' && pad.index === activePadIndex) || connected.find(pad => pad.mapping === 'standard');
      if (!pad) { stopPolling(); controllerStatus(connected, true); return; }
      if (activePadIndex !== pad.index) { resetInput(); activePadIndex = pad.index; }
      const down = i => pad.buttons[i]?.pressed === true;
      const x = Number.isFinite(pad.axes?.[0]) ? pad.axes[0] : 0;
      const y = Number.isFinite(pad.axes?.[1]) ? pad.axes[1] : 0;
      if (needsNeutral) {
        if (!monitoredButtons.some(down) && Math.abs(x) < .40 && Math.abs(y) < .40) needsNeutral = false;
        schedule(); return;
      }
      const pressed = new Set(actionButtons.filter(([index]) => down(index)).map(([, name]) => name));
      const direction = down(14) && !down(15) ? 'left' : down(15) && !down(14) ? 'right' :
        down(12) && !down(13) ? 'up' : down(13) && !down(12) ? 'down' : stickDirection(x, y);
      // Dispatch at most one action per frame, so a selection cannot also move
      // focus into a newly opened dialog in the same frame.
      const primary = ['back', 'select', 'previous', 'next'].find(name => pressed.has(name) && !previous.has(name));
      if (primary) perform(primary);
      else if (direction && (direction !== heldDirection || now >= nextRepeat)) {
        perform(direction); nextRepeat = now + (direction !== heldDirection ? 400 : 150);
      }
      previous = pressed; heldDirection = direction;
      schedule();
    }
    window.addEventListener('gamepadconnected', () => syncController(true));
    window.addEventListener('gamepaddisconnected', () => syncController(true, true));
    window.addEventListener('focus', () => syncController(true));
    window.addEventListener('blur', () => syncController(true));
    document.addEventListener('visibilitychange', () => syncController(true));
    document.addEventListener('focusin', () => { if (controllerInUse) markFocus(); });
    function otherInput(event) { if (event.isTrusted) resetInput(); }
    document.addEventListener('pointerdown', otherInput, true);
    document.addEventListener('keydown', otherInput, true);
    syncController();
  });
})();
