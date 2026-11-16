import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareerProfile} from '../../src/domain/profile/career-profile.mjs';
import {createCareerProfileBackup,previewCareerProfileBackup,approveCareerProfileBackup} from '../../src/domain/storage/profile-backup.mjs';
const date='2026-11-17T10:00:00.000Z';
const seed=()=>createCareerProfile({id:'profileABC123',now:date,idFactory:()=> 'masterABC123'});
test('checksum backup round trips only after explicit user approval',async()=>{
 const p=seed(),raw=await createCareerProfileBackup(p,{now:date});
 const preview=await previewCareerProfileBackup(raw);
 assert.equal(preview.status,'review-required');
 assert.throws(()=>approveCareerProfileBackup(preview),e=>e.code==='UNCONFIRMED');
 const restored=approveCareerProfileBackup(preview,{confirmed:true});
 assert.deepEqual(restored,p);
 restored.name='Edited restored copy';assert.equal(p.name,'My career profile');
});
test('tampering with backup payload fails closed',async()=>{
 const raw=await createCareerProfileBackup(seed(),{now:date});
 const obj=JSON.parse(raw);obj.payload=obj.payload.replace('Master CV','Made up');
 const preview=await previewCareerProfileBackup(JSON.stringify(obj));
 assert.equal(preview.status,'blocked');
});
test('invalid, absent and oversized backups do not return proposed data',async()=>{
 for(const bad of ['{not-json','{}','x'.repeat(8*1024*1024+4097)]){
  const preview=await previewCareerProfileBackup(bad);
  assert.equal(preview.status,'blocked');assert.equal(preview.proposed,null);
 }
});
