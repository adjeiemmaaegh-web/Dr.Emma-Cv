/**
 * Genuine published-site import smoke on Chromium, Firefox and WebKit.
 * No private files, LinkedIn access, deployment or mock IndexedDB.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {renderDocumentArtifact} from '../../src/features/export/export-service.mjs';
import {SYNTH_DOC} from '../documents/fixtures.mjs';

const require=createRequire(import.meta.url),pw=require('playwright');
const browserName=process.argv[2]||'chromium';
assert(['chromium','firefox','webkit'].includes(browserName),'Choose a supported browser');
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const site=path.join(base,'site');
const types={'.html':'text/html;charset=utf-8','.mjs':'text/javascript;charset=utf-8',
 '.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
 '.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json',
 '.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
 let location;
 try{location=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 const file=path.resolve(site,location==='/'?'index.html':location.slice(1));
 if(!file.startsWith(site+path.sep))return res.writeHead(403).end();
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control','no-cache');
 res.end(fs.readFileSync(file));
}).listen(0);
const origin='http://localhost:'+server.address().port;
const browser=await pw[browserName].launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage(),errors=[],remote=[],missing=[];
 page.on('pageerror',err=>errors.push(String(err)));
 page.on('request',request=>{if(!request.url().startsWith(origin))remote.push(request.url());});
 page.on('response',response=>{if(response.status()>=400)missing.push(response.url()+': '+response.status());});
 await page.goto(origin+'/');
 await page.getByLabel('Select existing CV PDF DOCX TXT or HTML').waitFor({timeout:20000});
 const document=SYNTH_DOC();
 const variant={id:'crossBrowserCV1',revision:0,name:'Test',document,appearance:{template:'modern',paper:'A4'}};
 const pdf=renderDocumentArtifact(variant,'pdf').bytes;
 await page.getByLabel('Select existing CV PDF DOCX TXT or HTML').setInputFiles({
  name:'original.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)
 });
 await page.getByRole('button',{name:'Extract selected CV for review'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Extracted locally.')||
  document.body.textContent.includes('Import is blocked')||
  document.body.textContent.includes('Not completed:'),null,{timeout:30000});
 const panel=page.locator('section[aria-label="Import an existing CV"]');
 const status=await panel.locator('[role="status"]').innerText();
 assert.match(status,/Extracted locally/,'Full selectable PDF extraction: '+status);
 const source=await panel.getByLabel('Original extracted CV text for comparison').inputValue();
 assert(source.includes('Acme Retail'),'PDF experience must remain extractable');
 assert(source.includes('Ada Example'),'PDF personal name must remain extractable');
 await panel.getByLabel('Accept imported experience[0]').check();
 await panel.locator('details').filter({has:page.locator('input[aria-label="Accept imported experience[0]"]')})
  .evaluate(n=>{n.open=true});
 page.once('dialog',dialog=>dialog.accept());
 await panel.getByRole('button',{name:'Create new CV profile from approved fields'}).click();
 await page.waitForFunction(()=>location.hash==='#/editor',{timeout:20000});
 await page.locator('details[data-sec="experience"] summary').click();
 assert.match(await page.locator('details[data-sec="experience"]').innerText(),/Acme Retail/);
 await page.reload();
 await page.getByRole('link',{name:'Edit'}).click();
 const exp=page.locator('details[data-sec="experience"]');
 if(await exp.getAttribute('open')===null)await exp.locator('summary').click();
 assert.match(await exp.innerText(),/Acme Retail/,'Imported profile must survive restart');
 await page.getByRole('link',{name:'Career tools'}).click();
 const file=page.getByLabel('Choose LinkedIn export ZIP or selected official CSV files');
 await file.setInputFiles([
  {name:'Profile.csv',mimeType:'text/csv',buffer:Buffer.from('First Name,Last Name,Headline,Summary\nAda,Example,Operations Manager,Managed teams\n')},
  {name:'Positions.csv',mimeType:'text/csv',buffer:Buffer.from('Title,Company Name,Started On,Finished On\nManager,Atlas Retail,2020,\n')}
 ]);
 await page.getByRole('button',{name:'Review selected official LinkedIn export'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('LinkedIn analysis completed locally.'));
 await page.getByRole('button',{name:'Review LinkedIn-to-CV reconstruction'}).click();
 await page.getByLabel('Accept experience[0]').check();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Create separate profile from selected fields'}).click();
 await page.waitForFunction(()=>location.hash==='#/editor');
 await page.locator('details[data-sec="experience"] summary').click();
 assert.match(await page.locator('details[data-sec="experience"]').innerText(),/Atlas Retail/);
 await page.reload();
 await page.getByRole('link',{name:'Edit'}).click();
 const saved=page.locator('details[data-sec="experience"]');
 if(await saved.getAttribute('open')===null)await saved.locator('summary').click();
 assert.match(await saved.innerText(),/Atlas Retail/,'LinkedIn review must persist after reload');
 await context.close();
 assert.deepEqual(errors,[],'JavaScript errors');
 assert.deepEqual(remote,[],'No remote CV/LinkedIn requests');
 assert.deepEqual(missing,[],'No missing public application assets');
 console.log('PASS '+browserName+' published-site selectable PDF local extraction and review');
}finally{await browser.close();server.close();}
