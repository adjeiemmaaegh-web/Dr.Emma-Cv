// Real-browser check of the Stage 5 editor feature. Run: node tests/documents/editor-browser.mjs
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const page_html=`<!doctype html><meta charset=utf-8><body><div id=app></div><script type=module>
import {createFeatureRegistry} from '/src/core/feature-registry.mjs';
import {editorFeature} from '/src/features/editor/editor-module.mjs';
import {SYNTH_DOC} from '/tests/documents/fixtures.mjs';
window.saved=[];window.failSave=false;
const reg=createFeatureRegistry();reg.register(editorFeature);
await reg.mount('cv-editor',{host:{element:document.getElementById('app')},services:{documentSource:{
 load:()=>({document:SYNTH_DOC(),appearance:{}}),
 save:async v=>{if(window.failSave)throw new Error('quota exceeded');window.saved.push(v);}}}});
window.reg=reg;window.ready=true;</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/')return res.writeHead(200,{'content-type':'text/html'}).end(page_html);
 const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));
 if(!f.startsWith(root)||!fs.existsSync(f))return res.writeHead(404).end();
 res.writeHead(200,{'content-type':'text/javascript'}).end(fs.readFileSync(f));
}).listen(0);
const port=server.address().port;
const browser=await chromium.launch();let failed=false;
try{
 for(const vp of [{width:320,height:700},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport:vp}),page=await ctx.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith('http://localhost:'+port))requests.push(r.url());});
  await page.goto('http://localhost:'+port+'/');await page.waitForFunction(()=>window.ready);
  assert.equal(await page.locator('.cv-preview section').count(),1);
  assert((await page.locator('.cv-preview').innerText()).includes('Operations Manager | Acme Retail'));
  await page.getByLabel('First name').fill('Grace');
  assert.match(await page.locator('.cv-preview').innerText(),/GRACE EXAMPLE|Grace Example/i);
  assert.equal(await page.getByLabel('First name').evaluate(e=>e===document.activeElement),true,'typing must keep focus');
  // keyboard-only reorder
  await page.getByRole('button',{name:'Move experience 2 up'}).focus();await page.keyboard.press('Enter');
  const text=await page.locator('.cv-preview').innerText();assert(text.indexOf('Supervisor | Bolt Stores')<text.indexOf('Operations Manager | Acme Retail'));
  // remove + undo restores content
  await page.getByRole('button',{name:/Remove experience 1/}).click();assert(!(await page.locator('.cv-preview').innerText()).includes('Bolt Stores'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert((await page.locator('.cv-preview').innerText()).includes('Bolt Stores'));
  // template + paper switching keeps content
  await page.getByLabel('Template').selectOption('prestige');await page.getByLabel('Paper size').selectOption('Letter');
  assert((await page.locator('.cv-preview').innerText()).includes('Acme Retail'));
  // save success, then explicit failure state that keeps edits
  await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>window.saved.length===1);
  assert.equal(await page.evaluate(()=>window.saved[0].appearance.paper),'Letter');
  await page.evaluate(()=>{window.failSave=true});await page.getByLabel('Summary').fill('edited after failure');await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>/Not saved/.test(document.querySelector('[role=status]').textContent));
  assert((await page.locator('.cv-preview').innerText()).includes('edited after failure'));
  // no horizontal overflow
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'horizontal overflow at '+vp.width);
  // unmount cleans up
  await page.evaluate(()=>window.reg.unmount('cv-editor'));assert.equal(await page.locator('.cv-editor').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[],'no external requests');
  await ctx.close();console.log('PASS editor at',vp.width+'px');
 }
}catch(e){failed=true;console.error(e);}finally{await browser.close();server.close();}
process.exit(failed?1:0);
