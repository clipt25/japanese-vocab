// Stamps call-assistant.html's import map with one content hash of call/*.js.
//
// Why: GitHub Pages serves every file with Cache-Control: max-age=600 and we
// cannot change that. After a deploy, a browser that still holds a cached
// module links a freshly fetched importer against it; if the importer wants an
// export the stale copy lacks, the whole module graph fails to link and the
// page renders blank below the header. Versioned URLs make each deploy a
// disjoint set of URLs, so the browser can never mix modules from two deploys.
//
// The import map remaps the *resolved* URL of each module, so the relative
// imports inside call/*.js ('./match.js') stay plain, and Node's test runner,
// which knows nothing about import maps, still resolves them unchanged.
//
// Run after editing anything in call/:   node stamp-modules.js
// call/test/import-map.test.js fails if you forget.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
export const IMPORT_MAP_RE = /<script type="importmap">([\s\S]*?)<\/script>/;

export function callModules(root = HERE) {
  return readdirSync(join(root, 'call')).filter(f => f.endsWith('.js')).sort();
}

// Content-derived, so it changes exactly when a module changes: no counter to
// forget, and a deploy that leaves call/ alone keeps every cached module valid.
export function callVersion(root = HERE) {
  const hash = createHash('sha256');
  for (const file of callModules(root)) {
    hash.update(file).update('\0').update(readFileSync(join(root, 'call', file))).update('\0');
  }
  return hash.digest('hex').slice(0, 10);
}

export function importMap(root = HERE) {
  const v = callVersion(root);
  return {
    imports: Object.fromEntries(
      callModules(root).map(f => [`./call/${f}`, `./call/${f}?v=${v}`])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ?? HERE;
  const file = join(root, 'call-assistant.html');
  const html = readFileSync(file, 'utf8');
  if (!IMPORT_MAP_RE.test(html)) {
    throw new Error(`${file} has no <script type="importmap"> block to stamp`);
  }
  const block = `<script type="importmap">\n${JSON.stringify(importMap(root), null, 2)}\n</script>`;
  const next = html.replace(IMPORT_MAP_RE, () => block);
  if (next !== html) writeFileSync(file, next);
  console.log(`${next === html ? 'already stamped' : 'stamped'} call modules v=${callVersion(root)}`);
}
