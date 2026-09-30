import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'public');
const output = resolve(root, 'dist');
const html = await readFile(resolve(source, 'index.html'), 'utf8');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(?:https?:|data:|#)/.test(ref)) continue;
  const target = resolve(source, ref.split(/[?#]/)[0]);
  if (target !== source && !target.startsWith(source + sep)) throw new Error(`Asset escapes public: ${ref}`);
  await stat(target);
}
const files = await readdir(source, { recursive: true });
let count = 0;
for (const file of files) {
  const path = resolve(source, file);
  if (!(await stat(path)).isFile()) continue;
  if (file.endsWith('.js')) execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  if (/\.(html|css|js)$/.test(file)) {
    const text = await readFile(path, 'utf8');
    if (/chatgpt\.site|api\.openai\.com|127\.0\.0\.1|localhost|\uFFFD/.test(text)) {
      throw new Error(`Unexpected hosting dependency, local URL, or invalid text in ${file}`);
    }
  }
  count++;
}
const context = { window: {} };
vm.runInNewContext(await readFile(resolve(source, 'mission-config.js'), 'utf8'), context);
for (const [key, value] of Object.entries(context.window.PLANET_EXCODE_CONFIG)) {
  if (!value) continue;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Use a public HTTPS URL for ${key}`);
}
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
for (const file of files) {
  const path = resolve(source, file);
  if (!(await stat(path)).isFile()) continue;
  const before = await readFile(path);
  const after = await readFile(resolve(output, relative(source, path)));
  if (!before.equals(after)) throw new Error(`Output differs: ${file}`);
}
console.log(`Production build verified: ${count} files in dist; assets resolve, JavaScript parses, no ChatGPT or localhost runtime URLs.`);
