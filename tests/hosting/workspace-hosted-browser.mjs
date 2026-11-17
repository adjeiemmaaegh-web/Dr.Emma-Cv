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
 await page.getByRole('link',{name:'Career tools'}).waitFor();
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
 console.log('PASS final Vercel site/ A-E workspace online/offline job flow, persistence and classic E31 route');
 await ctx.close();
}catch(e){failed=true;console.error(e)}finally{await browser.close();server.close();}
process.exit(failed?1:0);
