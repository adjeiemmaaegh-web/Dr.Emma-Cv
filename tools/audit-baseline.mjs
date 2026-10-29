import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const app=await readFile(resolve(root,'Ledger_CV_Studio_Stage8_Free_Finalization.html'),'utf8');
const readme=await readFile(resolve(root,'docs/PRD_FLOWCV_30_FEATURE_ENHANCEMENTS.md'),'utf8');
assert.ok(app.startsWith('<!DOCTYPE html>'));
assert.ok(app.includes('localStorage'), 'legacy persistence requires explicit migration');
assert.ok(readme.includes('Bring Your Own API Key') || readme.includes('BYOK'));
for (const marker of ['sk-proj-','AKIA','-----BEGIN PRIVATE KEY-----']) {
  assert.ok(!app.includes(marker),'potential credential material found; inspect before proceeding');
}
console.log('PASS: baseline markers, PRD presence, and basic credential-pattern guard. This is NOT a comprehensive secrets scan.');
