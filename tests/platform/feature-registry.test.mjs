import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureRegistry} from '../../src/core/feature-registry.mjs';
test('isolates feature registration and rejects duplicate/invalid IDs',()=>{
 const reg=createFeatureRegistry();
 reg.register({id:'profile-feature',mount:()=>{}});
 assert.equal(reg.list().length,1);
 assert.throws(()=>reg.register({id:'profile-feature',mount:()=>{}}),/Duplicate/);
 assert.throws(()=>reg.register({id:'INVALID ID',mount:()=>{}}),/valid id/);
 assert.throws(()=>reg.register({id:'other-feature',dependencies:['other-feature'],mount:()=>{}}),/dependencies/);
});
test('enforces dependencies, cleanup and scoped host objects',async()=>{
 const reg=createFeatureRegistry(),host={tag:'synthetic'},events=[];
 reg.register({id:'profile-feature',mount:({host:given})=>{assert.equal(given,host);events.push('profile+');return ()=>events.push('profile-')}});
 reg.register({id:'editor-feature',dependencies:['profile-feature'],mount:()=>{events.push('editor+');return {dispose(){events.push('editor-')}}}});
 await assert.rejects(reg.mount('editor-feature',{host}),/Missing mounted dependency/);
 await reg.mount('profile-feature',{host});
 await reg.mount('editor-feature',{host});
 await assert.rejects(reg.unmount('profile-feature'),/Unmount dependents first/);
 await reg.unmount('editor-feature');await reg.unmount('profile-feature');
 assert.deepEqual(events,['profile+','editor+','editor-','profile-']);
});
test('failed mount does not leave a permanently blocked feature',async()=>{
 let attempt=0;const reg=createFeatureRegistry();
 reg.register({id:'retry-feature',mount:()=>{if(++attempt===1)throw Error('synthetic failure');return undefined}});
 await assert.rejects(reg.mount('retry-feature',{host:{}}),/synthetic/);
 assert.equal(reg.isMounted('retry-feature'),false);
 await reg.mount('retry-feature',{host:{}});
 assert.equal(reg.isMounted('retry-feature'),true);
 await reg.unmount('retry-feature');
});
