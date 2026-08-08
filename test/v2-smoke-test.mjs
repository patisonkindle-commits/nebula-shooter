// v2 Smoke Test — verify every module loads (syntax + import resolution) via ESM dynamic import
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// List all .js files under js/v2
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(path.relative(ROOT, p));
  }
})(path.join(ROOT, 'js/v2'));

console.log(`=== Nebula v2 smoke test — ${files.length} modules ===\n`);
let failures = 0;

for (const f of files) {
  const url = pathToFileURL(path.join(ROOT, f)).href;
  try {
    await import(url);
    console.log(`\u2713 ${f}`);
  } catch (e) {
    failures++;
    console.log(`\u2717 ${f}: ${e.message}`);
  }
}

console.log(`\n${files.length - failures}/${files.length} loaded, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);

function pathToFileURL(p) { return { href: 'file://' + p }; }