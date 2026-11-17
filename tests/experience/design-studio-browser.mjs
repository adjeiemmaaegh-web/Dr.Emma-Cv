// Real Chromium coverage for the new visual editor flow; no deployment or user data.
import assert from 'node:assert/strict';
import {chromium,serve} from './harness.mjs';
const {port,close}=serve({});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const base='http://localhost:'+port+'/src/features/experience/workspace/index.html?sample=1';
 await page.goto(base);
 await page.getByRole('link',{name:'Edit',exact:true}).click();
 await page.locator('.lw-page-edit[data-path="summary"]').first().waitFor();
 // Visual, on-paper editing works independently of the form column.
 await page.locator('.lw-page-edit[data-path="summary"]').first().click();
 const direct=page.locator('.lw-inline-editor textarea');
 await direct.waitFor();
 await direct.fill('A revised summary edited on the CV page.');
 await page.waitForFunction(()=>document.querySelector('.lw-page')?.innerText.includes('A revised summary edited on the CV page.'));
 await page.getByRole('button',{name:'Done',exact:true}).click();
 assert.equal(await page.locator('.lw-inline-editor').count(),0);
 const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1')));
 assert.match(saved.document.summary,/revised summary edited on the CV page/);
 // Precision typography drives the same PDF layout as the on-screen preview.
 const look=page.locator('details.lw-sec',{has:page.locator('summary',{hasText:/Look and layout/})});
 await look.locator('summary').click().catch(()=>{});
 if(!(await look.getAttribute('open')))await look.locator('summary').click();
 await page.locator('input[data-appearance="bodySize"]').evaluate(el=>{
  el.value='12';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledger_workspace_preview_v1')).appearance.bodySize===12);
 assert.equal(await page.locator('.lw-page [data-path="summary"]').first().evaluate(el=>el.style.fontSize),'12px');
 // Hide/show is reversible and does not delete the saved CV experience records.
 const sections=page.locator('details.lw-sec',{has:page.locator('summary',{hasText:/Sections and order/})});
 await sections.locator('summary').click();
 await page.getByLabel('Show Experience').uncheck();
 await page.waitForFunction(()=>!/Experience/.test(document.querySelector('.lw-page')?.innerText||''));
 const h=JSON.parse(await page.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1')));
 assert.equal(h.document.experience.length,2);
 await page.getByLabel('Show Experience').check();
 await page.waitForFunction(()=>document.querySelector('.lw-page')?.innerText.includes('Experience'));
 // Local preset save, change, reapply, and round-trip through the gallery.
 const name=page.locator('input[aria-label="Design name"]');
 await name.fill('Studio regression layout');
 await page.getByRole('button',{name:'Save reusable design'}).click();
 const local=JSON.parse(await page.evaluate(()=>localStorage.getItem('ledger_workspace_cv_designs_v1')));
 assert.equal(local.designs.length,1);assert.equal(local.designs[0].appearance.bodySize,12);
 assert.ok(!JSON.stringify(local).includes('revised summary edited on the CV page'));
 await page.locator('input[data-appearance="bodySize"]').evaluate(el=>{
  el.value='9';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledger_workspace_preview_v1')).appearance.bodySize===9);
 await page.getByRole('link',{name:'Templates'}).click();
 const gallery=page.locator('.lw-saved-designs');
 await gallery.getByRole('button',{name:'Apply'}).click();
 await page.waitForFunction(()=>location.hash==='#/editor');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledger_workspace_preview_v1')).appearance.bodySize===12);
 assert.match(await page.locator('.lw-page').first().innerText(),/A revised summary edited on the CV page/);
 assert.deepEqual(errors,[]);
 console.log('PASS visual editor: on-paper edit, precise appearance, hidden/revealed section and reusable preset');
 await context.close();
}finally{await browser.close();close();}
