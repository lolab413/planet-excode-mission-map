// Isolated Chromium journey QA. Requires Playwright in .qa-runtime/node_modules.
// Uses a temporary browser profile and its own loopback server; never user storage.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = createRequire(resolve(root, '.qa-runtime/package.json'))('playwright');
const publicRoot = resolve(root, 'public');
const output = resolve(root, 'qa-results');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://qa.invalid').pathname);
    const file = resolve(publicRoot, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(publicRoot + sep)) throw Error('Outside public');
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.QA_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const results = [];
let browser;
const progressKey = 'planet-excode-system-reboot-core-concepts-progress-v1';
const completionKey = 'planet-excode-word-search-completed-v1';
const preferenceKey = 'planet-excode-accessibility-v1';

async function tabTo(page, selector, limit = 160) {
  for (let i = 0; i < limit; i++) {
    if (await page.evaluate(selector => document.activeElement?.matches(selector), selector)) return;
    await page.keyboard.press('Tab');
  }
  throw Error(`Tab could not reach ${selector}`);
}
async function assertVisibleFocus(page) {
  await page.waitForFunction(() => {
    const el = document.activeElement, rect = el?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return false;
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    return x >= 0 && x < innerWidth && y >= 0 && y < innerHeight && el.contains(document.elementFromPoint(x, y));
  }, null, { timeout: 2000 });
}
async function activate(page, selector) { await tabTo(page, selector); await assertVisibleFocus(page); await page.keyboard.press('Enter'); }
async function assertFocus(page, selector) {
  assert.ok(await page.evaluate(selector => document.activeElement?.matches(selector), selector), `Focus: ${selector}`);
}
async function solve(page, indices) {
  await tabTo(page, '#grid .cell[tabindex="0"]');
  let index = await page.evaluate(() => Number(document.activeElement.dataset.index));
  for (const end of [indices[0], indices.at(-1)]) {
    while (Math.floor(index / 10) !== Math.floor(end / 10)) {
      const down = Math.floor(index / 10) < Math.floor(end / 10);
      await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp'); index += down ? 10 : -10;
    }
    while (index % 10 !== end % 10) {
      const right = index % 10 < end % 10;
      await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft'); index += right ? 1 : -1;
    }
    await page.keyboard.press(end === indices[0] ? 'Enter' : 'Space');
  }
}
async function snapshot(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), progressKey); }
async function sweepGrid(page) {
  await tabTo(page, '#grid .cell[tabindex="0"]'); await page.keyboard.press('Control+Home');
  for (let row = 0; row < 10; row++) {
    await page.keyboard.press('Home');
    for (let column = 0; column < 10; column++) {
      await assertFocus(page, `#grid .cell[data-index="${row * 10 + column}"]`);
      await assertVisibleFocus(page);
      if (column < 9) await page.keyboard.press('ArrowRight');
    }
    if (row < 9) await page.keyboard.press('ArrowDown');
  }
}
async function layout(page, name) {
  const data = await page.evaluate(() => {
    const viewport = { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, visualScale: visualViewport?.scale };
    const openDialog = document.querySelector('dialog[open]');
    const el = openDialog || document.documentElement;
    const bounds = openDialog?.getBoundingClientRect();
    return { viewport, pageOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      dialogOverflow: openDialog ? openDialog.scrollWidth > openDialog.clientWidth + 2 : false,
      dialogFits: !bounds || (bounds.left >= -1 && bounds.right <= innerWidth + 1 && bounds.top >= -1 && bounds.bottom <= innerHeight + 1),
      gridScrolls: (document.querySelector('.grid-viewport')?.scrollWidth || 0) > (document.querySelector('.grid-viewport')?.clientWidth || 0),
      cssZoom: getComputedStyle(document.documentElement).zoom,
      scrollHeight: el.scrollHeight };
  });
  assert.equal(data.pageOverflow, false, `${name}: document horizontal overflow`);
  assert.equal(data.dialogOverflow, false, `${name}: dialog horizontal overflow`);
  assert.ok(data.dialogFits, `${name}: dialog outside viewport`);
  if (page.viewportSize() === null) {
    // Fast-forward finite animations, then capture the complete native view.
    // Playwright's normal clip uses its original DPR at native browser zoom.
    await page.screenshot({ animations: 'disabled' });
    const cdp = await page.context().newCDPSession(page);
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(output, `${name}.png`), Buffer.from(screenshot.data, 'base64')); await cdp.detach();
  } else await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: false, animations: 'disabled' });
  return data;
}
async function runJourney(scenario) {
  let context;
  if (scenario.browserZoom) {
    await mkdir(resolve(root, '.qa-runtime/profiles'), { recursive: true });
    const profile = await mkdtemp(resolve(root, '.qa-runtime/profiles/zoom-'));
    await mkdir(resolve(profile, 'Default'));
    // Chromium stores the default storage partition's native zoom under "x".
    // https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc
    await writeFile(resolve(profile, 'Default/Preferences'), JSON.stringify({ partition: { default_zoom_level: { x: Math.log(scenario.browserZoom) / Math.log(1.2) } } }));
    context = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true, viewport: null, args: ['--window-size=1280,900'] });
  } else context = await browser.newContext({ viewport: scenario.viewport, isMobile: scenario.mobile || false,
    hasTouch: scenario.mobile || false, reducedMotion: scenario.motion || 'no-preference' });
  const page = scenario.browserZoom ? context.pages()[0] : await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    if (scenario.browserZoom) {
      const zoom = await page.evaluate(() => ({ dpr: devicePixelRatio, css: getComputedStyle(document.documentElement).zoom, scale: visualViewport.scale, innerWidth, outerWidth }));
      assert.equal(zoom.dpr, 2); assert.equal(zoom.css, '1'); assert.equal(zoom.scale, 1);
      assert.ok(zoom.innerWidth < zoom.outerWidth / 1.8, 'Native browser zoom changes the CSS viewport');
    }
    if (scenario.cssZoom) await page.addStyleTag({ content: `html{zoom:${scenario.cssZoom}}` });
    const observations = [];
    observations.push(await layout(page, `${scenario.name}-map`));
    await activate(page, '#mission-start');
    assert.ok(await page.locator('#mission-dialog').evaluate(el => el.open));
    await assertFocus(page, '#mission-close');
    // Native modal contains keyboard focus and returns it after Escape.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => !document.hasFocus() || document.querySelector('#mission-dialog').contains(document.activeElement)), 'Modal never focuses a background page control; browser chrome may receive Tab');
    }
    await page.keyboard.press('Escape'); await assertFocus(page, '#mission-start');
    await page.keyboard.press('Enter');
    await activate(page, '[data-activity="wordSearchUrl"]');
    await page.waitForURL('**/word-search.html');
    if (scenario.cssZoom) await page.addStyleTag({ content: `html{zoom:${scenario.cssZoom}}` });
    await activate(page, '#start'); await assertFocus(page, '#game-title');
    const initial = await snapshot(page);
    await sweepGrid(page);
    // Reading the generated solution is a test oracle; selection is keyboard only.
    await solve(page, initial.solutions.SYSTEM);
    assert.equal(await page.locator('#progress').evaluate(el => el.value), 1);
    await activate(page, '#help'); await assertFocus(page, '#close-help');
    await page.keyboard.press('Escape'); await assertFocus(page, '#help');
    await activate(page, '#restart'); await assertFocus(page, '#cancel-restart');
    await page.keyboard.press('Escape'); await assertFocus(page, '#restart');
    assert.equal((await snapshot(page)).found.length, 1, 'Canceling new board preserves recovery');
    await activate(page, '.accessibility-launcher');
    await assertFocus(page, '#accessibility-title');
    await page.keyboard.press('Escape'); await assertFocus(page, '.accessibility-launcher');
    await page.keyboard.press('Enter'); await assertFocus(page, '#accessibility-title');
    for (const name of ['letters', 'text', 'contrast', 'selection', ...(scenario.userMotion ? ['motion'] : [])]) {
      await tabTo(page, `#access-${name}`); await page.keyboard.press('Space');
    }
    await tabTo(page, '#access-spacing');
    await page.keyboard.press('End'); await page.keyboard.press('Tab');
    assert.equal(await page.locator('#access-spacing').inputValue(), 'wide');
    observations.push(await layout(page, `${scenario.name}-settings`));
    await activate(page, '#accessibility-close'); await assertFocus(page, '.accessibility-launcher');
    assert.deepEqual((await snapshot(page)).letters, initial.letters, 'Settings preserve letters');
    assert.deepEqual((await snapshot(page)).solutions, initial.solutions, 'Settings preserve solution');
    assert.equal((await snapshot(page)).found.length, 1, 'Settings preserve recovery');
    await page.reload({ waitUntil: 'networkidle' });
    if (scenario.cssZoom) await page.addStyleTag({ content: `html{zoom:${scenario.cssZoom}}` });
    assert.equal((await snapshot(page)).found.length, 1, 'Reload preserves recovery');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).spacing, preferenceKey), 'wide');
    await activate(page, '#start');
    observations.push(await layout(page, `${scenario.name}-large-grid`));
    await tabTo(page, '#grid .cell[tabindex="0"]');
    await page.keyboard.press('Control+End');
    await assertFocus(page, '#grid .cell[data-index="99"]');
    await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#grid .selected').count(), 0);
    await page.keyboard.press('Tab');
    assert.ok(!await page.evaluate(() => document.activeElement?.matches('#grid .cell')));
    // Exhaustively verify no letter is hidden behind floating controls.
    await sweepGrid(page);
    for (const word of Object.keys(initial.solutions).filter(word => word !== 'SYSTEM')) await solve(page, initial.solutions[word]);
    assert.equal(await page.locator('#progress').evaluate(el => el.value), 6);
    assert.ok(await page.locator('#complete').evaluate(el => el.open));
    assert.ok(await page.evaluate(() => document.querySelector('#complete').contains(document.activeElement)));
    if (scenario.motion === 'reduce' || scenario.userMotion) {
      assert.equal(await page.locator('#complete').evaluate(el => getComputedStyle(el).animationName), 'none', 'Completion animation is suppressed');
      assert.equal(await page.locator('#grid .cell').first().evaluate(el => getComputedStyle(el).animationName), 'none', 'Cell animation is suppressed');
    }
    observations.push(await layout(page, `${scenario.name}-completion`));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), completionKey), 'true');
    await activate(page, '#replay');
    assert.equal(await page.locator('#progress').evaluate(el => el.value), 0);
    assert.equal(await page.locator('#complete').evaluate(el => el.open), false);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), completionKey), 'true');
    await assertFocus(page, '#grid .cell[data-index="0"]');
    assert.notDeepEqual((await snapshot(page)).letters, initial.letters, 'Replay generates a new board');
    const afterReplay = await snapshot(page);
    await activate(page, '.accessibility-launcher'); await activate(page, '#accessibility-reset');
    assert.equal(await page.locator('#access-spacing').inputValue(), 'default');
    assert.ok(await page.locator('.accessibility-dialog input[type="checkbox"]').evaluateAll(elements => elements.every(el => !el.checked)));
    await activate(page, '#accessibility-close'); await assertFocus(page, '.accessibility-launcher');
    assert.deepEqual((await snapshot(page)).letters, afterReplay.letters, 'Reset settings preserves the replay board');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), completionKey), 'true');
    await activate(page, 'header a[href="./"]');
    await page.waitForURL(base + '/');
    await activate(page, '#mission-start');
    assert.equal(await page.locator('[data-activity="wordSearchUrl"]').getAttribute('data-completed'), 'true');
    // The completion overlay's explicit return action also resolves to this map.
    await activate(page, '[data-activity="wordSearchUrl"]'); await page.waitForURL('**/word-search.html');
    const replayBoard = await snapshot(page); await activate(page, '#start');
    for (const indices of Object.values(replayBoard.solutions)) await solve(page, indices);
    await activate(page, '#complete a[href="./"]'); await page.waitForURL(base + '/');
    const motion = await page.evaluate(() => ({ requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
      animations: document.getAnimations().filter(animation => animation.playState === 'running').length }));
    if (scenario.motion === 'reduce') { assert.equal(motion.requested, true); assert.equal(motion.animations, 0); }
    assert.deepEqual(errors, []);
    results.push({ scenario: scenario.name, status: 'passed', inputs: 'keyboard only; solution read as test oracle', gridCellsCheckedForObstruction: 200, observations, motion, pageErrors: errors });
  } catch (error) {
    await page.screenshot({ path: resolve(output, `${scenario.name}-failure.png`), fullPage: false }).catch(() => {});
    results.push({ scenario: scenario.name, status: 'failed', error: error.stack, pageErrors: errors });
    throw error;
  } finally { await context.close(); }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const scenario of [
    { name: 'desktop', viewport: { width: 1280, height: 900 } },
    { name: 'mobile-320', viewport: { width: 320, height: 740 }, mobile: true },
    { name: 'mobile-390', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'browser-zoom-200', browserZoom: 2 },
    { name: 'optional-reduced-motion', viewport: { width: 1280, height: 900 }, userMotion: true },
    { name: 'reduced-motion', viewport: { width: 1280, height: 900 }, motion: 'reduce' }
  ].filter(scenario => !process.env.QA_SCENARIO || scenario.name === process.env.QA_SCENARIO)) {
    try { await runJourney(scenario); console.log(`PASS ${scenario.name}`); }
    catch (error) { console.error(`FAIL ${scenario.name}: ${error.message}`); }
  }
} finally {
  await browser?.close(); server.close();
  await writeFile(resolve(output, 'journey-results.json'), JSON.stringify({ browser: 'isolated Chrome via Playwright', version: browser?.version(), base,
    hardwareController: 'not tested', zoom: '200% native Chrome zoom in disposable profile, verified with DPR=2, CSS zoom=1 and reduced CSS viewport',
    compliance: 'No universal controller compatibility or accessibility compliance claim.', results }, null, 2));
}
const passed = results.filter(result => result.status === 'passed').length;
console.log(`Passed ${passed}/${results.length} isolated browser journeys. Details and screenshots: qa-results/`);
if (passed !== results.length) process.exitCode = 1;
