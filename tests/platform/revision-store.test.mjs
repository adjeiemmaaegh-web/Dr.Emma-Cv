import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryRevisionStore,createIndexedDBRevisionStore} from '../../src/domain/storage/revision-store.mjs';
import {createCareerProfile,createCVVariant} from '../../src/domain/profile/career-profile.mjs';
const date='2026-11-17T10:00:00.000Z';
const seed=()=>createCareerProfile({id:'profileABC123',now:date,idFactory:()=> 'masterABC123'});
test('initial save and update are revision guarded',async()=>{
 const store=createMemoryRevisionStore(),p=seed();
 assert.equal(await store.load(p.id),null);
 assert.equal((await store.save(p.id,p,null)).revision,0);
 const v=createCVVariant(p,{id:'variantABC123',expectedRevision:0,now:date});
 assert.equal((await store.save(p.id,v,0)).revision,1);
 await assert.rejects(store.save(p.id,v,0),e=>e.code==='CONFLICT');
 const saved=await store.load(p.id);
 assert.equal(saved.value.variants.length,1);
 saved.value.variants[0].name='tampered';
 assert.notEqual((await store.load(p.id)).value.variants[0].name,'tampered');
});
test('simultaneous stale revisions cannot both commit',async()=>{
 const store=createMemoryRevisionStore(),p=seed();await store.save(p.id,p,null);
 const v1=createCVVariant(p,{id:'variantABC123',expectedRevision:0,now:date});
 const v2=createCVVariant(p,{id:'variantDEF123',expectedRevision:0,now:date});
 const outcomes=await Promise.allSettled([store.save(p.id,v1,0),store.save(p.id,v2,0)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);
 assert.equal((await store.load(p.id)).revision,1);
});
test('interrupted writes preserve original data',async()=>{
 const store=createMemoryRevisionStore({beforeCommit:()=>{throw Error('synthetic quota failure')}});
 const p=seed();await assert.rejects(store.save(p.id,p,null),/synthetic quota/);
 assert.equal(await store.load(p.id),null);
});
test('revision metadata must match the payload, preventing silent overwrite',async()=>{
 const store=createMemoryRevisionStore(),p=seed();
 await assert.rejects(store.save(p.id,p,0),e=>e.code==='CONFLICT');
 await store.save(p.id,p,null);
 await assert.rejects(store.save(p.id,p,0),e=>e.code==='CONFLICT');
});
test('the legacy browser storage is never a fallback database',()=>{
 assert.throws(()=>createIndexedDBRevisionStore({indexedDBFactory:null}),e=>e.code==='UNAVAILABLE');
 assert.throws(()=>createIndexedDBRevisionStore({indexedDBFactory:{open(){}},databaseName:'other'}),e=>e.code==='INVALID');
});

test('memory repository discovers saved profiles',async()=>{
 const store=createMemoryRevisionStore(),p=seed();
 assert.deepEqual(await store.listIds(),[]);
 await store.save(p.id,p,null);
 assert.deepEqual(await store.listIds(),[p.id]);
});
