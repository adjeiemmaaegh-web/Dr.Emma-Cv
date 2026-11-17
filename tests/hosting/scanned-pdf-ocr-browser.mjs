/**
 * Real offline English OCR proof against a synthetic image-only PDF.
 * No mocking PDF.js/Tesseract, no real CV data, no CDN or external requests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const site=path.join(root,'site');
const types={'.mjs':'text/javascript;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8',
 '.wasm':'application/wasm','.traineddata':'application/octet-stream','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}
 catch{return res.writeHead(400).end()}
 const filename=path.resolve(site,pathname==='/'?'index.html':pathname.slice(1));
 if(!filename.startsWith(site+path.sep))return res.writeHead(403).end();
 if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');
 res.end(fs.readFileSync(filename));
}).listen(0);
const origin='http://localhost:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:900,height:1000}});
 const printPage=await ctx.newPage();
 await printPage.setContent('<!doctype html><html><body style="margin:0"><canvas id="scan" width="900" height="1100"></canvas></body></html>');
 await printPage.evaluate(()=>{
  const c=document.getElementById('scan'),g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#000';
  g.textBaseline='top';g.font='bold 44px Arial';g.fillText('Ada Example',55,60);
  g.font='30px Arial';
  ['ada@example.test','Professional Experience','Operations Manager at Atlas Retail',
   'Jan 2020 - Present','Managed teams and coordinated stock checks',
   'Education','Bachelor of Business','Skills','Scheduling and customer service'].forEach((line,i)=>g.fillText(line,55,155+i*76));
 });
 const scannedPdf=await printPage.pdf({format:'A4',printBackground:true});
 await printPage.close();
 const page=await ctx.newPage(),errors=[],unexpected=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('request',request=>{const u=request.url();if(!u.startsWith(origin)&&!(u.startsWith('blob:')&&new URL(u).origin===origin))unexpected.push(u)});
 await page.goto(origin+'/');
 const panel=page.locator('section[aria-label="Import an existing CV"]');
 await panel.getByLabel('Select existing CV PDF DOCX TXT or HTML').setInputFiles({
  name:'scanned-synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(scannedPdf)
 });
 await panel.getByRole('button',{name:'Extract selected CV for review'}).click();
 await page.waitForFunction(()=>document.querySelector('section[aria-label="Import an existing CV"] [role="status"]')?.textContent.includes('Import is blocked'),null,{timeout:30000});
 const source=await panel.getByLabel('Original extracted CV text for comparison').inputValue();
 assert(!source.includes('Atlas Retail'),'The source must truly be a scanned image without selectable resume text');
 const button=panel.getByRole('button',{name:'Try trained English OCR for unreadable PDF pages — offline'});
 await button.waitFor({timeout:30000});
 page.once('dialog',dialog=>dialog.accept());
 await button.click();
 await page.waitForFunction(()=>{
  const n=document.querySelector('section[aria-label="Import an existing CV"] [role="status"]');
  return /Opt-in English OCR completed locally|OCR could not recover|Not completed:/.test(n?.textContent||'');
 },null,{timeout:150000});
 const status=await panel.locator('[role="status"]').first().innerText();
 assert.match(status,/Opt-in English OCR completed locally/,status);
 const recognized=await panel.getByLabel('Original extracted CV text for comparison').inputValue();
 assert.match(recognized,/Ada|Example/i,'OCR must recognize a synthetic printed name');
 assert.match(recognized,/Atlas|Retail|Operations/i,'OCR must recognize role/employer wording');
 assert(await panel.getByLabel('Accept imported personalInfo.name').count()>0,'OCR cannot silently approve a user field');
 assert(!unexpected.length,'No remote/OCR service request: '+unexpected.join(', '));
 assert.deepEqual(errors,[],'No browser JavaScript errors');
 console.log('PASS genuine offline-trained English OCR on a local image-only PDF',JSON.stringify({
  pdfBytes:scannedPdf.length,recognizedCharacters:recognized.length,
  status:'review-required; zero automatic edits',model:'tesseract-wasm@0.11.0 / pinned English traineddata'
 }));
 await ctx.close();
}finally{await browser.close();server.close();}
