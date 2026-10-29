import test from 'node:test';
import assert from 'node:assert/strict';
import { planLegacyMigration,compareLegacySnapshot } from '../../src/domain/storage/migration-plan.mjs';
import {LEGACY_KEYS as K} from '../../src/domain/storage/legacy-inspection.mjs';
const validDoc=()=>Object.assign({personalInfo:{},summary:'',hobbies:'',references:''},Object.fromEntries(['experience','education','skills','languages','certifications','projects','accomplishments','customSections'].map(k=>[k,[]])));
const validState=()=>JSON.stringify({document:validDoc(),appearance:{},versions:[]});
const example=()=>new Map([[K.cv,validState()],[K.recovery,validState()],[K.applications,'[]'],[K.damaged,'{damaged']]);
test('read only, retains exact data and quarantined invalid JSON',()=>{
 const map=example();let calls=0;
 const proposal=planLegacyMigration(k=>{calls++;return map.get(k)??null});
 assert.equal(calls,4);
 assert.equal(proposal.status,'review-required');
 assert.equal(proposal.requiresUserConfirmation,true);
 assert.equal(proposal.entries[K.damaged],'{damaged');
 assert.equal(compareLegacySnapshot(proposal,k=>map.get(k)??null).unchanged,true);
});
test('rejects malformed primary and wrong application structure',()=>{
 const map=example();map.set(K.cv,'{broken');map.set(K.applications,'{"no":"array"}');
 const proposal=planLegacyMigration(k=>map.get(k)??null);
 assert.equal(proposal.status,'blocked');
 assert.ok(proposal.warnings.some(w=>w.includes('Unreadable')));
 assert.ok(proposal.warnings.some(w=>w.includes('not an array')));
 assert.equal(Object.hasOwn(proposal.entries,K.cv),false);
});
test('rejects parseable but structurally invalid primary',()=>{const map=example();map.set(K.cv,'{"cvs":[]}');const p=planLegacyMigration(k=>map.get(k)??null);assert.equal(p.status,'blocked');assert.ok(p.warnings.some(x=>x.includes('Invalid legacy payload')));});
test('fails closed on access failures or oversized values',()=>{
 const map=example();map.set(K.recovery,'x'.repeat(200));
 const proposal=planLegacyMigration(k=>{if(k===K.applications)throw Error('denied');return map.get(k)??null},{maxEntryBytes:100});
 assert.equal(proposal.status,'blocked');
 assert.ok(proposal.warnings.length>=2);
});
test('detects stale snapshot before potential user-approved write',()=>{
 const map=example();const proposal=planLegacyMigration(k=>map.get(k)??null);
 map.set(K.cv,'{"cvs":[{"id":"changed"}]}');
 assert.deepEqual(compareLegacySnapshot(proposal,k=>map.get(k)??null),{unchanged:false,changedKeys:[K.cv]});
});
test('rejects unexpected keys on compare',()=>{
 const map=example();const proposal=planLegacyMigration(k=>map.get(k)??null);
 proposal.entries.unrecognized='a';
 assert.throws(()=>compareLegacySnapshot(proposal,k=>map.get(k)??null),/Unexpected key/);
});
