// Real Chromium SW lifecycle, no fake registration: install -> wait -> dirty guard -> consent -> offline shell.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const template=fs.readFileSync(path.join(root,'hosting/sw.template.js'),'utf8');
let version=1;
const body='<!doctype html><html lang="en"><meta charset="utf-8"><title>Offline shell</title><h1>Offline test shell</h1>';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
 res.setHeader('Cache-Control','no-cache');
 if(pathname==='/sw.js'){
  res.setHeader('Content-Type','text/javascript');
  res.setHeader('Service-Worker-Allowed','/');
  res.end(template.replace('HOSTED_SHELL_VERSION','ledger-e31-'+String(version).padStart(14,'0')));return;
 }
 if(pathname==='/index.html'||pathname==='/'){
  res.setHeader('Content-Type','text/html');res.end(body);return;
 }
 if(pathname==='/site.webmanifest'){res.setHeader('Content-Type','application/manifest+json');res.end('{}');return}
 if(pathname==='/favicon.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg"/>');return}
 if(pathname==='/src/features/pwa-ui/update-manager.mjs'){
  res.setHeader('Content-Type','text/javascript');
  res.end(fs.readFileSync(path.join(root,pathname),'utf8'));return;
 }
 res.writeHead(404).end();
}).listen(0);
const port=server.address().port,base='http://localhost:'+port;
const browser=await chromium.launch();let failed=false;
try{
 const ctx=await browser.newContext(),p=await ctx.newPage();
 await p.goto(base+'/index.html');
 await p.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready});
 await p.reload();
 await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const original=await p.evaluate(async()=>{
  const r=await navigator.serviceWorker.getRegistration();return r.active?.scriptURL;
 });
 assert(original?.endsWith('/sw.js'));
 // This is an actual newly installed SW, not a mock waiting object.
 version=2;
 await p.evaluate(async()=>{
  const r=await navigator.serviceWorker.getRegistration();await r.update();
 });
 await p.waitForFunction(async()=>{
  const r=await navigator.serviceWorker.getRegistration();return !!r.waiting;
 });
 // No unrequested activation: a live controlled tab keeps the new worker waiting.
 const waiting=await p.evaluate(async()=>{
  const r=await navigator.serviceWorker.getRegistration();
  const {createUpdateManager}=await import('/src/features/pwa-ui/update-manager.mjs');
  window.dirty=true;window.reloads=0;window.changed=0;
  navigator.serviceWorker.addEventListener('controllerchange',()=>window.changed++);
  window.updateManager=createUpdateManager({registration:r,serviceWorker:navigator.serviceWorker,
    hasUnsavedWork:()=>window.dirty,reload:()=>window.reloads++});
  return {state:window.updateManager.getState(),active:!!r.active,waiting:!!r.waiting};
 });
 assert.equal(waiting.state.status,'available');
 assert.equal(waiting.waiting,true);
 assert.deepEqual(await p.evaluate(()=>window.updateManager.apply()),{ok:false,reason:'unsaved'});
 assert.equal(await p.evaluate(()=>window.changed),0);
 assert.equal(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),true);
 assert.deepEqual(await p.evaluate(()=>{window.dirty=false;return window.updateManager.apply()}),{ok:true});
 await p.waitForFunction(()=>window.changed>=1&&window.reloads>=1);
 const switched=await p.evaluate(async()=>{
  const r=await navigator.serviceWorker.getRegistration();
  return {waiting:!!r.waiting,active:r.active?.state,changes:window.changed};
 });
 assert.equal(switched.waiting,false);
 assert.equal(switched.active,'activated');
 await ctx.setOffline(true);
 await p.reload();
 await p.getByRole('heading',{name:'Offline test shell'}).waitFor();
 console.log('PASS SW true-origin: update waits, dirty blocks activation, user consent activates, controlled shell loads offline');
 await ctx.close();
}catch(e){failed=true;console.error(e)}finally{await browser.close();server.close();}
process.exit(failed?1:0);
