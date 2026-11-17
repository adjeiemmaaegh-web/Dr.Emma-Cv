import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('service worker waits for explicit SKIP_WAITING instead of activating updates during install',async()=>{
 const script=fs.readFileSync('hosting/sw.template.js','utf8');
 const callbacks=new Map(),cache=new Map(),calls=[];
 const self={
  location:{origin:'https://example.test'},
  addEventListener:(name,fn)=>callbacks.set(name,fn),
  skipWaiting:async()=>{calls.push('skipWaiting')},
  clients:{claim:async()=>calls.push('claim')}
 };
 const caches={open:async()=>({addAll:async()=>{},put:async()=>{}}),keys:async()=>[],delete:async()=>{}};
 vm.runInNewContext(script,{self,caches,fetch:async()=>({ok:true,clone(){return this}}),URL});
 const event=()=>{let waiting;return {waitUntil:p=>{waiting=Promise.resolve(p)},get done(){return waiting}}};
 const installed=event();callbacks.get('install')(installed);await installed.done;
 assert.deepEqual(calls,[],'install cannot force an upgrade');
 const irrelevant=event();callbacks.get('message')({...irrelevant,data:{type:'other'}});assert.deepEqual(calls,[]);
 const authorized=event();callbacks.get('message')({...authorized,data:{type:'SKIP_WAITING'}});await authorized.done;
 assert.deepEqual(calls,['skipWaiting']);
});
