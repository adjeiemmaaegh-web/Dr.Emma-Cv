// Test the final site/ output itself over a browser origin, not source URLs.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),site=path.join(root,'site');
const types={'.html':'text/html;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 const relative=pathname==='/'?'index.html':pathname.slice(1);
 const file=path.resolve(site,relative);
 if(!file.startsWith(site+path.sep)&&file!==site)return res.writeHead(403).end();
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
 res.setHeader('Cache-Control','no-cache');
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
}).listen(0);
const port=server.address().port,origin='http://localhost:'+port;
const browser=await chromium.launch();let failed=false;
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await ctx.newPage(),errors=[],remote=[],missing=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',q=>{if(!q.url().startsWith(origin))remote.push(q.url())});
 page.on('response',r=>{if(r.status()>=400)missing.push(r.url()+': '+r.status())});
 await page.goto(origin+'/');
 try{await page.getByRole('link',{name:'Career tools'}).waitFor({timeout:15000});}
 catch(e){throw new Error('Workspace navigation did not mount: '+e.message+'; pageErrors='+JSON.stringify(errors)+'; missing='+JSON.stringify(missing)+'; remote='+JSON.stringify(remote));}
 assert.equal(await page.locator('nav[aria-label="Main"] a').count(),6);
 assert.match(await page.title(),/Ledger CV Studio/);
 await page.getByRole('link',{name:'Career tools'}).click();
 await page.getByLabel('Job title').fill('Retail manager');
 await page.getByLabel('Employer').fill('Example Stores');
 await page.getByLabel('Job advert text').fill('Retail manager\nRequirements\n- Store operations\n- Stock control');
 await page.getByRole('button',{name:'Analyse and save vacancy'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Vacancy analysed.'));
 await page.reload();await page.getByRole('link',{name:'Career tools'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Example Stores'));
 assert.equal(await page.getByLabel('Employer').inputValue(),'Example Stores');
 await page.getByLabel('Story title').fill('Stock review');
 await page.getByLabel('Situation — what actually happened?').fill('Stock entries were inconsistent.');
 await page.getByLabel('Task — what were you responsible for?').fill('Check inventory.');
 await page.getByLabel('Action — what did you personally do?').fill('I compared receipts and counted products.');
 await page.getByLabel('Result — what happened (only true outcomes)?').fill('The ledger was corrected.');
 await page.getByRole('button',{name:'Save STAR story'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('STAR story Saved locally'));
 await page.waitForTimeout(120); // Let the parent mutation lock release after the visible save status.
 await page.getByLabel('Your answer to the selected question').fill('We delivered 777% improvement.');
 await page.getByRole('button',{name:'Check my answer'}).click();
 try{await page.waitForFunction(()=>document.body.textContent.includes('Check this claim'),null,{timeout:8000});}
 catch(e){throw new Error('Coaching feedback did not render: '+e.message+'; careerText='+(await page.locator('.lw-career').innerText()).slice(-2800)+'; feedbackStatus='+(await page.locator('.lw-career [role="status"]').first().textContent())+'; pageErrors='+JSON.stringify(errors));}
 await page.getByRole('button',{name:'Save answer and coaching review'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('1 saved practice answer reviews'));
 await page.getByLabel('Source title').fill('Example corporate news');
 await page.getByLabel('Public HTTPS source link').fill('https://example.org/news');
 await page.getByLabel('Exact relevant excerpt (from source)').fill('The company opened another store.');
 await page.getByLabel('I opened and reviewed this source').check();
 await page.getByRole('button',{name:'Add reviewed research source'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('The company opened another store.'));
 assert.equal(await page.getByRole('link',{name:'View source'}).getAttribute('href'),'https://example.org/news');
 for(const format of ['PDF','DOCX']){
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download interview workbook '+format}).click();
  const file=await downloadPromise;
  assert.equal(file.suggestedFilename(),'interview-workbook.'+format.toLowerCase());
 }
 await page.reload();await page.getByRole('link',{name:'Career tools'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Example corporate news'));
 assert.match(await page.locator('.lw-career').innerText(),/1 saved practice answer reviews/);

 await page.getByRole('button',{name:'Start cover letter draft'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Cover letter draft created.'));
 await page.getByRole('button',{name:'Save application and link CV'}).click();
 await page.waitForFunction(()=>location.hash==='#/jobs');
 assert.match(await page.locator('.lw-board').innerText(),/Example Stores/);
 const reg=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return r.scope});
 assert(reg.startsWith(origin),'Worker must register only for this origin');
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await ctx.setOffline(true);
 await page.goto(origin+'/#/home',{waitUntil:'domcontentloaded'});
 await page.getByRole('link',{name:'Career tools'}).waitFor();
 assert.equal((await page.locator('a[href="#/career"]').count()),1);
 await ctx.setOffline(false);
 assert.deepEqual(errors,[],'No page errors');
 assert.deepEqual(remote,[],'No unexpected remote requests');
 assert.deepEqual(missing,[],'All hosted modules resolved without 4xx');
 const classic=await page.request.get(origin+'/legacy/index.html');
 assert.equal(classic.status(),200);
 assert((await classic.body()).byteLength>10000000);
 console.log('PASS final Vercel site/ advanced interview, sources, workbook exports, offline job flow, persistence and classic E31 route');
 await ctx.close();
}catch(e){failed=true;console.error(e)}finally{await browser.close();server.close();}
process.exit(failed?1:0);
