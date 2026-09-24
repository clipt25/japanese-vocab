import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IMPORT_MAP_RE, importMap } from '../../stamp-modules.js';

const html = readFileSync(new URL('../../call-assistant.html', import.meta.url), 'utf8');

test('import map is stamped with the current call/*.js version', () => {
  const found = html.match(IMPORT_MAP_RE);
  assert.ok(found, 'call-assistant.html has no <script type="importmap">');
  assert.deepEqual(JSON.parse(found[1]), importMap(),
    'import map is stale: a deploy now would let browsers mix cached and fresh ' +
    'modules. Run `node stamp-modules.js`.');
});

test('import map precedes every module script', () => {
  // A map that arrives after module loading has begun does not apply to it.
  assert.ok(html.search(IMPORT_MAP_RE) < html.indexOf('<script type="module"'));
});

test('every call module the page imports goes through the map', () => {
  const { imports } = importMap();
  const specifiers = [...html.matchAll(/from\s+'([^']*call\/[^']*)'/g)].map(m => m[1]);
  assert.ok(specifiers.length > 0);
  for (const s of specifiers) assert.ok(s in imports, `${s} is not in the import map`);
});
