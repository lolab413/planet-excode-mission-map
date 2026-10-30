import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Test actual preference and controller handlers with isolated storage and frames.
const source = readFileSync(new URL('../public/accessibility.js', import.meta.url), 'utf8');
const storage = new Map();
const key = 'planet-excode-accessibility-v1';
function boot({ blocked = false, gamepadAPI = true, reducedMotion = false, wordSearch = false, gamepadDenied = false } = {}) {
  const events = {}, attributes = new Set(), nodes = [], frames = new Map();
  let frameIndex = 0, padReads = 0;
  let document;
  class Element {
    constructor(tag = 'button') { this.tag = tag; this.tagName = tag.toUpperCase(); this.handlers = {}; this.children = []; this.tabIndex = 0; this.clicks = 0; this.visible = true; }
    setAttribute(name, value) { this[name] = value; }
    removeAttribute(name) { delete this[name]; }
    append(...children) { this.children.push(...children); }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    querySelector(selector) { return nodes.find(el => el.selector === selector); }
    querySelectorAll() {
      const walk = element => element.children.flatMap(child => typeof child === 'object' ? [child, ...walk(child)] : []);
      return walk(this).filter(el => ['button', 'input', 'select', 'summary'].includes(el.tag));
    }
    get options() { return this.children; }
    get selectedIndex() { return this.children.findIndex(option => option.value === this.value); }
    set selectedIndex(index) { this.value = this.children[index].value; }
    getClientRects() { return this.visible ? [{}] : []; }
    closest() { return this.hidden; }
    matches(selector) { return selector === '.cell' && this.cell; }
    focus() { document.activeElement = this; }
    click() {
      this.clicks++;
      if (this.tag === 'input') { this.checked = !this.checked; this.handlers.change?.(); }
      this.handlers.click?.();
    }
    showModal() { this.open = true; this.savedFocus = document.activeElement; this.querySelector('#accessibility-title').focus(); }
    close() { this.open = false; this.savedFocus?.focus(); this.handlers.close?.(); }
    dispatchEvent(event) {
      this.lastKey = event.key; this.keyCount = (this.keyCount || 0) + 1;
      this.handlers[event.type]?.(event);
      if (this.cell && event.key?.startsWith('Arrow')) event.preventDefault();
      if (this.cell && event.key === 'Escape') { this.cleared = true; event.preventDefault(); }
      return !event.defaultPrevented;
    }
    set innerHTML(value) {
      this.html = value;
      if (this.tag !== 'dialog') return;
      for (const selector of ['#accessibility-title', '#reading-options', '#puzzle-options', '#appearance-options', '#navigation-options', '#gamepad-options', '#word-search-options', '#device-motion-status', '#controller-status', '#accessibility-save-status', '#accessibility-reset', '#accessibility-close']) {
        const tag = selector.endsWith('-options') ? 'div' : selector.endsWith('-close') || selector.endsWith('-reset') ? 'button' : 'p';
        const node = new Element(tag); node.selector = selector; nodes.push(node); this.append(node);
      }
    }
  }
  const opener = new Element(), first = new Element(), cell = new Element(), hidden = new Element(), disabled = new Element();
  cell.cell = true; hidden.hidden = true; disabled.disabled = true;
  const controls = [opener, first, cell, hidden, disabled];
  const body = new Element('body');
  document = {
    body, hidden: false, focused: true, activeElement: first,
    documentElement: { toggleAttribute(name, yes) { yes ? attributes.add(name) : attributes.delete(name); } },
    hasFocus() { return this.focused; },
    addEventListener(name, fn) { events[name] = fn; },
    createElement: tag => new Element(tag), createTextNode: text => text,
    querySelectorAll(selector) {
      if (selector === '[data-accessibility-open]') return [opener, ...body.children.filter(el => el['data-accessibility-open'] === '')];
      if (selector === 'dialog[open]') return body.children.filter(el => el.open);
      return controls;
    },
    getElementById: id => id === 'grid' && wordSearch ? {} : null
  };
  const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const pads = [pad];
  const context = {
    document, navigator: gamepadAPI ? { getGamepads: () => { padReads++; if (gamepadDenied) throw Error('API blocked'); return pads; } } : {},
    window: { addEventListener(name, fn) { events[name] = fn; }, matchMedia() { return { matches: reducedMotion, addEventListener(name, fn) { events.motionChange = fn; } }; } },
    localStorage: {
      getItem(name) { if (blocked) throw Error('blocked'); return storage.get(name) ?? null; },
      setItem(name, value) { if (blocked) throw Error('blocked'); storage.set(name, value); }
    },
    KeyboardEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } preventDefault() { this.defaultPrevented = true; } },
    Event: class { constructor(type, options) { this.type = type; Object.assign(this, options); } preventDefault() { this.defaultPrevented = true; } },
    requestAnimationFrame(fn) { const id = ++frameIndex; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(source, context); events.DOMContentLoaded();
  const launcher = body.children.find(el => el.tag === 'button');
  const dialog = body.children.find(el => el.tag === 'dialog');
  const inputs = Object.fromEntries(dialog.querySelectorAll().filter(el => el.type === 'checkbox').map(input => [input.id.replace('access-', ''), input]));
  const spacing = dialog.querySelectorAll().find(el => el.tag === 'select');
  let time = 0;
  function frame(ms = 16) { time += ms; const entry = frames.entries().next().value; if (entry) { frames.delete(entry[0]); entry[1](time); } }
  function press(index) { pad.buttons[index].pressed = true; frame(); pad.buttons[index].pressed = false; frame(); }
  return { document, pad, pads, controls, opener, launcher, first, cell, dialog, inputs, spacing, attributes, frame, press, events, frameCount: () => frames.size, padReads: () => padReads };
}
let app = boot();
assert.equal(app.attributes.size, 0, 'No visual preferences enabled by default');
assert.equal(app.launcher['aria-label'], 'Accessibility settings');
assert.equal(app.launcher['aria-controls'], app.dialog.id);
assert.match(app.launcher.html, /aria-hidden="true"/);
app.launcher.focus(); app.launcher.click(); assert.ok(app.dialog.open, 'Floating icon opens settings');
app.dialog.querySelector('#accessibility-close').click();
assert.equal(app.document.activeElement, app.launcher, 'Closing settings returns focus to floating icon');
app.opener.focus(); app.opener.click(); assert.ok(app.dialog.open);
assert.equal(app.document.activeElement.selector, '#accessibility-title');
app.inputs.contrast.click(); app.inputs.motion.click();
assert.ok(app.attributes.has('data-access-contrast')); assert.ok(app.attributes.has('data-access-motion'));
app.dialog.querySelector('#accessibility-close').click(); assert.equal(app.document.activeElement, app.opener);
app = boot(); assert.ok(app.inputs.contrast.checked && app.inputs.motion.checked, 'Preferences persist across page loads');
app.press(0); assert.equal(app.first.clicks, 0, 'Controller disabled by default');
assert.equal(app.frameCount(), 0, 'Disabled mode schedules no frames');
assert.equal(app.padReads(), 0, 'Disabled mode does not read controllers');
app.inputs.gamepad.click(); app.frame();
app.pad.buttons[0].pressed = true; app.frame(); app.frame();
assert.equal(app.first.clicks, 1, 'Held A activates only once');
app.pad.buttons[0].pressed = false; app.frame();
app.press(5); assert.equal(app.document.activeElement, app.cell, 'RB enters grid');
app.press(15); assert.equal(app.cell.lastKey, 'ArrowRight', 'D-pad uses grid keyboard handler');
app.press(1); assert.ok(app.cell.cleared, 'B clears grid selection');
app.press(5); assert.equal(app.document.activeElement, app.opener, 'RB leaves grid and skips unavailable controls');
app.press(4); assert.equal(app.document.activeElement, app.cell, 'LB reverses focus');
app.pad.axes[0] = .7; app.frame(); const before = app.cell.keyCount;
app.frame(100); assert.equal(app.cell.keyCount, before, 'Stick waits before repeating');
app.frame(400); assert.equal(app.cell.keyCount, before + 1, 'Held stick repeats after delay');
app.pad.axes[0] = 0; app.frame();
app.opener.focus(); app.opener.click();
app.press(5); assert.ok(app.dialog.querySelectorAll().includes(app.document.activeElement), 'Controller focus stays in modal');
app.press(1); assert.ok(!app.dialog.open); assert.equal(app.document.activeElement, app.opener);
app.document.focused = false; app.events.blur(); app.press(5); assert.equal(app.document.activeElement, app.opener, 'Inactive page ignores controller');
app.document.focused = true; app.events.focus(); app.frame(); app.pad.mapping = ''; app.press(5); assert.equal(app.document.activeElement, app.opener, 'Unsupported mappings ignored');
app.pad.mapping = 'standard'; app.pad.connected = false; app.events.gamepaddisconnected(); app.press(0); assert.equal(app.opener.clicks, 1, 'Disconnected controller ignored');
app.opener.click(); app.dialog.querySelector('#accessibility-reset').click();
assert.equal(app.attributes.size, 0, 'Reset restores defaults');
app = boot({ blocked: true }); app.inputs.text.click();
assert.ok(app.attributes.has('data-access-text'));
assert.match(app.dialog.querySelector('#accessibility-save-status').textContent, /unavailable/);
app = boot({ reducedMotion: true });
assert.match(app.dialog.querySelector('#device-motion-status').textContent, /device requests reduced motion/);
app.inputs.letters.click();
assert.ok(app.attributes.has('data-access-letters'));
assert.ok(!app.attributes.has('data-access-text'), 'Puzzle letters are independent of interface text');
app.spacing.value = 'wide'; app.spacing.handlers.change();
assert.ok(app.attributes.has('data-access-spacing-wide'));
app = boot(); assert.equal(app.spacing.value, 'wide'); assert.ok(app.inputs.letters.checked);
app.inputs.gamepad.click(); app.frame(); app.spacing.focus(); app.press(14);
assert.equal(app.spacing.value, 'comfortable', 'Controller changes focused select value');
assert.ok(app.attributes.has('data-access-spacing-comfortable'));
app.press(14); assert.equal(app.spacing.value, 'default');
assert.ok(!app.attributes.has('data-access-spacing-comfortable'));
app.dialog.querySelector('#accessibility-reset').click(); assert.equal(app.spacing.value, 'default');
assert.equal(app.attributes.size, 0);
storage.set(key, JSON.stringify({ text: true, contrast: true, spacing: 'invalid', letters: 'true' }));
app = boot(); assert.ok(app.inputs.text.checked && app.inputs.contrast.checked, 'Existing preferences migrate');
assert.equal(app.spacing.value, 'default', 'Invalid spacing falls back safely');
assert.equal(app.inputs.letters.checked, false, 'Invalid checkbox values ignored');
storage.set(key, '{broken'); app = boot(); assert.equal(app.attributes.size, 0, 'Corrupt storage uses defaults');
app = boot({ gamepadAPI: false });
assert.match(app.dialog.querySelector('#controller-status').textContent, /unavailable/);
storage.delete(key);
app = boot(); assert.ok(!app.inputs.selection, 'Word-search setting does not clutter the mission map');
assert.doesNotMatch(app.dialog.html, /<legend>Word search controls<\/legend>/);
app = boot({ wordSearch: true });
assert.match(app.dialog.html, /<legend>Word search controls<\/legend>/);
assert.equal(app.inputs.selection.checked, false, 'Extra speech is optional');
app.inputs.selection.click(); assert.ok(app.attributes.has('data-access-selection'));
app = boot({ wordSearch: true }); assert.ok(app.inputs.selection.checked, 'Selection announcements persist');
app.dialog.querySelector('#accessibility-reset').click(); assert.equal(app.inputs.selection.checked, false);

