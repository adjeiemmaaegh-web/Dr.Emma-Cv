#!/usr/bin/env node
/** Non-destructive static Group A integration audit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const vercel=JSON.parse(read('vercel.json'));
assert.equal(pkg.scripts.build,vercel.buildCommand,'npm and Vercel builds differ');
assert.equal(pkg.scripts.build,'node tools/build-e31-unified-ux.mjs');
assert.equal(vercel.outputDirectory,'site');
const workflow=read('.github/workflows/e31-candidate.yml');
assert(!workflow.includes('smoke\\n        run:'),'E31 workflow still contains escaped newlines');
assert(workflow.includes('run: node tools/build-e31-unified-ux.mjs'),'E31 CI fails to verify actual public artifact');
assert(workflow.includes('python tests/e31_candidate_browser.py'),'E31 browser regression missing');
const sw=read('hosting/sw.template.js');
assert(sw.includes("ledger-e(?:29|30|31)-"),'Old hosted shell caches not cleaned up');
for(const path of [
 'src/contracts/platform.mjs','src/contracts/platform.d.ts',
 'src/core/feature-registry.mjs','src/core/composition-root.mjs','src/domain/profile/career-profile.mjs',
 'src/domain/storage/revision-store.mjs','src/domain/storage/profile-backup.mjs',
 'src/domain/storage/legacy-backup.mjs','tests/platform/legacy-backup.test.mjs',
 'src/ui/system/tokens.css','tests/platform/feature-registry.test.mjs',
 'tests/platform/career-profile.test.mjs','tests/platform/revision-store.test.mjs',
 'tests/platform/profile-backup.test.mjs','tests/platform/platform_browser.py'
]){
 assert(fs.statSync(path).isFile(),'Missing platform source: '+path);
 if(path.endsWith('.mjs')){
  const content=read(path);
  assert(!/\b(?:window\.localStorage|localStorage\.setItem|localStorage\.removeItem|fetch\s*\()\b/.test(content),
   'New platform code may not mutate legacy data or make remote fetches: '+path);
 }
}
console.log('PASS Group A static boundaries; legacy snapshots remain independently hash-pinned');
