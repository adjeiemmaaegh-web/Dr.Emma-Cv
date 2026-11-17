/**
 * Stage F20 actual emitted hosted site. Uses invented CV/job data only.
 * Run with F20_BROWSER=chromium|firefox|webkit; intended for supported browser CI.
 * Never uses external host, private credentials or test scraping.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url),playwright=require('playwright');
const engine=process.env.F20_BROWSER||'chromium',type=playwright[engine];
if(!['chromium','firefox','webkit'].includes(engine)||!type)throw Error('Unsupported F20 engine');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const site=path.join(root,'site');
assert(fs.existsSync(path.join(site,'site-integrity.json')),'F20 requires actual built site/');
const MIME={'.html':'text/html;charset=UTF-8','.mjs':'text/javascript;charset=UTF-8',
 '.js':'text/javascript;charset=UTF-8','.css':'text/css;charset=UTF-8',
 '.json':'application/json','.webmanifest':'application/manifest+json',
 '.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost');}catch{return res.writeHead(400).end()}
 const rel=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
 const absolute=path.resolve(site,rel);
 if(!absolute.startsWith(site+path.sep))return res.writeHead(403).end();
 if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())return res.writeHead(404).end();
 res.writeHead(200,{'Content-Type':MIME[path.extname(absolute)]||'application/octet-stream',
  'Cache-Control':'no-cache'}).end(fs.readFileSync(absolute));
}).listen(0);
const origin='http://localhost:'+server.address().port;
const browser=await type.launch(),issues=[],checks=[],metrics={},t0=performance.now();
const PASS=name=>{checks.push(name);console.log('PASS F20 '+engine+' '+name)};
let failed=false;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage(),errors=[],remote=[],missing=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith(origin))remote.push(r.url())});
 page.on('response',r=>{if(r.status()>=400)missing.push(r.url()+' '+r.status())});
 const started=performance.now();
 await page.goto(origin+'/',{waitUntil:'load'});
 await page.getByRole('link',{name:'Career tools'}).waitFor();
 metrics.initialBootMs=Math.round(performance.now()-started);
 const expected=['Home','Edit','Templates','Check','Jobs','Career tools'];
 for(const name of expected)assert.equal(await page.getByRole('link',{name,exact:true}).count(),1);
 PASS('six integrated A-E navigation routes');
 const audit=async()=>{
  const findings=await page.evaluate(async()=>{
   const {auditAccessibility}=await import('/src/features/accessibility/a11y-audit.mjs');
   return auditAccessibility(document.getElementById('app')).findings.filter(f=>f.severity!=='info');
  });
  assert.deepEqual(findings,[],'Automated accessibility findings: '+JSON.stringify(findings.slice(0,4)));
 };
 await audit();PASS('automated home accessibility');
 // Put a sentinel under the original legacy origin before normal workspace editing.
 const original='F20_LEGACY_DO_NOT_TOUCH_SYNTHETIC';
 await page.evaluate(s=>localStorage.setItem('ledger_cv_state_v2',s),original);
 await page.reload();
 await page.getByRole('link',{name:'Edit',exact:true}).click();
 await page.getByRole('button',{name:'Confirm master editing'}).click();
 await page.getByLabel('First name').fill('Ada');
 await page.getByLabel('Last name').fill('Example');
 await page.getByLabel('Professional title').fill('F20 Retail Manager');
 await page.waitForFunction(()=>document.querySelector('.lw-toolbar [role=status]')?.textContent.includes('Saved on this device'));
 await page.reload();
 await page.getByRole('link',{name:'Edit',exact:true}).click();
 assert.equal(await page.getByLabel('Professional title').inputValue(),'F20 Retail Manager');
 assert.equal(await page.evaluate(()=>localStorage.getItem('ledger_cv_state_v2')),original,'Legacy key overwritten');
 PASS('master edit consent, IndexedDB restart, old data untouched');
 const pdfEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'PDF',exact:true}).click();
 const pdf=await pdfEvent;assert(fs.readFileSync(await pdf.path()).subarray(0,5).toString()==='%PDF-');
 const docxEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Word',exact:true}).click();
 const docx=await docxEvent;assert(fs.readFileSync(await docx.path()).subarray(0,2).toString()==='PK');
 PASS('real browser PDF and DOCX export bytes');
 await page.getByRole('link',{name:'Career tools'}).click();
 await page.getByLabel('Job title').fill('Retail manager');
 await page.getByLabel('Employer').fill('Example Stores');
 await page.getByLabel('Job advert text').fill('Retail manager\nRequirements\n- Store operations\n- Stock control\n- <img src=x onerror=window.__F20_XSS=1>');
 await page.getByRole('button',{name:'Analyse and save vacancy'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Vacancy analysed'));
 assert.equal(await page.evaluate(()=>window.__F20_XSS),undefined,'Untrusted vacancy executed as HTML');
 await page.reload();await page.getByRole('link',{name:'Career tools'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Example Stores'));
 assert.equal(await page.getByLabel('Employer').inputValue(),'Example Stores');
 PASS('vacancy survives reload and does not execute injected HTML');
 await page.getByRole('button',{name:'Start cover letter draft'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Cover letter draft created.'));
 await page.getByLabel('Letter body paragraphs (separate with blank lines)').fill('I managed synthetic store operations at Example Stores.');
 await page.getByRole('button',{name:'Save letter edits'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Letter edits'));
 await page.getByRole('button',{name:'Save application and link CV'}).click();
 await page.waitForFunction(()=>location.hash==='#/jobs');
 assert.match(await page.locator('.lw-board').innerText(),/Example Stores/);
 PASS('job to letter to linked application');
 await page.getByRole('link',{name:'Home',exact:true}).click();
 const backupEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download saved CV backup'}).click();
 const backup=await backupEvent;const data=JSON.parse(fs.readFileSync(await backup.path(),'utf8'));
 assert.equal(data.format,'ledger-career-profile-backup');
 assert.equal(data.checksumAlgorithm,'SHA-256');
 PASS('explicit hashed local CV backup');
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);
 const cache=await page.evaluate(async()=>await caches.keys());
 assert(cache.some(x=>x.startsWith('ledger-workspace-')),'Service worker did not version static shell');
 await page.reload();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);
 await page.goto(origin+'/#/home',{waitUntil:'domcontentloaded'});
 await page.getByRole('link',{name:'Career tools'}).waitFor();
 await page.getByRole('link',{name:'Career tools'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent.includes('Example Stores'));
 PASS('offline PWA navigation and retained job draft');
 await context.setOffline(false);
 for(const size of [{width:320,height:720},{width:820,height:1100},{width:1440,height:900}]){
  await page.setViewportSize(size);
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await audit();
 }
 PASS('320px, tablet, desktop automated home accessibility');
 assert.deepEqual(errors,[],'Uncaught JS errors');
 assert.deepEqual(remote,[],'Unexpected outbound requests');
 assert.deepEqual(missing,[],'Missing hosted client modules');
 PASS('no exfiltration, uncaught errors, or HTTP 404s');
 const legacy=await page.request.get(origin+'/legacy/index.html');
 assert.equal(legacy.status(),200);
 assert((await legacy.body()).length>10_000_000);
 PASS('frozen E31 classic route remains available');
 await context.close();
}catch(error){failed=true;issues.push(String(error?.stack||error));console.error(error)}
finally{await browser.close();server.close()}
const report={kind:'ledger-stage-f20-emitted-site-browser',engine,platform:process.platform,
 status:failed?'FAIL':'PASS',checks,issueCount:issues.length,issues,
 metrics:{...metrics,totalWallMs:Math.round(performance.now()-t0)},
 notes:['Synthetic fixtures only','Not manual screen-reader testing','Not physical mobile device','Not Enhancv account comparison']};
if(process.env.F20_REPORT){
 fs.mkdirSync(path.dirname(process.env.F20_REPORT),{recursive:true});
 fs.writeFileSync(process.env.F20_REPORT,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({engine,status:report.status,checks:checks.length,metrics:report.metrics},null,2));
if(failed)process.exitCode=1;
