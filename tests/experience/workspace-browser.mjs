// Real-browser test of the composed workspace. Run: node tests/experience/workspace-browser.mjs [screenshotDir]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,serve,fmt,root} from './harness.mjs';
import {tabReachability} from '../../src/features/accessibility/a11y-audit.mjs';
const shots=process.argv[2];if(shots)fs.mkdirSync(shots,{recursive:true});
const {port,close}=serve({});
const base='http://localhost:'+port+'/src/features/experience/workspace/index.html';
const browser=await chromium.launch();let failed=false;
const audit=async(page,label)=>{
 const r=await page.evaluate(async()=>(await import('/src/features/accessibility/a11y-audit.mjs')).auditAccessibility(document.getElementById('app')));
 const bad=r.findings.filter(f=>f.severity!=='info');assert.equal(bad.length,0,'a11y at '+label+':\n'+fmt(bad.slice(0,10)));
 const t=await tabReachability(page,'#app');assert.deepEqual([t.unreached,t.noFocusIndicator],[[],[]],'keyboard at '+label+' '+JSON.stringify(t));
};
const VIEWS=['home','editor','templates','check','jobs','career'];
try{
 for(const [vp,name] of [[{width:390,height:844},'phone'],[{width:820,height:1100},'tablet'],[{width:1440,height:900},'desktop']])
  for(const scheme of ['light','dark']){
   const ctx=await browser.newContext({viewport:vp,colorScheme:scheme,deviceScaleFactor:1}),page=await ctx.newPage(),errors=[],reqs=[];
   page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith('http://localhost:'+port))reqs.push(r.url());});
   await page.goto(base+'?sample=1');await page.waitForSelector('#page-title');
   assert.equal(await page.locator('.lw').getAttribute('data-theme'),scheme);
   for(const v of VIEWS){
    await page.evaluate(h=>{location.hash=h;},'#/'+v);await page.waitForFunction(h=>document.querySelector('[aria-current=page]')?.getAttribute('href')==='#/'+h,v);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'page-title','focus moves to the page heading on navigation ('+v+')');
    if(v==='editor'||v==='templates')await page.waitForFunction(()=>document.querySelector('.lw-page span,.lw-thumb b'));
    if(v==='check'){
     const register=page.locator('details').filter({hasText:'27 published categories/checks'});
     assert.equal(await register.count(),1,'27-check coverage disclosure visible');
     await register.locator('summary').click();
     assert.equal(await register.locator('h3').count(),7,'seven reference categories');
     assert.equal(await register.locator('section ul > li').count(),27,'exact 27 disclosures');
     assert.match(await register.innerText(),/Not verified|Input needed/,'unsupported checks stay labelled');
    }
    await audit(page,`${v} ${name} ${scheme}`);
    if(shots)await page.screenshot({path:`${shots}/${v}-${name}-${scheme}.png`,fullPage:name!=='desktop'&&v!=='editor'});
   }
   assert.deepEqual(errors,[],name+' '+scheme);assert.deepEqual(reqs,[],'no external requests');
   await ctx.close();console.log('PASS audit',name,scheme);
  }
 /* ---- behaviour ---- */
 const dl=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true}),p=await dl.newPage();
 await p.goto(base+'?sample=1');await p.waitForSelector('#page-title');
 await p.getByRole('link',{name:'Edit',exact:true}).click();await p.waitForSelector('.lw-page span');
 const page1=()=>p.locator('.lw-page').first().innerText();
 const until=async(cond,msg)=>{for(let i=0;i<40;i++){if(cond(await page1()))return;await p.waitForTimeout(50);}assert.fail(msg);};
 assert.match(await page1(),/Operations Manager/);
 // editing updates the faithful preview and autosaves
 await p.getByLabel('Professional title').fill('Store Director');await p.waitForFunction(()=>/Store Director/.test(document.querySelector('.lw-page').innerText));
 await p.waitForFunction(()=>/Saved on this device/.test(document.querySelector('.lw-toolbar [role=status]').textContent));
 assert(JSON.parse(await p.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1'))).document.personalInfo.title==='Store Director');
 assert.equal(await p.evaluate(()=>Object.keys(localStorage).filter(k=>!k.startsWith('ledger_workspace_preview')).length),0,'workspace never touches other storage keys');
 await p.getByRole('button',{name:'Undo',exact:true}).click();await p.waitForFunction(()=>/Operations Manager/.test(document.querySelector('.lw-page').innerText)&&!/Store Director/.test(document.querySelector('.lw-page').innerText));
 // reorder with keyboard-reachable buttons, remove + undo
 await p.locator('summary',{hasText:/^Experience/}).click();
 await p.getByRole('button',{name:'Move Supervisor at Bolt Stores up'}).click();
 await until(t=>t.indexOf('Supervisor | Bolt')>=0&&t.indexOf('Supervisor | Bolt')<t.indexOf('Operations Manager | Acme'),'reorder shows in preview');
 await p.getByRole('button',{name:/Remove Supervisor at Bolt Stores/}).click();await until(t=>!t.includes('Bolt Stores'),'removed entry leaves preview');
 await p.getByRole('button',{name:'Undo',exact:true}).click();await until(t=>t.includes('Bolt Stores'),'undo restores entry');
 // skills
 await p.locator('summary',{hasText:/^Skills/}).click();await p.getByLabel('Add a skill').fill('Budgeting');await p.keyboard.press('Enter');
 await p.waitForFunction(()=>/Budgeting/.test(document.querySelector('.lw-page').innerText));
 // Passport photo upload: convert locally to JPEG, show/hide, export and remove.
 const png=await p.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=70;canvas.height=90;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#809eb7';ctx.fillRect(0,0,70,90);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 await p.locator('#lw-passport-photo').setInputFiles({
  name:'sample-portrait.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')
 });
 await p.waitForFunction(()=>document.querySelector('.lw-page img.lw-passport-on-page'));
 assert.match(await p.locator('.lw-passport-file-preview').getAttribute('src'),/^data:image\/jpeg;base64,/);
 assert.equal(await p.locator('#lw-show-passport-photo').isChecked(),true);
 await p.locator('#lw-show-passport-photo').uncheck();
 await p.waitForFunction(()=>!document.querySelector('.lw-page img.lw-passport-on-page'));
 await p.locator('#lw-show-passport-photo').check();
 await p.waitForFunction(()=>document.querySelector('.lw-page img.lw-passport-on-page'));
 assert.match(await p.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1')),/data:image\/jpeg;base64,/);

 // paper switch keeps content and changes page size
 const w0=await p.locator('.lw-pageslot').first().evaluate(e=>e.getBoundingClientRect().width);
 await p.getByRole('button',{name:'Letter'}).click();await p.waitForTimeout(150);assert.notEqual(await p.locator('.lw-pageslot').first().evaluate(e=>Math.round(e.getBoundingClientRect().width)),Math.round(w0)===0?-1:-2);
 // export downloads a real file
 const [d]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'PDF'}).click()]);
 assert.match(d.suggestedFilename(),/Ada_Example_CV\.pdf/);const head=fs.readFileSync(await d.path()).subarray(0,5).toString();assert.equal(head,'%PDF-');assert(fs.readFileSync(await d.path()).toString('latin1').includes('/Subtype /Image'),'PDF contains photo');
 const [d2]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Word'}).click()]);assert.match(d2.suggestedFilename(),/\.docx$/);assert.equal(fs.readFileSync(await d2.path()).subarray(0,2).toString(),'PK');
 assert(fs.readFileSync(await d2.path()).includes(Buffer.from('passport-photo.jpg')),'Word contains portrait');
 await p.getByRole('button',{name:'Remove photo'}).click();
 await p.waitForFunction(()=>!document.querySelector('.lw-page img.lw-passport-on-page'));
 assert.equal(await p.locator('#lw-show-passport-photo').isDisabled(),true);
 // templates keep content
 await p.getByRole('link',{name:'Templates'}).click();await p.waitForSelector('.lw-thumb b');
 assert.equal(await p.locator('.lw-tpl').count(),38);
 await p.locator('.lw-tpl',{has:p.locator('strong',{hasText:/^Executive$/})}).click();await p.waitForFunction(()=>document.querySelector('.lw-tpl[aria-pressed=true] strong')?.textContent==='Executive');
 await p.locator('.lw-seg[aria-label="Filter by style"] button',{hasText:'Technical'}).click();assert((await p.locator('.lw-tpl').count())>=5&&(await p.locator('.lw-tpl').count())<30);
 await p.getByRole('link',{name:'Edit',exact:true}).click();await p.waitForSelector('.lw-page span');assert.match(await page1(),/Budgeting/);
 // check -> go to field
 await p.getByRole('link',{name:'Check'}).click();await p.waitForSelector('.lw-finding');
 assert.match(await p.locator('#main').innerText(),/not a score/);
 await p.evaluate(()=>{location.hash='#/editor';});await p.waitForSelector('.lw-page span');await p.getByLabel('Phone').fill('');
 await p.getByRole('link',{name:'Check'}).click();await p.getByRole('button',{name:'Go to field'}).first().click();
 await p.waitForFunction(()=>document.activeElement?.dataset?.path);assert.match(await p.evaluate(()=>document.activeElement.dataset.path),/personalInfo|summary|experience/);
 // jobs: add, validation, move, delete
 await p.getByRole('link',{name:'Jobs'}).click();await p.getByRole('button',{name:'Add application'}).click();
 await p.getByRole('button',{name:'Add',exact:true}).click();assert.match(await p.locator('dialog[open] [role=alert]').innerText(),/Company or role required/);
 await p.getByLabel('Company').fill('Acme');await p.getByLabel('Job title').fill('Manager');await p.getByLabel(/Link to the advert/).fill('javascript:alert(1)');
 await p.getByRole('button',{name:'Add',exact:true}).click();assert.match(await p.locator('dialog[open] [role=alert]').innerText(),/http/);
 await p.getByLabel(/Link to the advert/).fill('');await p.getByRole('button',{name:'Add',exact:true}).click();await p.waitForSelector('.lw-appcard');
 await p.getByLabel('Move Acme to another stage').selectOption('Applied');await p.waitForFunction(()=>document.querySelector('#c-Applied').parentElement.querySelector('.lw-appcard'));
 // command palette by keyboard
 await p.keyboard.press('Control+k');await p.waitForSelector('dialog[open]');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('role')),'combobox');
 await p.keyboard.type('temp');await p.keyboard.press('Enter');await p.waitForFunction(()=>location.hash==='#/templates');
 await p.keyboard.press('Control+k');await p.keyboard.type('zzzz');assert.match(await p.locator('dialog[open]').innerText(),/No matching/);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
 // theme toggle persists across reload
 await p.getByRole('button',{name:'Dark mode'}).click();const t1=await p.locator('.lw').getAttribute('data-theme');await p.reload();await p.waitForSelector('#page-title');assert.equal(await p.locator('.lw').getAttribute('data-theme'),t1);
 await dl.close();
 // empty state (no sample): guided start is the way in
 const e=await browser.newContext({viewport:{width:390,height:844}}),q=await e.newPage();await q.goto(base);await q.waitForSelector('#page-title');
 assert.match(await q.locator('h1').innerText(),/build your CV/);await q.getByRole('button',{name:'Create a CV'}).waitFor();
 await q.evaluate(()=>{location.hash='#/check';});assert.match(await q.locator('#main').innerText(),/Nothing to check yet/);await e.close();
 // Community centre use: a normal CV remains unchanged, while a private session
 // starts blank and never writes private edits/drafts to the browser's saved CV.
 const pc=await browser.newContext({viewport:{width:390,height:844}}),pp=await pc.newPage();
 pp.on('dialog',dialog=>dialog.accept());
 await pp.goto(base+'?sample=1');await pp.getByRole('link',{name:'Edit',exact:true}).click();
 await pp.getByLabel('First name').fill('Previously Saved');
 const saved=await pp.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1'));
 assert.match(saved,/Previously Saved/);
 await pp.goto(base+'?private=1');await pp.waitForSelector('#page-title');
 assert.match(await pp.locator('#page-title').innerText(),/Private CV session/);
 assert.match(await pp.locator('.lw-storage-warning').innerText(),/no automatic saving/i);
 await pp.getByLabel('Application country').selectOption('uae');
 assert.match(await pp.locator('.lw-community-tips').innerText(),/Emirates ID/);
 await pp.getByRole('button',{name:'Create a CV'}).click();
 assert.equal(await pp.evaluate(()=>localStorage.getItem('ledger_workspace_preview_draft_v1')),null,
  'starting a private guided journey must not save a browser draft');
 assert.equal(await pp.getByRole('link',{name:'Start a private session'}).count(),0);
 await pp.getByRole('link',{name:'Edit',exact:true}).click();
 assert.equal(await pp.getByLabel('First name').inputValue(),'');
 await pp.getByLabel('First name').fill('Temporary Person');
 assert.match(await pp.locator('.lw-toolbar [role=status]').innerText(),/Not saved.*private session/i,
  'private editor must not claim persistence');
 await pp.getByLabel('Design name').fill('Temporary layout');
 await pp.getByRole('button',{name:'Save reusable design'}).click();
 assert.match(await pp.locator('.lw-toasts').innerText(),/private session/i);
 assert.deepEqual(await pp.evaluate(()=>Object.keys(localStorage)),['ledger_workspace_preview_v1'],
  'private design presets must not create localStorage records');
 assert.equal(await pp.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1')),saved,
  'private edits never overwrite an earlier locally saved CV');
 assert.equal(await pp.evaluate(()=>localStorage.getItem('ledger_workspace_preview_draft_v1')),null,
  'private guided drafts do not use persistent browser storage');
 await pp.reload();await pp.getByLabel('First name').waitFor();
 assert.equal(await pp.getByLabel('First name').inputValue(),'','private edits disappear on reload');
 assert.equal(await pp.evaluate(()=>localStorage.getItem('ledger_workspace_preview_v1')),saved);
 await pc.close();
 console.log('PASS workspace behaviour');
}catch(e){failed=true;console.error(e);}finally{await browser.close();close();}
process.exit(failed?1:0);
