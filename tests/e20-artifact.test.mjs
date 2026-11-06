import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { Script } from 'node:vm';
import test from 'node:test';

// E20 artifact assurance only: the historical 669-test development suite is not present.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(root, 'development', 'e20');
const known = {
  app: 'e95d851702931d1c4d0b4b3445d4db9d9a6051014529abf067e672576982848f',
  qa: '32a3828b1591e63f06623726a1d3af82b1cbb713e6b58b4941241668f887949f',
  handover: 'd89b5b1f4005b77f8fdc4c29d56382b05f0200d37a15a266e2f2ac406d805c1c',
  gates: '46ab1c9179ccaabb3dac6407105f85148106880eb3bcbfee3f85e5416c1d8918',
};
const paths = {
  app: 'Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html',
  qa: 'Ledger_CV_Studio_E20_Offline_QA_2026-11-06.html',
  handover: 'ENGINEERING_HANDOVER.md',
  gates: 'RELEASE_GATES.csv',
};
const bytes = name => readFileSync(join(base, paths[name]));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const app = bytes('app').toString('utf8');
const qa = bytes('qa').toString('utf8');

for (const id of Object.keys(paths)) {
  test(id + ': exact uploaded E20 artifact digest', () => {
    assert.equal(sha256(bytes(id)), known[id]);
  });
}
test('QA pins the identical owner-provided HTML', () => {
  assert.ok(qa.includes("const EXPECTED='" + known.app + "'"));
  for (const marker of ['ledgerE1VisualExport', 'ledgerE2', 'ledgerE3Launcher', 'ledgerE4Launcher', 'ledgerE5Core']) {
    assert.ok(app.includes(marker), 'Missing identity marker: ' + marker);
  }
});
test('E20 bounded calendar importer integration markers exist', () => {
  for (const marker of ['ledgerE20Calendar', 'Career tracker', 'Tasks & reminders', 'text/calendar', 'VEVENT']) {
    assert.ok(app.includes(marker), 'Missing integration marker: ' + marker);
  }
  assert.match(app, /\.ics/);
});
function checkScripts(label, html, expectedCount) {
  const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.equal(tags.length, expectedCount);
  for (const [,attrs,code] of tags) {
    assert.doesNotMatch(attrs, /\bsrc\s*=/i);
    new Script(code, { filename: label + '.inline.js' });
  }
  assert.doesNotMatch(html, /<link\b(?=[^>]*\brel\s*=\s*["']?stylesheet\b)[^>]*>/i);
}
test('E20 standalone app inline JS parses without linked JS/CSS', () => checkScripts('app',app,11));
test('E20 QA inline JS parses without linked JS/CSS', () => checkScripts('qa',qa,1));
test('Critical production gates remain explicitly unapproved', () => {
  assert.match(bytes('handover').toString('utf8'), /Production NO-GO/);
  const gates=bytes('gates').toString('utf8');
  assert.match(gates, /Windows Chrome and Edge open and run standalone HTML,OPEN/);
  assert.match(gates, /Approved live BYOK provider compatibility,OPEN/);
});
