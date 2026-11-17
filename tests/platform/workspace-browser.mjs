// Real HTTP-origin Chromium acceptance for the new A-backed workspace (synthetic data only).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,serve} from '../experience/harness.mjs';
const {port,close}=serve({});
const base='http://localhost:'+port+'/src/features/experience/workspace/index.html';
const browser=await chromium.launch();
let failed=false;
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const p=await ctx.newPage(),errors=[];
 p.on('dialog',d=>d.accept());
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(base);await p.waitForSelector('#page-title');
 assert.match(await p.locator('#main').innerText(),/Data, versions and recovery/);
 const before=await p.evaluate(async()=>{
  const dbs=await indexedDB.databases();
  return {dbs:dbs.map(d=>d.name),keys:Object.keys(localStorage)};
 });
 assert(before.dbs.some(x=>x==='ledger_cv_workspace_v1'));
 assert(before.dbs.includes('ledger_cv_workspace_applications_v1'));
 assert(!before.keys.some(x=>x==='ledger_cv_state_v2'));
 // Master edit requires affirmative user consent and is durable in actual IndexedDB.
 await p.getByRole('link',{name:'Edit',exact:true}).click();
 await p.getByRole('button',{name:'Confirm master editing'}).click();
 await p.getByLabel('Professional title').fill('Durable Architect');
 await p.waitForFunction(()=>document.querySelector('.lw-toolbar [role=status]')?.textContent.includes('Saved on this device'));
 await p.reload();await p.waitForSelector('#page-title');
 await p.getByRole('link',{name:'Edit',exact:true}).click();
 assert.equal(await p.getByLabel('Professional title').inputValue(),'Durable Architect');
 const p2=await ctx.newPage();p2.on('dialog',d=>d.accept());
 await p2.goto(base);await p2.waitForSelector('#page-title');
 await p2.getByRole('link',{name:'Edit',exact:true}).click();
 await p2.getByRole('button',{name:'Confirm master editing'}).click();
 assert.equal(await p2.getByLabel('Professional title').inputValue(),'Durable Architect');
 await p.getByRole('button',{name:'Confirm master editing'}).click();
 await p.getByLabel('Professional title').fill('First tab committed');
 await p.waitForFunction(()=>document.querySelector('.lw-toolbar [role=status]')?.textContent.includes('Saved on this device'));
 await p2.getByLabel('Professional title').fill('Second tab unsaved');
 await p2.waitForFunction(()=>document.querySelector('.lw-storage-warning')?.textContent.includes('Unsaved changes'));
 assert.equal(await p2.getByLabel('Professional title').inputValue(),'Second tab unsaved');
 const [draftDownload]=await Promise.all([p2.waitForEvent('download'),p2.getByRole('button',{name:'Download unsaved draft'}).click()]);
 const draft=JSON.parse(fs.readFileSync(await draftDownload.path(),'utf8'));
 assert.equal(draft.document.personalInfo.title,'Second tab unsaved');
 assert.equal(draft.format,'ledger-workspace-recovery-draft');
 await p2.getByRole('link',{name:'Open recovery controls'}).click();
 await p2.getByRole('button',{name:'Reopen saved versions'}).click();
 await p2.waitForSelector('#page-title');
 await p2.getByRole('link',{name:'Edit',exact:true}).click();
 assert.equal(await p2.getByLabel('Professional title').inputValue(),'First tab committed');
 await p2.close();
 // Manual, review-first legacy transfer with exact raw backup before import.
 await p.getByRole('link',{name:'Home'}).click();
 await p.evaluate(async()=>{
  const {SYNTH_DOC}=await import('/tests/documents/fixtures.mjs');
  localStorage.setItem('ledger_cv_state_v2',JSON.stringify({document:SYNTH_DOC(),appearance:{},versions:[]}));
  localStorage.setItem('ledger_cv_recovery_v24','INTENTIONALLY_BROKEN_JSON');
  localStorage.setItem('ledger_cv_stage6_applications_v1','[]');
 });
 const original=await p.evaluate(()=>localStorage.getItem('ledger_cv_state_v2'));
 const [profileDownload]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download saved CV backup'}).click()]);
 assert.equal(JSON.parse(fs.readFileSync(await profileDownload.path(),'utf8')).format,'ledger-career-profile-backup');
 const [appsDownload]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download application backup'}).click()]);
 assert.equal(JSON.parse(fs.readFileSync(await appsDownload.path(),'utf8')).kind,'ledger-applications');
 const [legacyDownload]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download exact legacy data backup'}).click()]);
 assert.equal(JSON.parse(fs.readFileSync(await legacyDownload.path(),'utf8')).format,'ledger-legacy-raw-backup');
 await p.getByRole('button',{name:'Review this browser’s legacy CV'}).click();
 await p.getByText(/Reviewed "My career profile"/).waitFor();
 await p.getByRole('button',{name:'Approve reviewed import'}).click();
 await p.waitForSelector('#page-title');
 await p.waitForTimeout(100);
 assert.equal(await p.evaluate(()=>localStorage.getItem('ledger_cv_state_v2')),original);
 await p.getByRole('link',{name:'Edit',exact:true}).click();
 assert.equal(await p.getByLabel('First name').inputValue(),'Ada');
 const final=await p.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ledger_cv_workspace_v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const ids=await new Promise((resolve,reject)=>{const t=db.transaction('career_profiles','readonly'),r=t.objectStore('career_profiles').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  db.close();return {ids,keys:Object.keys(localStorage)}
 });
 assert.equal(final.ids.length,2,'import makes a separate record');
 assert(!final.keys.some(k=>k==='ledger_workspace_preview_v1'),'persistent editor never writes the old preview data key');
 assert.deepEqual(errors,[],'no browser page exceptions');
 console.log('PASS Group A workspace true-origin: master consent, IndexedDB reload, two-tab conflict, draft export, review-first migration, legacy untouched');
 await ctx.close();
}catch(e){failed=true;console.error(e);}finally{await browser.close();close();}
process.exit(failed?1:0);
