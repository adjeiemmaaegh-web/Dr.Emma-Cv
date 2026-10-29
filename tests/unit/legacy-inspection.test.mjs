import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStoredJSON,inspectLegacyStorage,LEGACY_KEYS} from '../../src/domain/storage/legacy-inspection.mjs';
test('missing and malformed JSON are reported without throwing',()=>{
 assert.deepEqual(parseStoredJSON(null),{ok:false,reason:'absent'});
 assert.equal(parseStoredJSON('{broken').reason,'unreadable');
 assert.equal(parseStoredJSON('[]').reason,'invalid');
});
test('inspection is read-only and avoids sensitive values',()=>{
 const values=new Map([[LEGACY_KEYS.cv,'{"name":"PRIVATE TEST CV"}'],[LEGACY_KEYS.applications,'{broken']]);
 let reads=0;
 const result=inspectLegacyStorage(k=>{reads++;return values.get(k)??null;});
 assert.equal(reads,4);
 assert.equal(result.cv.status,'json-valid');
 assert.equal(result.applications.status,'unreadable');
 assert.ok(!JSON.stringify(result).includes('PRIVATE TEST CV'));
});
test('storage access failure is reported',()=>{
 const result=inspectLegacyStorage(()=>{throw new Error('blocked');});
 assert.equal(result.cv.status,'access-denied');
});
