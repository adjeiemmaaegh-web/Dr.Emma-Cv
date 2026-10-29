import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {LEGACY_KEYS} from '../src/domain/storage/legacy-inspection.mjs';
const app=await readFile(new URL('../Ledger_CV_Studio_Stage8_Free_Finalization.html',import.meta.url),'utf8');
for(const key of Object.values(LEGACY_KEYS))assert.ok(app.includes(key),'Missing legacy key: '+key);
const tracked=[...new Set([...app.matchAll(/ledger_cv_[a-z0-9_]+/g)].map(m=>m[0]))].sort();
console.log('Storage key inventory (names only): '+JSON.stringify(tracked));
console.log('PASS: defined legacy storage keys exist in preserved baseline; automated extraction is conservative.');
