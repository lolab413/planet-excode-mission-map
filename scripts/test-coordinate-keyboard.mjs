import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Run real React component handlers without a browser or changing activity files.
const root = resolve(process.argv[2] || '../CoordinatePlaneLearningActivity');
const coordinateRequire = createRequire(resolve(root, 'package.json'));
const ts = coordinateRequire('typescript');
function component(name) {
  const states = []; let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
    useEffect() { cursor++; },
    useCallback(fn) { cursor++; return fn; }
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const source = readFileSync(resolve(root, 'src', name), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = {
    module, exports: module.exports,
    require(id) {
      if (id === 'react') return hooks;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (id === './App') return { default: () => null };
      if (id.endsWith('.css')) return {};
      if (id === './activityCompletion') return { readMissionProgress: () => [false, false, false, false, false], saveMissionProgress: () => true, getMapReturnUrl: () => null };
      throw Error(`Unexpected dependency: ${id}`);
    },
    requestAnimationFrame: fn => fn(), window: {}, document: {}, console
  };
  vm.runInNewContext(compiled, context);
  return () => { cursor = 0; return module.exports.default(); };
}
function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
let render = component('PreActivity.tsx'), tree = render();
const next = () => elements(tree).find(node => node.type === 'button' && node.props.className === 'flight-start');
for (let i = 0; i < 5; i++) { assert.ok(!next().props.disabled); next().props.onClick(); tree = render(); }
const targets = [[3, 4], [-2, 1], [2, -3], [-3, -2]];
for (const [x, y] of targets) {
  assert.ok(next().props.disabled, 'Practice still requires successful completion');
  for (const [axis, value] of [['x', x], ['y', y]]) {
    const select = elements(tree).find(node => node.type === 'select' && node.props['aria-label'] === `Practice ${axis} coordinate`);
    assert.ok(select && !select.props.disabled, 'Keyboard coordinate selector is enabled');
    select.props.onChange({ target: { value: String(value) } }); tree = render();
  }
  elements(tree).find(node => node.props?.className === 'flight-check').props.onClick(); tree = render();
  assert.ok(!next().props.disabled, 'Equivalent coordinate selection completes the unchanged target');
  next().props.onClick(); tree = render();
}
assert.ok(elements(tree).some(node => node.type === 'button' && node.props.className === 'flight-start'), 'All preflight practices complete without pointing or dragging');

render = component('App.tsx'); tree = render();
const editor = () => elements(tree).find(node => node.type === 'textarea');
assert.equal(tree.type, 'main'); assert.equal(tree.props['aria-label'], 'Coordinate missions');
assert.ok(editor().props['aria-label']); assert.equal(editor().props['aria-describedby'], 'code-keyboard-help');
for (const shiftKey of [false, true]) {
  let prevented = false;
  editor().props.onKeyDown({ key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'Tab and Shift+Tab retain native focus navigation');
}
const before = editor().props.value;
editor().props.ref.current = { selectionStart: 0, selectionEnd: 0 };
let prevented = false;
editor().props.onKeyDown({ key: ']', ctrlKey: true, preventDefault() { prevented = true; } });
tree = render(); assert.ok(prevented); assert.equal(editor().props.value, `  ${before}`, 'Indent shortcut still inserts spaces');
for (const label of ['Zoom in', 'Zoom out', 'Reset coordinate plane zoom', 'Expand coordinate plane']) {
  assert.ok(elements(tree).some(node => node.type === 'button' && node.props['aria-label'] === label), `Accessible name: ${label}`);
}
const toggle = elements(tree).find(node => node.props?.className === 'mission-toggle');
assert.equal(toggle.type, 'button'); assert.equal(toggle.props.type, 'button');
assert.equal(toggle.props['aria-controls'], 'mission-instructions');
assert.ok(elements(tree).some(node => node.props?.id === 'mission-instructions'));
toggle.props.onClick(); tree = render();
assert.equal(elements(tree).find(node => node.props?.className === 'mission-toggle').props['aria-expanded'], false);
console.log('Passed: all preflight practice targets via native selectors, unchanged completion gating, editor Tab/Shift+Tab exit, separate indentation shortcut, semantic mission toggle, named zoom controls, and mission landmark.');
