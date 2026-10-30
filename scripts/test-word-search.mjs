import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as game from '../public/word-search-board.js';

let seed = 42;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const boards = new Set();
for (let n = 0; n < 100; n++) {
  const board = game.createBoard(random);
  assert.ok(game.validProgress(board));
  for (const [word, indices] of Object.entries(board.solutions)) assert.equal(indices.map(i => board.letters[i]).join(''), word);
  boards.add(board.letters.join(''));
}
assert.equal(boards.size, 100, 'New rounds must produce varied boards');
assert.equal(game.validProgress({ activityId: 'coordinate' }), false);
const corrupt = game.createBoard(random); corrupt.solutions.SYSTEM = [0];
assert.equal(game.validProgress(corrupt), false);
assert.deepEqual(game.lineBetween(0, 12), []);
assert.deepEqual(game.lineBetween(99, 66), [99, 88, 77, 66]);

// Exercise actual activity handlers with a small DOM fixture and isolated storage.
class Element {
  constructor() {
    this.children = []; this.dataset = {}; this.handlers = {}; this.classes = new Set();
    this.classList = { add: (...names) => names.forEach(n => this.classes.add(n)), remove: (...names) => names.forEach(n => this.classes.delete(n)), toggle: (n, yes) => yes ? this.classes.add(n) : this.classes.delete(n) };
  }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  focus() { this.focused = true; }
  closest() { return this; }
  contains(cell) { return this.children.some(row => row.children.includes(cell)); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
const source = readFileSync(new URL('../public/word-search.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/, '');
const storage = new Map([['planet-excode-coordinate-completed-v1', 'true']]);
function boot(blocked = false) {
  const ids = {}, events = {};
  const context = {
    ...game,
    document: { documentElement: { hasAttribute: name => name === 'data-access-selection' && context.announcements === true }, getElementById: id => { if (!ids[id]) { ids[id] = new Element(); ids[id].hidden = ['help-panel', 'game', 'complete'].includes(id); } return ids[id]; }, createElement: () => new Element(), elementFromPoint: () => context.hit },
    window: { addEventListener: (name, handler) => events[name] = handler },
    localStorage: { getItem: key => { if (blocked) throw Error('Storage blocked'); return storage.get(key) ?? null; }, setItem: (key, value) => { if (blocked) throw Error('Storage blocked'); storage.set(key, value); } },
    setTimeout: () => {}
  };
  vm.runInNewContext(source, context);
  const cells = ids.grid.children.flatMap(row => row.children);
  return { ids, events, context, cells, click: index => ids.grid.handlers.click({ target: cells[index] }) };
}
let app = boot();
assert.equal(app.cells.length, 100);
app.click(0); app.click(12); assert.equal(app.ids.progress.value, 0);
app.ids.hint.handlers.click(); assert.match(app.ids.feedback.textContent, /SYSTEM starts/);
let saved = JSON.parse(storage.get(game.PROGRESS_KEY));
let indices = saved.solutions.SYSTEM;
// Mouse/touch drag and the ensuing synthetic click must count only once.
app.ids.grid.handlers.pointerdown({ target: app.cells[indices[0]], button: 0 });
app.context.hit = app.cells[indices.at(-1)]; app.events.pointermove({ clientX: 0, clientY: 0 });
app.events.pointerup({ clientX: 0, clientY: 0 }); app.click(indices.at(-1));
assert.equal(app.ids.progress.value, 1);
app = boot();
assert.equal(app.ids.progress.value, 1, 'Resume saved progress');
assert.equal(app.cells.map(c => c.textContent).join(''), saved.letters.join(''), 'Resume the same board');
for (const word of Object.keys(game.CONCEPTS).slice(1)) {
  indices = saved.solutions[word]; app.click(indices.at(-1)); app.click(indices[0]);
}
assert.equal(app.ids.progress.value, 6);
assert.equal(app.ids.complete.open, true, 'Winning opens the celebration over the game');
assert.equal(app.ids.hint.disabled, true);
assert.equal(storage.get(game.COMPLETION_KEY), 'true');
assert.match(app.ids.discovery.textContent, /OUTPUT recovered/);
const completedVisit = boot();
assert.ok(!completedVisit.ids.complete?.open, 'Do not open the celebration over the introduction');
completedVisit.ids.start.handlers.click();
assert.equal(completedVisit.ids.complete.open, true, 'Viewing a saved completed game reopens the celebration');
app.ids.replay.handlers.click();
assert.equal(app.ids.progress.value, 0);
assert.equal(app.ids.complete.open, false, 'Replay dismisses the celebration');
assert.equal(storage.get(game.COMPLETION_KEY), 'true', 'Replay preserves completion');
assert.notEqual(JSON.parse(storage.get(game.PROGRESS_KEY)).letters.join(''), saved.letters.join(''));
assert.equal(storage.get('planet-excode-coordinate-completed-v1'), 'true', 'Coordinate progress is untouched');
app = boot(); assert.match(app.ids['completion-status'].textContent, /Mission completed/);
saved = JSON.parse(storage.get(game.PROGRESS_KEY));
const keydown = (index, key, repeat = false, ctrlKey = false) => {
  let prevented = false;
  app.ids.grid.handlers.keydown({ target: app.cells[index], key, repeat, ctrlKey, preventDefault() { prevented = true; } });
  assert.ok(prevented);
};
keydown(45, 'Home'); assert.equal(app.cells[40].tabIndex, 0);
keydown(40, 'End'); assert.equal(app.cells[49].tabIndex, 0);
keydown(49, 'Home', false, true); assert.equal(app.cells[0].tabIndex, 0);
keydown(0, 'End', false, true); assert.equal(app.cells[99].tabIndex, 0);
keydown(99, 'ArrowRight'); assert.equal(app.cells[99].tabIndex, 0);
keydown(99, 'ArrowDown'); assert.equal(app.cells[99].tabIndex, 0);
indices = saved.solutions.SYSTEM;
keydown(indices[0], 'Enter');
keydown(indices[0], 'Enter', true); // Holding a key must not clear the anchor.
const dr = Math.sign(Math.floor(indices.at(-1) / 10) - Math.floor(indices[0] / 10));
const dc = Math.sign(indices.at(-1) % 10 - indices[0] % 10);
let position = indices[0];
for (let n = 1; n < indices.length; n++) {
  if (dr) { keydown(position, dr > 0 ? 'ArrowDown' : 'ArrowUp'); position += dr * 10; }
  if (dc) { keydown(position, dc > 0 ? 'ArrowRight' : 'ArrowLeft'); position += dc; }
}
keydown(position, ' ');
assert.equal(app.ids.progress.value, 1, 'Entire word selectable using only keyboard');
assert.equal(app.cells.filter(cell => cell.tabIndex === 0).length, 1);
assert.equal(app.cells[position].tabIndex, 0);
assert.match(app.cells[indices[0]]['aria-label'], /recovered: SYSTEM/);
assert.match(app.ids.words.children[0].children[0].textContent, /✓/);
assert.match(app.ids.words.children[0].children[1].textContent, /Recovered/);
keydown(0, 'Enter'); keydown(0, 'Escape'); assert.match(app.ids.feedback.textContent, /cleared/);
for (const shiftKey of [false, true]) {
  let prevented = false;
  app.ids.grid.handlers.keydown({ target: app.cells[0], key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'Tab and Shift+Tab leave the grid');
}
// Two endpoint taps, including a delayed synthetic click after the first tap.
indices = saved.solutions.LOGIC;
app.ids.grid.handlers.pointerdown({ target: app.cells[indices[0]], button: 0, pointerId: 10, isPrimary: true });
app.context.hit = app.cells[indices[0]];
app.events.pointerup({ pointerId: 10, clientX: 0, clientY: 0 });
app.click(indices[0]);
app.ids.grid.handlers.pointerdown({ target: app.cells[indices.at(-1)], button: 0, pointerId: 11, isPrimary: true });
app.click(indices.at(-1));
assert.equal(app.ids.progress.value, 2, 'Two taps recover a word without dragging');
app.ids.grid.handlers.pointerdown({ target: app.cells[0], button: 0, pointerId: 12, isPrimary: true });
app.events.pointercancel({ pointerId: 12 });
assert.match(app.ids.feedback.textContent, /cleared/);
app.ids.help.handlers.click(); assert.equal(app.ids['help-panel'].hidden, false);
assert.equal(app.ids['close-help'].focused, true);
app.ids['help-panel'].handlers.keydown({ key: 'Escape', preventDefault() {} });
assert.equal(app.ids['help-panel'].hidden, true);
assert.equal(app.ids.help.focused, true);
app.ids.help.handlers.click();
app.ids['close-help'].handlers.click(); assert.equal(app.ids['help-panel'].hidden, true);
assert.match(boot(true).ids['saved-note'].textContent, /unavailable/);

// The same saved puzzle must produce identical recovery through every input path.
const sharedBoard = game.createBoard(random);
const sharedStart = sharedBoard.solutions.SYSTEM[0], sharedEnd = sharedBoard.solutions.SYSTEM.at(-1);
function press(visit, index, key) {
  visit.ids.grid.handlers.keydown({ target: visit.cells[index], key, preventDefault() {} });
}
for (const method of ['keyboard', 'click', 'touch', 'drag', 'controller-key']) {
  storage.set(game.PROGRESS_KEY, JSON.stringify(sharedBoard));
  const visit = boot();
  if (method === 'keyboard' || method === 'controller-key') {
    press(visit, sharedStart, 'Enter');
    let index = sharedStart;
    const vertical = Math.sign(Math.floor(sharedEnd / 10) - Math.floor(sharedStart / 10));
    const horizontal = Math.sign(sharedEnd % 10 - sharedStart % 10);
    while (index !== sharedEnd) {
      if (vertical) { press(visit, index, vertical > 0 ? 'ArrowDown' : 'ArrowUp'); index += vertical * 10; }
      if (horizontal) { press(visit, index, horizontal > 0 ? 'ArrowRight' : 'ArrowLeft'); index += horizontal; }
    }
    press(visit, index, method === 'controller-key' ? 'Enter' : ' ');
  } else if (method === 'touch') {
    for (const [pointerId, index] of [[20, sharedStart], [21, sharedEnd]]) {
      visit.ids.grid.handlers.pointerdown({ target: visit.cells[index], button: 0, pointerId, isPrimary: true });
      visit.context.hit = visit.cells[index];
      visit.events.pointerup({ pointerId, clientX: 0, clientY: 0 });
      visit.ids.grid.handlers.click({ target: visit.cells[index], detail: 1 });
    }
  } else if (method === 'drag') {
    visit.ids.grid.handlers.pointerdown({ target: visit.cells[sharedStart], button: 0, pointerId: 22 });
    visit.context.hit = visit.cells[sharedEnd];
    visit.events.pointermove({ pointerId: 22, clientX: 0, clientY: 0 });
    visit.events.pointerup({ pointerId: 22, clientX: 0, clientY: 0 });
    visit.ids.grid.handlers.click({ target: visit.cells[sharedEnd], detail: 1 });
  } else {
    for (const index of [sharedStart, sharedEnd]) visit.ids.grid.handlers.click({ target: visit.cells[index], detail: 1 });
  }
  const result = JSON.parse(storage.get(game.PROGRESS_KEY));
  assert.deepEqual(result.letters, sharedBoard.letters, `${method}: letters unchanged`);
  assert.deepEqual(result.solutions, sharedBoard.solutions, `${method}: same solutions`);
  assert.deepEqual(result.found, ['SYSTEM'], `${method}: same recovery`);
  assert.match(visit.ids.feedback.textContent, /SYSTEM recovered\. 1 of 6/);
  assert.ok(visit.cells[sharedStart].classes.has('found'));
}
storage.set(game.PROGRESS_KEY, JSON.stringify(sharedBoard));
const accessibleVisit = boot();
press(accessibleVisit, 0, 'Enter');
assert.ok(accessibleVisit.cells[0].classes.has('selection-start'));
assert.match(accessibleVisit.cells[0]['aria-label'], /starting letter/);
assert.match(accessibleVisit.ids.feedback.textContent, /row 1, column 1/);
press(accessibleVisit, 0, 'ArrowRight');
assert.equal(accessibleVisit.ids['selection-status'].textContent, '', 'Extra speech is off by default');
accessibleVisit.context.announcements = true;
press(accessibleVisit, 1, 'ArrowRight');
assert.match(accessibleVisit.ids['selection-status'].textContent, /3 letters selected/);
assert.equal(accessibleVisit.cells[2]['aria-selected'], 'true');
press(accessibleVisit, 2, 'Escape');
assert.equal(accessibleVisit.ids['selection-status'].textContent, '');
assert.ok(accessibleVisit.cells.every(cell => cell['aria-selected'] === 'false'));
assert.ok(!accessibleVisit.cells[0].classes.has('selection-start'));
assert.doesNotMatch(accessibleVisit.cells[0]['aria-label'], /starting letter/);
// Escape during a pointer drag must also stop the release from recovering a word.
accessibleVisit.ids.grid.handlers.pointerdown({ target: accessibleVisit.cells[sharedStart], button: 0, pointerId: 23 });
accessibleVisit.context.hit = accessibleVisit.cells[sharedEnd];
accessibleVisit.events.pointermove({ pointerId: 23, clientX: 0, clientY: 0 });
press(accessibleVisit, sharedStart, 'Escape');
accessibleVisit.events.pointerup({ pointerId: 23, clientX: 0, clientY: 0 });
accessibleVisit.ids.grid.handlers.click({ target: accessibleVisit.cells[sharedEnd], detail: 1 });
assert.equal(accessibleVisit.ids.progress.value, 0, 'Canceled drag cannot recover on release');
assert.deepEqual(JSON.parse(storage.get(game.PROGRESS_KEY)).solutions, sharedBoard.solutions);
console.log('Passed: 100 generated boards, keyboard/click/touch/drag/controller parity on one saved puzzle, optional selection announcements, starting-letter state, Escape cancels active drag, validation, hints, roving focus, recovery labels and counts, resume, completion, replay, independent storage, help focus, and blocked storage.');
