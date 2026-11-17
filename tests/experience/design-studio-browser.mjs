// Real Chromium coverage for the new visual editor flow; no deployment or user data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,serve} from './harness.mjs';
const {port,close}=serve({});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light',acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const base='http://localhost:'+port+'/src/features/experience/workspace/index.html?sample=1';
 await page.goto(base);
 await page.getByRole('link',{name:'Edit',exact:true}).click();
 await page.locator('.lw-page-edit[data-path="summary"]').first().waitFor();
 const repeated=page.locator('.lw-page-edit[data-path="experience[e1].description"]');
 assert.ok(await repeated.count()>1,'Sample experience description has multiple editable text lines');
 assert.equal(await repeated.evaluateAll(nodes=>nodes.filter(el=>el.tabIndex===0).length),1,
  'Long descriptions receive one keyboard stop rather than one per wrapped line');
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
 if(!(await look.evaluate(el=>el.open)))await look.locator('summary').click();
 await page.locator('input[data-appearance="bodySize"]').evaluate(el=>{
  el.value='12';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledger_workspace_preview_v1')).appearance.bodySize===12);
 await page.waitForFunction(()=>document.querySelector('.lw-page [data-path="summary"]')?.style.fontSize==='12px');
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
 // Advanced direct editing: a whole field group, not only one clipped text line.
 await page.locator('.lw-page-edit[data-path="personalInfo.name"]').first().click();
 assert.equal(await page.locator('.lw-inline-editor input').count(),2);
 await page.locator('.lw-inline-editor input').first().fill('Grace');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledger_workspace_preview_v1')).document.personalInfo.firstName==='Grace');
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.locator('.lw-page-edit[data-path="personalInfo.contact"]').first().click();
 assert.equal(await page.locator('.lw-inline-editor input').count(),5);
 await page.locator('.lw-inline-editor input').first().fill('grace@example.test');
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-page')?.innerText.includes('grace@example.test'));
 await page.locator('.lw-page-edit[data-path="experience[e1].meta"]').first().click();
 assert.equal(await page.locator('.lw-inline-editor input').count(),5);
 await page.locator('.lw-inline-editor input').nth(1).fill('Delta Retail');
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-page')?.innerText.includes('Delta Retail'));
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-page')?.innerText.includes('Acme Retail'));
 assert.equal(await page.locator('input[data-path="experience[e1].employer"]').inputValue(),'Acme Retail',
  'Undo refreshes the matching form input without reconstructing the document editor');
 // Export portable preset, clear the local design-library key, then review/import it.
 await page.getByRole('link',{name:'Templates'}).click();
 const [file]=await Promise.all([
  page.waitForEvent('download'),page.locator('.lw-saved-designs').getByRole('button',{name:'Export designs'}).click()
 ]);
 const json=fs.readFileSync(await file.path(),'utf8'),parsed=JSON.parse(json);
 assert.equal(parsed.format,'ledger-cv-appearance-library');
 assert.equal(parsed.designs.length,1);
 assert.ok(!json.includes('grace@example.test')&&!json.includes('Delta Retail'));
 await page.evaluate(()=>localStorage.removeItem('ledger_workspace_cv_designs_v1'));
 await page.reload();await page.waitForSelector('.lw-saved-designs');
 page.once('dialog',dlg=>dlg.accept());
 await page.getByLabel('Import saved designs JSON').setInputFiles({
  name:'presets.json',mimeType:'application/json',buffer:Buffer.from(json)
 });
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledger_workspace_cv_designs_v1')||'null')?.designs?.length===1);
 assert.deepEqual(errors,[]);
 console.log('PASS advanced visual editor: direct multi-field edit, undo sync, precision preview, portable design round trip');
 await context.close();
}finally{await browser.close();close();}