// Controller lifecycle: no background loops, stale actions, or game-data writes.
storage.delete(key);
const progressKey = 'planet-excode-system-reboot-core-concepts-progress-v1';
const completionKey = 'planet-excode-word-search-completed-v1';
storage.set(progressKey, 'saved puzzle sentinel'); storage.set(completionKey, 'true');
app = boot(); app.events.gamepadconnected();
assert.equal(app.frameCount(), 0); assert.equal(app.padReads(), 0, 'Connecting while disabled does not start polling');
app.pad.buttons[0].pressed = true; app.inputs.gamepad.click(); app.frame(); app.frame();
assert.equal(app.first.clicks, 0, 'Enabling with held primary waits for neutral');
app.pad.buttons[0].pressed = false; app.frame(); app.press(0);
assert.equal(app.first.clicks, 1);
app.press(5); assert.equal(app.document.activeElement, app.cell);
assert.equal(app.cell['data-gamepad-focus'], '', 'Programmatic controller focus has an explicit marker');
app.press(0); assert.equal(app.cell.lastKey, 'Enter', 'Primary shares the real grid keyboard action');
app.events.keydown({ isTrusted: false });
assert.equal(app.cell['data-gamepad-focus'], '', 'Synthetic controller key does not clear controller focus');
app.events.pointerdown({ isTrusted: true, pointerType: 'touch' });
assert.equal(app.cell['data-gamepad-focus'], undefined, 'Touch takes over without a stale controller outline');
app.frame(); // Re-arm from neutral without moving focus or clearing game selection.
const driftCount = app.cell.keyCount;
app.pad.axes[0] = .3; app.frame(500); assert.equal(app.cell.keyCount, driftCount, 'Stick drift inside dead zone ignored');
app.pad.axes[0] = .65; app.frame(); assert.equal(app.cell.lastKey, 'ArrowRight');
const movedCount = app.cell.keyCount;
app.frame(399); assert.equal(app.cell.keyCount, movedCount, 'No move before initial delay');
app.pad.axes[0] = .48; app.frame(1);
assert.equal(app.cell.keyCount, movedCount + 1, 'Release threshold prevents jitter at activation boundary');
app.frame(149); assert.equal(app.cell.keyCount, movedCount + 1);
app.frame(1); assert.equal(app.cell.keyCount, movedCount + 2, 'Repeat timing is controlled');
app.frame(10000); assert.equal(app.cell.keyCount, movedCount + 3, 'A late frame never catches up with a burst of moves');
app.pad.axes[0] = .39; app.frame(500); assert.equal(app.cell.keyCount, movedCount + 3, 'Stick stops below release threshold');
app.pad.axes = [.6, -.9]; app.frame(); assert.equal(app.cell.lastKey, 'ArrowUp', 'Dominant stick axis wins');
app.pad.axes = [0, 0]; app.frame();
app.document.hidden = true; app.events.visibilitychange();
assert.equal(app.frameCount(), 0, 'Hidden page cancels scheduled frame');
const hiddenReads = app.padReads(); app.frame(); app.frame();
assert.equal(app.padReads(), hiddenReads, 'Hidden page makes no controller reads');
app.pad.buttons[0].pressed = true; app.document.hidden = false; app.events.visibilitychange();
const beforeResume = app.cell.keyCount; app.frame(); app.frame();
assert.equal(app.cell.keyCount, beforeResume, 'Resume ignores held action until release');
app.pad.buttons[0].pressed = false; app.frame(); app.press(0);
assert.equal(app.cell.lastKey, 'Enter');
app.document.focused = false; app.events.blur(); assert.equal(app.frameCount(), 0, 'Blur stops polling');
app.document.focused = true; app.events.focus(); app.frame();
app.pad.connected = false; app.events.gamepaddisconnected();
assert.equal(app.frameCount(), 0, 'No connected controller means no polling');
assert.match(app.dialog.querySelector('#controller-status').textContent, /disconnected.*Progress is unchanged/);
const disconnectedReads = app.padReads(); app.frame(); assert.equal(app.padReads(), disconnectedReads);
app.pad.connected = true; app.events.gamepadconnected(); app.frame(); app.press(0);
assert.equal(app.cell.lastKey, 'Enter', 'Reconnection resumes existing game focus');
app.events.keydown({ isTrusted: true }); assert.equal(app.cell['data-gamepad-focus'], undefined, 'Keyboard takes over cleanly');
app.frame();
app.opener.focus(); app.opener.click();
app.dialog.handlers.cancel = event => event.preventDefault(); app.press(1);
assert.ok(app.dialog.open, 'Back respects the same cancellable dialog event as Escape');
delete app.dialog.handlers.cancel; app.press(1); assert.equal(app.dialog.open, false);
app.inputs.gamepad.click(); assert.equal(app.frameCount(), 0, 'Turning mode off cancels immediately');
const disabledReads = app.padReads(); app.frame(); app.frame(); assert.equal(app.padReads(), disabledReads);
assert.equal(storage.get(progressKey), 'saved puzzle sentinel'); assert.equal(storage.get(completionKey), 'true', 'Input transitions preserve game storage');
app = boot({ gamepadDenied: true }); app.inputs.gamepad.click();
assert.equal(app.frameCount(), 0); assert.match(app.dialog.querySelector('#controller-status').textContent, /access is unavailable/);
storage.delete(key);
app = boot(); app.pad.mapping = ''; app.inputs.gamepad.click();
assert.equal(app.frameCount(), 0); assert.match(app.dialog.querySelector('#controller-status').textContent, /no standard mapping/);
app.pad.mapping = 'standard'; app.events.gamepadconnected(); app.frame(); assert.equal(app.frameCount(), 1);
app.inputs.gamepad.click();
for (const page of ['index.html', 'word-search.html']) {
  const html = readFileSync(new URL(`../public/${page}`, import.meta.url), 'utf8');
  assert.match(html, /href="#main-content"/); assert.match(html, /id="main-content" tabindex="-1"/);
  assert.match(html, /src="accessibility.js"/); assert.match(html, /href="accessibility.css"/);
}
const wordHTML = readFileSync(new URL('../public/word-search.html', import.meta.url), 'utf8');
assert.match(wordHTML, /id="complete-description"/);
assert.match(wordHTML, /id="close-complete"[^]*?<\/dialog>/);
console.log('Passed: no polling while off/hidden/unfocused/disconnected, neutral gating, dead zone/hysteresis, controlled repeat with no catch-up bursts, input switching and saved progress, controller focus marker, keyboard action reuse, cancellable modal Back, denied/unsupported API, grouped preferences, persistence/reset, selection speech, and skip/completion markup.');
