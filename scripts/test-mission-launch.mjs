import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor() { this.handlers = {}; this.dataset = {}; this.attributes = {}; this.disabled = true; this.span = {}; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  querySelector() { return this.span; }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}
function boot(completed = false) {
  const ids = {}, coordinate = new Element(), wordSearch = new Element();
  coordinate.dataset.activity = 'coordinateActivityUrl'; coordinate.attributes['aria-describedby'] = 'coordinate-status';
  wordSearch.dataset.activity = 'wordSearchUrl'; wordSearch.attributes['aria-describedby'] = 'word-search-status';
  const storage = new Map(completed ? [['planet-excode-word-search-completed-v1', 'true']] : []);
  const sessions = new Map(); let navigated;
  const context = {
    URL, crypto: { randomUUID: () => 'test-attempt' }, history: { replaceState() {} },
    document: {
      documentElement: { dataset: {} },
      getElementById: id => ids[id] ??= new Element(),
      querySelector: selector => selector.includes('coordinateActivityUrl') ? coordinate : new Element(),
      querySelectorAll: selector => selector === '[data-activity]' ? [coordinate, wordSearch] : []
    },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    sessionStorage: { getItem: key => sessions.get(key), setItem: (key, value) => sessions.set(key, value), removeItem: key => sessions.delete(key) },
    window: { location: { href: 'https://example.test/', assign: value => navigated = value } }
  };
  vm.runInNewContext(readFileSync(new URL('../public/mission-config.js', import.meta.url), 'utf8'), context);
  vm.runInNewContext(readFileSync(new URL('../public/app.js', import.meta.url), 'utf8'), context);
  return { context, coordinate, wordSearch, storage, sessions, ids, destination: () => navigated };
}
let app = boot();
assert.equal(app.wordSearch.disabled, false);
app.wordSearch.handlers.click();
assert.equal(app.destination(), 'https://example.test/word-search.html');
assert.equal(app.sessions.size, 0, 'Word search never creates Coordinate Plane attempt markers');
app.coordinate.handlers.click();
const coordinateUrl = new URL(app.destination());
assert.equal(coordinateUrl.origin, 'https://coordinate-plane-learning-activity.vercel.app');
assert.equal(coordinateUrl.searchParams.get('returnTo'), 'https://example.test/');
assert.equal(coordinateUrl.searchParams.get('mapAttempt'), 'test-attempt');
assert.equal(app.sessions.get('planet-excode-coordinate-attempt-v1'), 'test-attempt');
app = boot(true);
assert.equal(app.wordSearch.attributes['data-completed'], 'true');
assert.equal(app.wordSearch.disabled, false, 'Completed activity stays playable');
assert.equal(app.coordinate.attributes['data-completed'], undefined);
assert.match(app.ids['word-search-status'].textContent, /Completion saved/);
const html = readFileSync(new URL('../public/word-search.html', import.meta.url), 'utf8');
const returnLinks = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>(?:Back to mission map|Return to mission map)/g)];
assert.equal(returnLinks.length, 2);
for (const [, href] of returnLinks) assert.equal(new URL(href, 'https://example.test/word-search.html').href, 'https://example.test/');
assert.ok(existsSync(new URL('../public/index.html', import.meta.url)));
console.log('Passed: native Play launch, separate Coordinate Plane destination and attempt tracking, independent completion display, replayable completion, both return-to-map links.');
