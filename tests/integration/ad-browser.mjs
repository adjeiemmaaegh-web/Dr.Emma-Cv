#!/usr/bin/env node
/** True HTTP-origin Chromium check: A composition mounts B; A-D journey writes real IndexedDB. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const MIME={'.html':'text/html','.mjs':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{
 try{
  const address=decodeURIComponent(req.url.split('?')[0]);
  const pathname=path.resolve(ROOT,'.'+address);
  if(!pathname.startsWith(ROOT+path.sep)||!fs.statSync(pathname).isFile())throw Error('Unavailable');
  res.writeHead(200,{'content-type':MIME[path.extname(pathname)]||'text/plain'});res.end(fs.readFileSync(pathname));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:980,height:720}});
 const page=await context.newPage(),errors=[],remote=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:'))remote.push(request.url());});
 const url='http://127.0.0.1:'+server.address().port+'/development/integration/ad-workbench.html';
 await page.goto(url,{waitUntil:'load'});
 await page.evaluate(()=>localStorage.setItem('ledger_cv_state_v2','synthetic legacy sentinel'));
 await page.getByRole('button',{name:'Run synthetic A–D workflow'}).click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('PASS synthetic A-D workflow'),{timeout:30000});
 const evidence=JSON.parse(await page.locator('#results').innerText());
 assert.equal(evidence.applicationStatus,'Applied');assert.equal(evidence.letterErrors,0);
 await page.getByRole('button',{name:'Open connected CV editor'}).click();
 await page.waitForSelector('.ledger-route-slot .cv-editor');
 await page.getByLabel('First name').fill('Synthetic Edit');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cv-editor [role=status]')?.textContent==='Saved.');
 assert.equal(await page.evaluate(()=>localStorage.getItem('ledger_cv_state_v2')),'synthetic legacy sentinel');
 await page.reload({waitUntil:'load'});
 await page.getByRole('button',{name:'Reopen saved synthetic profile'}).click();
 await page.waitForSelector('.ledger-route-slot .cv-editor');
 assert.equal(await page.getByLabel('First name').inputValue(),'Synthetic Edit');
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 console.log('PASS A-D true browser origin: profile → PDF/DOCX → ATS/job → tailored CV → letter → application → restore → live editor reload');
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
