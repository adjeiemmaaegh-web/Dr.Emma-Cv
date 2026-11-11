import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const frozen='development/e22/Ledger_CV_Studio_E22_Monogram_Print_Pagination.html';
const target='development/e23/Ledger_CV_Studio_E23_Calendar_Import_Safety.html';
const original=read(frozen);
assert.equal(sha(original),'ca686104b80df028b8f52b0b91adbafbd569709600dee493f9b8102e1a98e512',
  'Frozen E22 base was modified');
const patches=JSON.parse(read('development/e23/source/calendar_patch.json'));
assert.deepEqual(patches.map(p=>p.id),[
 'utf8-bom-at-file-start','calendar-wide-cancellation-state',
 'detect-top-level-method-cancel','suppress-all-cancelled-calendar-events'
]);
let rebuilt=original;
for(const patch of patches){
 assert.equal(rebuilt.split(patch.find).length,2,'Missing or ambiguous E23 anchor: '+patch.id);
 rebuilt=rebuilt.replace(patch.find,patch.replace);
}
assert.equal(read(target),rebuilt,'Committed E23 standalone HTML differs from audited patch');
assert.equal(sha(rebuilt),'5ad2e0ee3171502a4e5c0720ef9becf49ab97e791b3ba6affd0364e5f7bc8807','Pinned E23 distribution checksum mismatch');
assert(rebuilt.includes('E23: tolerate a UTF-8 BOM')&&rebuilt.includes('METHOD:CANCEL notice'));
const dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,path.basename(target)),rebuilt);
console.log('PASS: E23 is a deterministic, exact four-change patch over frozen E22');
console.log('E23 standalone SHA-256: '+sha(rebuilt));
console.log('Production status: NO-GO. No deployment, merge or live provider approval.');
