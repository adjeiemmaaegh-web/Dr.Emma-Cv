import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_KEYS} from '../../src/domain/storage/legacy-inspection.mjs';
import {createLegacyRawBackup,previewLegacyRawBackup,approveLegacyRawBackup} from '../../src/domain/storage/legacy-backup.mjs';
const expected=[LEGACY_KEYS.cv,LEGACY_KEYS.recovery,LEGACY_KEYS.applications,LEGACY_KEYS.damaged];
const fixture=()=>new Map([
 [LEGACY_KEYS.cv,'{synthetic damaged primary'],
 [LEGACY_KEYS.recovery,'{  "document": {"summary":"synthetic recovery"} }  '],
 [LEGACY_KEYS.applications,'[{"synthetic":"fixture"}]'],
 [LEGACY_KEYS.damaged,'{"raw":"unterminated']
]);
test('preserves damaged and intact legacy raw strings without touching storage',async()=>{
 const storage=fixture(),before=[...storage.entries()];
 const backup=await createLegacyRawBackup(key=>storage.get(key)??null,{now:'2026-11-17T00:00:00.000Z'});
 const preview=await previewLegacyRawBackup(backup);
 assert.equal(preview.status,'review-required');
 assert.equal(preview.proposed.presentKeys,4);
 assert.throws(()=>approveLegacyRawBackup(preview),e=>e.code==='UNCONFIRMED');
 const approved=approveLegacyRawBackup(preview,{confirmed:true});
 for(const key of expected)assert.equal(approved.entries[key],storage.get(key));
 assert.equal(approved.manualRestoreOnly,true);
 assert.deepEqual([...storage.entries()],before);
});
test('absent data is recorded distinctly from empty strings',async()=>{
 const backup=await createLegacyRawBackup(key=>key===LEGACY_KEYS.cv?'':null);
 const plan=approveLegacyRawBackup(await previewLegacyRawBackup(backup),{confirmed:true});
 assert.equal(plan.entries[LEGACY_KEYS.cv],'');
 assert.equal(plan.entries[LEGACY_KEYS.recovery],null);
});
test('tampered, incomplete and oversized raw backups fail closed',async()=>{
 const backup=await createLegacyRawBackup(key=>key===LEGACY_KEYS.cv?'dummy':null);
 const wrapper=JSON.parse(backup);
 wrapper.payload=wrapper.payload.replace('dummy','altered');
 assert.equal((await previewLegacyRawBackup(JSON.stringify(wrapper))).status,'blocked');
 assert.equal((await previewLegacyRawBackup('{}')).status,'blocked');
 await assert.rejects(createLegacyRawBackup(key=>{
  if(key===LEGACY_KEYS.cv)return 'x'.repeat(8*1024*1024+1);return null;
 }),e=>e.code==='INVALID');
});
test('denied read and unsupported key types never return partial backup',async()=>{
 await assert.rejects(createLegacyRawBackup(key=>{
  if(key===LEGACY_KEYS.applications)throw Error('synthetic denial');
  return null;
 }),e=>e.code==='UNAVAILABLE');
 await assert.rejects(createLegacyRawBackup(key=>key===LEGACY_KEYS.cv?{invalid:true}:null),
  e=>e.code==='INVALID');
});

test('detects a mid-snapshot legacy change and exports nothing',async()=>{
 let primaryReads=0;
 await assert.rejects(createLegacyRawBackup(key=>{
  if(key===LEGACY_KEYS.cv)return ++primaryReads===1?'synthetic-before':'synthetic-after';
  return null;
 }),e=>e.code==='CONFLICT');
 assert.equal(primaryReads,2);
});
test('second-pass storage denial blocks inconsistent legacy exports',async()=>{
 let reads=0;
 await assert.rejects(createLegacyRawBackup(key=>{
  if(key===LEGACY_KEYS.cv&&++reads===2)throw Error('synthetic permission revoked');
  return null;
 }),e=>e.code==='UNAVAILABLE');
});
