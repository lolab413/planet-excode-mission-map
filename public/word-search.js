import { ACTIVITY_ID, PROGRESS_KEY, COMPLETION_KEY, CONCEPTS, createBoard, lineBetween, validProgress } from './word-search-board.js';

(() => {
  'use strict';
  const concepts = CONCEPTS;
  const $ = id => document.getElementById(id);
  const grid = $('grid');
  let found = new Set(), anchor = null, dragging = false, moved = false, ignoreClick = false, pointerId = null;
  let storageAvailable = true;
  let board, completed = false, soundEnabled = false, audio;
  try {
    completed = localStorage.getItem(COMPLETION_KEY) === 'true';
    soundEnabled = localStorage.getItem(`${ACTIVITY_ID}-sound`) === 'true';
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    if (validProgress(saved)) { board = saved; found = new Set(saved.found); }
  } catch { storageAvailable = false; }
  board ??= createBoard();
  let solutions = board.solutions;
  const cells = [];
  const rows = Array.from({ length: 10 }, (_, i) => board.letters.slice(i * 10, i * 10 + 10).join(''));
  rows.forEach((letters, r) => {
    const row = document.createElement('div'); row.setAttribute('role', 'row'); grid.append(row);
    [...letters].forEach((letter, c) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cell'; button.textContent = letter;
      button.dataset.index = r * 10 + c; button.tabIndex = r === 0 && c === 0 ? 0 : -1;
      button.setAttribute('role', 'gridcell'); button.setAttribute('aria-label', `${letter}, row ${r + 1}, column ${c + 1}`);
      button.setAttribute('aria-selected', 'false'); row.append(button); cells.push(button);
    });
  });
  const path = lineBetween;
  function focusCell(index) {
    cells.forEach((cell, i) => cell.tabIndex = i === index ? 0 : -1);
    cells[index].focus();
    cells[index].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  function sound(celebrate = false) {
    if (!soundEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ??= new Audio();
      void audio.resume().catch(() => {});
      (celebrate ? [523, 659, 784, 1047] : [523, 659]).forEach((frequency, i) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        const start = audio.currentTime + i * .12;
        oscillator.frequency.value = frequency; oscillator.type = 'sine';
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.06, start + .015);
        gain.gain.exponentialRampToValueAtTime(.001, start + .22);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + .24);
      });
    } catch { /* Audio is optional. */ }
  }
  function syncSound() {
    $('sound').textContent = soundEnabled ? 'Sound on · Mute' : 'Sound off · Enable';
    $('sound').setAttribute('aria-pressed', String(soundEnabled));
  }
  $('sound').addEventListener('click', () => {
    soundEnabled = !soundEnabled; syncSound();
    if (!soundEnabled && audio) void audio.suspend().catch(() => {});
    try { localStorage.setItem(`${ACTIVITY_ID}-sound`, String(soundEnabled)); } catch { /* Optional preference. */ }
    if (soundEnabled) sound();
  });
  syncSound();
  function clearSelection() {
    anchor = null;
    cells.forEach(cell => { cell.classList.remove('selected', 'selection-start', 'hint'); cell.setAttribute('aria-selected', 'false'); });
    $('selection-status').textContent = '';
    updateCellLabels();
  }
  function preview(end) {
    const selected = path(anchor, end);
    cells.forEach((cell, i) => {
      const included = selected.includes(i) || i === anchor;
      cell.classList.toggle('selected', included); cell.classList.toggle('selection-start', i === anchor);
      cell.setAttribute('aria-selected', String(included));
    });
    updateCellLabels();
    if (end !== anchor && document.documentElement.hasAttribute('data-access-selection')) {
      const message = selected.length ? `${selected.map(i => cells[i].textContent).join(' ')}. ${selected.length} letters selected.` : 'Not a straight line. Choose an endpoint in the same row, column, or diagonal.';
      if ($('selection-status').textContent !== message) $('selection-status').textContent = message;
    } else $('selection-status').textContent = '';
  }
  function updateCellLabels() {
    cells.forEach((cell, i) => {
      const recovered = [...found].filter(word => solutions[word].includes(i));
      cell.setAttribute('aria-label', `${cell.textContent}, row ${Math.floor(i / 10) + 1}, column ${i % 10 + 1}${i === anchor ? '; starting letter' : ''}${recovered.length ? `; recovered: ${recovered.join(', ')}` : ''}`);
    });
  }
  function startingMessage() {
    return `Start: ${cells[anchor].textContent}, row ${Math.floor(anchor / 10) + 1}, column ${anchor % 10 + 1}. Choose the last letter.`;
  }
  function render() {
    cells.forEach(cell => cell.classList.remove('found'));
    $('words').replaceChildren();
    Object.entries(concepts).forEach(([word, definition]) => {
      const item = document.createElement('li'); const label = document.createElement('span');
      label.className = 'word-label'; label.textContent = word[0] + word.slice(1).toLowerCase(); item.append(label);
      if (found.has(word)) {
        item.className = 'recovered'; label.textContent += ' ✓';
        const state = document.createElement('span'); state.className = 'recovered-state'; state.textContent = ' Recovered'; item.append(state);
        const meaning = document.createElement('span'); meaning.className = 'definition'; meaning.textContent = definition; item.append(meaning);
        solutions[word].forEach(i => cells[i].classList.add('found'));
      }
      $('words').append(item);
    });
    updateCellLabels();
    $('count').textContent = `${found.size} / 6 RECOVERED`; $('progress').value = found.size;
    $('hint').disabled = found.size === 6;
    $('completion-status').textContent = completed ? 'Mission completed · Replay keeps your achievement.' : 'Recover all six concepts to reboot Exi.';
  }
  function save() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...board, found: [...found] }));
      if (completed) localStorage.setItem(COMPLETION_KEY, 'true');
    } catch { storageAvailable = false; }
  }
  function finish(end) {
    const letters = path(anchor, end).map(i => cells[i].textContent).join('');
    const word = Object.keys(concepts).find(candidate => candidate === letters || candidate === [...letters].reverse().join(''));
    clearSelection();
    if (!word) { $('feedback').textContent = 'No concept recovered. Choose a straight line from the first to the last letter.'; return; }
    if (found.has(word)) { $('feedback').textContent = `${word} is already recovered. Look for another concept.`; return; }
    found.add(word);
    if (found.size === 6) completed = true;
    save(); render(); sound(found.size === 6);
    if (found.size === 6 && !$('complete').open) $('complete').showModal();
    solutions[word].forEach(i => { cells[i].classList.remove('discovered'); void cells[i].offsetWidth; cells[i].classList.add('discovered'); });
    $('discovery').textContent = `${word} recovered! ${concepts[word]}`;
    $('feedback').textContent = found.size === 6 ? `${word} recovered. All six concepts recovered. Exi is back online!` : `${word} recovered. ${found.size} of 6 concepts restored.`;
    if (!storageAvailable) $('feedback').textContent += ' Progress is available for this visit; browser storage is unavailable.';
  }
  function choose(index) {
    if (anchor === null) { clearSelection(); anchor = index; preview(index); $('feedback').textContent = startingMessage(); }
    else if (anchor === index) { clearSelection(); $('feedback').textContent = 'Selection cleared. Choose a new starting letter.'; }
    else finish(index);
  }
  grid.addEventListener('click', event => {
    if (ignoreClick && event.detail !== 0) { ignoreClick = false; return; }
    const cell = event.target.closest('.cell');
    if (cell) { const index = Number(cell.dataset.index); focusCell(index); choose(index); }
  });
  grid.addEventListener('pointerdown', event => {
    if (dragging || event.isPrimary === false) return;
    ignoreClick = false;
    const cell = event.target.closest('.cell'); if (!cell || event.button !== 0 || anchor !== null) return;
    pointerId = event.pointerId;
    focusCell(Number(cell.dataset.index));
    dragging = true; moved = false; anchor = Number(cell.dataset.index); preview(anchor);
  });
  window.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.cell');
    if (cell && grid.contains(cell)) { const end = Number(cell.dataset.index); if (end !== anchor) moved = true; preview(end); }
  });
  window.addEventListener('pointerup', event => {
    if (!dragging || event.pointerId !== pointerId) return; dragging = false; pointerId = null;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.cell');
    // A tap starts endpoint selection; suppress its ensuing click.
    ignoreClick = true;
    if (moved && cell && grid.contains(cell)) finish(Number(cell.dataset.index));
    else if (moved) clearSelection();
    else $('feedback').textContent = startingMessage();
  });
  window.addEventListener('pointercancel', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false; pointerId = null; ignoreClick = true; clearSelection();
    $('feedback').textContent = 'Selection cleared. Choose a new starting letter.';
  });
  grid.addEventListener('keydown', event => {
    const cell = event.target.closest('.cell'); if (!cell) return;
    const index = Number(cell.dataset.index), r = Math.floor(index / 10), c = index % 10;
    const targets = { Home: event.ctrlKey ? 0 : r * 10, End: event.ctrlKey ? 99 : r * 10 + 9, ArrowLeft: r * 10 + Math.max(0, c - 1), ArrowRight: r * 10 + Math.min(9, c + 1), ArrowUp: Math.max(0, r - 1) * 10 + c, ArrowDown: Math.min(9, r + 1) * 10 + c };
    if (Object.hasOwn(targets, event.key)) { event.preventDefault(); focusCell(targets[event.key]); if (anchor !== null) preview(targets[event.key]); }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) choose(index);
    }
    if (event.key === 'Escape') {
      event.preventDefault(); dragging = false; pointerId = null; moved = false; ignoreClick = true;
      clearSelection(); $('feedback').textContent = 'Selection cleared.';
    }
  });
  $('hint').addEventListener('click', () => {
    clearSelection(); const word = Object.keys(concepts).find(candidate => !found.has(candidate)); if (!word) return;
    const index = solutions[word][0]; cells[index].classList.add('hint'); focusCell(index);
    $('feedback').textContent = `${word} starts at row ${Math.floor(index / 10) + 1}, column ${index % 10 + 1}. Its starting letter is outlined.`;
  });
  $('start').textContent = found.size === 6 ? 'View completed reboot →' : found.size ? 'Resume system recovery →' : 'Start system reboot →';
  $('saved-note').textContent = storageAvailable ? (found.size ? `${found.size} of 6 concepts saved on this browser.` : 'Your progress saves automatically on this browser.') : 'Browser storage is unavailable. You can still play this visit.';
  $('start').addEventListener('click', () => {
    $('briefing').hidden = true; $('game').hidden = false; $('game-title').focus();
    if (found.size === 6 && !$('complete').open) $('complete').showModal();
  });
  const restartDialog = $('restart-dialog');
  $('restart').addEventListener('click', () => restartDialog.showModal());
  $('cancel-restart').addEventListener('click', () => restartDialog.close());
  function reset() {
    if ($('complete').open) $('complete').close();
    found.clear(); clearSelection(); board = createBoard(); solutions = board.solutions;
    cells.forEach((cell, i) => {
      cell.textContent = board.letters[i]; cell.classList.remove('discovered');
      cell.setAttribute('aria-label', `${board.letters[i]}, row ${Math.floor(i / 10) + 1}, column ${i % 10 + 1}`);
    });
    save(); render(); $('discovery').textContent = 'Discover a concept to learn what it does.';
    $('feedback').textContent = 'New board ready. Your earned completion is preserved.'; focusCell(0);
  }
  $('confirm-restart').addEventListener('click', () => { restartDialog.close(); reset(); });
  $('replay').addEventListener('click', reset);
  $('close-complete').addEventListener('click', () => $('complete').close());
  $('complete').addEventListener('close', () => { if (found.size === 6) focusCell(cells.findIndex(cell => cell.tabIndex === 0)); });
  $('help').addEventListener('click', () => {
    const open = $('help-panel').hidden;
    $('help-panel').hidden = !open; $('help').setAttribute('aria-expanded', String(open));
    if (open) $('close-help').focus();
  });
  $('close-help').addEventListener('click', () => { $('help-panel').hidden = true; $('help').setAttribute('aria-expanded', 'false'); $('help').focus(); });
  $('help-panel').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); $('help-panel').hidden = true; $('help').setAttribute('aria-expanded', 'false'); $('help').focus(); }
  });
  if (found.size === 6) completed = true;
  save(); render();
})();
