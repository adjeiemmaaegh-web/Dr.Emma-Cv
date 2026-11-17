// Real-browser checks of the Stage 18 status panel + Stage 17 audit. Run: node tests/experience/pwa-browser.mjs
import assert from 'node:assert/strict';
import {chromium,serve,shell,fmt} from './harness.mjs';
import {tabReachability} from '../../src/features/accessibility/a11y-audit.mjs';
const page_html=shell(`
import {createFeatureRegistry} from '/src/core/feature-registry.mjs';
import {pwaStatusFeature} from '/src/features/pwa-ui/pwa-status-module.mjs';
import {createUpdateManager} from '/src/features/pwa-ui/update-manager.mjs';
const q=new URLSearchParams(location.search);
window.downloads=0;window.dirty=q.get('dirty')==='1';
const reg=new EventTarget();reg.waiting=q.get('update')?{posted:[],postMessage(m){this.posted.push(m);}}:null;window.fakeReg=reg;
const sw=new EventTarget();sw.controller={};
const listeners=new Set();
const um=createUpdateManager({registration:reg,serviceWorker:sw,hasUnsavedWork:()=>window.dirty,onChange:()=>listeners.forEach(f=>f()),reload:()=>{window.reloaded=(window.reloaded||0)+1;}});
const bs={lastBackupAt:q.get('old')?Date.now()-30*864e5:undefined,changedSinceBackup:true,optedIn:false,setOptedIn(v){bs.optedIn=v;}};
const env={navigator:{onLine:q.get('offline')?false:true,serviceWorker:{},storage:{estimate:async()=>({usage:q.get('full')?96e6:2e6,quota:100e6}),persisted:async()=>false,persist:async()=>true}},
 location:{protocol:q.get('file')?'file:':'https:'},localStorage:window.localStorage,isSecureContext:true,standalone:false,window};
const reg2=createFeatureRegistry();reg2.register(pwaStatusFeature);
await reg2.mount('pwa-status',{host:{element:document.getElementById('app')},services:{env,backupState:bs,updateManager:um,onUpdateChange:f=>{listeners.add(f);return()=>listeners.delete(f);},
 backup:{export:async()=>{window.downloads++;}},offlineReady:!!q.get('ready'),lastWriteError:q.get('quota')?'QUOTA':null,install:{promptAvailable:false}}});
window.reg=reg2;window.ready=true;`);
const {port,close}=serve({'/':page_html});
const browser=await chromium.launch();let failed=false;
const audit=async(page,label)=>{
 const r=await page.evaluate(async()=>(await import('/src/features/accessibility/a11y-audit.mjs')).auditAccessibility(document.getElementById('app')));
 const bad=r.findings.filter(f=>f.severity!=='info');assert.equal(bad.length,0,'a11y at '+label+':\n'+fmt(bad));
 const t=await tabReachability(page,'#app');assert.deepEqual([t.unreached,t.noFocusIndicator],[[],[]],'keyboard at '+label);
};
const open=async(ctx,qs)=>{const p=await ctx.newPage();await p.goto('http://localhost:'+port+'/?'+qs);await p.waitForFunction(()=>window.ready);return p;};
try{
 for(const vp of [{width:320,height:640},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport:vp}),w=vp.width+'px';
  let p=await open(ctx,'ready=1');const text=()=>p.locator('#app').innerText();
  assert.match(await text(),/may delete this data if the device runs low on space/);assert.match(await text(),/saved on this device and will also work offline/);
  assert.match(await text(),/Use your browser menu/);assert.doesNotMatch(await text(),/Update now/);await audit(p,'normal '+w);
  await p.getByRole('button',{name:'Ask the browser to keep my data'}).click();
  await p.getByRole('button',{name:'Download a backup'}).last().click();await p.waitForFunction(()=>window.downloads===1);
  await p.getByLabel(/Remind me to download a backup/).check();assert.match(await text(),/Backups are the only way|You have not downloaded/);
  p=await open(ctx,'quota=1&full=1&file=1&offline=1');
  assert.match(await text(),/out of space/);assert.match(await text(),/almost full/);assert.match(await text(),/exact file location/);assert.match(await text(),/cannot be installed/);assert.match(await text(),/appear to be offline/);
  assert.equal(await p.locator('[role=alert]').first().innerText().then(t=>/Action needed/.test(t)),true);
  await audit(p,'critical '+w);
  // update flow: blocked by unsaved work, then allowed
  p=await open(ctx,'update=1&dirty=1');assert.match(await text(),/An update is ready/);await audit(p,'update '+w);
  await p.getByRole('button',{name:'Update now'}).click();
  assert.match(await text(),/Save your changes before updating/);assert.equal(await p.evaluate(()=>window.fakeReg.waiting.posted.length),0,'unsaved work blocks activation');
  await p.evaluate(()=>{window.dirty=false});await p.getByRole('button',{name:'Update now'}).click();
  assert.deepEqual(await p.evaluate(()=>window.fakeReg.waiting.posted),[{type:'SKIP_WAITING'}]);assert.match(await text(),/Updating/);
  p=await open(ctx,'update=1');await p.getByRole('button',{name:'Remind me later'}).click();assert.match(await text(),/will not be applied until you choose/);
  assert.equal(await p.evaluate(()=>window.fakeReg.waiting.posted.length),0);
  p=await open(ctx,'old=1');await p.getByLabel(/Remind me to download a backup/).check();assert.match(await text(),/last backup was 30 days ago/);
  await p.evaluate(()=>window.reg.unmount('pwa-status'));assert.equal(await p.locator('.ledger-pwa').count(),0);
  await ctx.close();console.log('PASS pwa-status + a11y audit at',w);
 }
}catch(e){failed=true;console.error(e);}finally{await browser.close();close();}
process.exit(failed?1:0);
