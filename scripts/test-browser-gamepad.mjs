// Browser-integrated Gamepad API simulation. This never tests physical hardware.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = createRequire(resolve(root, '.qa-runtime/package.json'))('playwright');
const output = resolve(root, 'qa-results'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
await context.addInitScript(() => {
  window.__qaController = { reads: 0, pad: { index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) } };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value() { window.__qaController.reads++; return [window.__qaController.pad]; } });
});
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
const key = 'planet-excode-system-reboot-core-concepts-progress-v1';
const result = { type: 'Browser-integrated simulation with mocked standard Gamepad API', physicalHardware: 'not tested' };
async function frames() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function button(index) {
  await page.evaluate(index => window.__qaController.pad.buttons[index].pressed = true, index); await frames();
  await page.evaluate(index => window.__qaController.pad.buttons[index].pressed = false, index); await frames();
}
async function moveTo(end) {
  let index = await page.evaluate(() => Number(document.activeElement.dataset.index));
  while (Math.floor(index / 10) !== Math.floor(end / 10)) {
    const down = Math.floor(index / 10) < Math.floor(end / 10);
    await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp'); index += down ? 10 : -10;
  }
  while (index % 10 !== end % 10) {
    const right = index % 10 < end % 10;
    await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft'); index += right ? 1 : -1;
  }
}
try {
  await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4173') + '/word-search.html', { waitUntil: 'networkidle' });
  await page.locator('#start').click();
  const board = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__qaController.reads), 0, 'Disabled mode never reads controller state');
  await page.locator('.accessibility-launcher').click(); await page.locator('#access-gamepad').check();
  await frames(); await page.locator('#accessibility-close').click();
  await page.locator('.cell').first().focus(); await frames();
  await button(15);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '1', 'Simulated D-pad uses real grid arrow handler');
  assert.equal(await page.locator('.cell[data-index="1"]').getAttribute('data-gamepad-focus'), '');
  await moveTo(board.solutions.SYSTEM[0]); await frames();
  await button(0); assert.equal(await page.locator('.selection-start').count(), 1);
  await button(1); assert.equal(await page.locator('.selected').count(), 0, 'Simulated Back cancels real selection');
  await button(0);
  await moveTo(board.solutions.SYSTEM.at(-1)); await page.keyboard.press('Space');
  assert.equal(await page.locator('#progress').evaluate(el => el.value), 1, 'Keyboard completes selection started by simulated controller');
  for (const index of [board.solutions.LOGIC[0], board.solutions.LOGIC.at(-1)]) await page.locator(`.cell[data-index="${index}"]`).tap();
  assert.equal(await page.locator('#progress').evaluate(el => el.value), 2, 'Touch takes over without restarting');
  for (const index of [board.solutions.DATA[0], board.solutions.DATA.at(-1)]) await page.locator(`.cell[data-index="${index}"]`).click();
  assert.equal(await page.locator('#progress').evaluate(el => el.value), 3, 'Mouse takes over without restarting');
  const recovered = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  assert.deepEqual(recovered.letters, board.letters); assert.deepEqual(recovered.solutions, board.solutions);
  await frames(); await button(0); assert.equal(await page.locator('.selection-start').count(), 1);
  await page.evaluate(() => { window.__qaController.pad.connected = false; dispatchEvent(new Event('gamepaddisconnected')); });
  const disconnectedReads = await page.evaluate(() => window.__qaController.reads); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__qaController.reads), disconnectedReads);
  assert.equal(await page.locator('.selection-start').count(), 1, 'Disconnect preserves pending selection');
  await page.evaluate(() => { window.__qaController.pad.connected = true; dispatchEvent(new Event('gamepadconnected')); }); await frames();
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.selected').count(), 0);
  // Playwright normally forces all headless pages to report focused. Disable
  // that emulation before checking an actual background page's focus state.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  const other = await context.newPage(); await other.bringToFront(); await page.waitForTimeout(100);
  const inactive = await page.evaluate(() => ({ hidden: document.hidden, focused: document.hasFocus(), reads: window.__qaController.reads }));
  result.inactiveBrowserTab = inactive;
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__qaController.reads), inactive.reads, 'Inactive browser tab does not poll');
  assert.ok(inactive.hidden || !inactive.focused);
  await other.close(); await page.bringToFront();
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }); await frames();
  await page.locator('.accessibility-launcher').click(); await page.locator('#access-gamepad').uncheck();
  const disabledReads = await page.evaluate(() => window.__qaController.reads); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__qaController.reads), disabledReads);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), recovered, 'All input/lifecycle transitions preserve recovered puzzle');
  assert.deepEqual(errors, []);
  result.status = 'passed'; result.recoveredWords = recovered.found; result.pageErrors = errors;
  result.checks = ['No reads while disabled', 'Real grid navigation and focus cue via mocked D-pad', 'Primary/Back route through real keyboard handlers', 'Controller-to-keyboard-to-touch-to-mouse recovery on one board', 'Disconnect/reconnect preserves pending selection and stops reads', 'Inactive tab stops reads', 'Mode off stops reads'];
  await page.screenshot({ path: resolve(output, 'simulated-gamepad-settings.png'), animations: 'disabled' });
  console.log('PASS browser-integrated simulated gamepad and mixed inputs; no physical controller tested.');
} catch (error) {
  result.status = 'failed'; result.error = error.stack; result.pageErrors = errors;
  await page.screenshot({ path: resolve(output, 'simulated-gamepad-failure.png') }).catch(() => {});
  process.exitCode = 1; console.error(error);
} finally {
  await writeFile(resolve(output, 'gamepad-browser-results.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
