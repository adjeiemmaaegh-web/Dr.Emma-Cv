/**
 * E29 hosting build from exactly verified E28 offline HTML.
 * Runtime CV data stays in browser. Node and npm are build-time only.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const modelUrl='https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/87416418657359cb625c412a48b6e1d6d41c29bd/eng.traineddata';
const modelSha='7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2';
const exactE28='73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7';
const modelFile=at('vendor/e25/eng.traineddata');
if(!fs.existsSync(modelFile)||sha(fs.readFileSync(modelFile))!==modelSha){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(modelUrl,{signal:controller.signal,redirect:'follow'});
  assert(response.ok,'Pinned trained model fetch HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());
  assert(data.length>3_500_000&&data.length<5_000_000,'Wrong trained model size');
  assert.equal(sha(data),modelSha,'Pinned model hash mismatch');
  fs.mkdirSync(path.dirname(modelFile),{recursive:true});
  fs.writeFileSync(modelFile,data);
 }finally{clearTimeout(timer)}
}
assert.equal(sha(fs.readFileSync(modelFile)),modelSha);
for(const script of ['tools/build-e25-trained-ocr.mjs','tools/build-e26-scanned-pdf.mjs',
 'tools/build-e27-pdf-batch.mjs','tools/build-e28-visual-pdf-ocr.mjs']){
 const result=spawnSync(process.execPath,[script],{cwd:root,stdio:'inherit',timeout:120_000});
 if(result.error)throw result.error;
 assert.equal(result.status,0,'Previous verified build failed: '+script);
}
const input=fs.readFileSync(at('dist/Ledger_CV_Studio_E28_Offline_Visual_PDF_OCR.html'));
assert.equal(input.length,15999116,'Unexpected E28 standalone size');
assert.equal(sha(input),exactE28,'E28 standalone checksum mismatch; publishing forbidden');
let html=input.toString('utf8');
const headClose=html.indexOf('</head>');
const bodyClose=html.lastIndexOf('</body>');
assert(headClose>0&&headClose<500000,'Unexpected HTML document head');
assert(bodyClose>html.length-30000,'Unexpected HTML document body');
const meta=[
 '<meta name="theme-color" content="#2B6F68">',
 '<meta name="application-name" content="Ledger CV Studio">',
 '<link rel="manifest" href="/site.webmanifest">',
 '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
 '<meta name="ledger-build" content="e29-hosted-e28-verified">'
].join('\n');
const swRegistration=[
 '<script id="ledger-e29-web-shell">',
 '(function(){',
 " if(location.protocol==='https:'&&'serviceWorker' in navigator){",
 "  window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'})",
 '   .catch(()=>{});},{once:true});',
 ' }',
 '})();',
 '</script>'
].join('\n');
html=html.replace('</head>',meta+'\n</head>');
const finalBody=html.lastIndexOf('</body>');
html=html.slice(0,finalBody)+swRegistration+'\n'+html.slice(finalBody);
assert(!/<script\b[^>]*\bsrc\s*=/i.test(html),'Unexpected external JS');
assert(!/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref/i.test(html),'Unexpected external CSS');
const site=at('site');fs.mkdirSync(site,{recursive:true});
fs.writeFileSync(path.join(site,'index.html'),html,'utf8');
const swTemplate=fs.readFileSync(at('hosting/sw.template.js'),'utf8');
const version='ledger-e29-'+sha(Buffer.from(html)).slice(0,14);
assert(swTemplate.includes('HOSTED_SHELL_VERSION'));
fs.writeFileSync(path.join(site,'sw.js'),swTemplate.replaceAll('HOSTED_SHELL_VERSION',version));
for(const name of ['site.webmanifest','favicon.svg']){
 fs.copyFileSync(at('hosting/'+name),path.join(site,name));
}
fs.copyFileSync(at('development/e25/THIRD_PARTY_NOTICES.txt'),
 path.join(site,'THIRD_PARTY_NOTICES.txt'));
const report={
 version:'E29 hosted from frozen E28',
 status:'HOSTED BETA — PRODUCT RELEASE ACCEPTANCE STILL OPEN',
 sourceE28Sha256:exactE28,hostedHtmlSha256:sha(Buffer.from(html)),
 hostedHtmlBytes:Buffer.byteLength(html),
 noServerSideCVData:true,hostedAppHasNoRuntimeDependencies:true,
 offlineCacheBestEffort:true,appDataRemainsInDeviceBrowser:true,
 firstVisitRequiresNetwork:true,
 sourceRef:'review/e29-vercel-hosted-offline-web-2026-11-11',
 outstanding:['real scanned CV accuracy','actual Microsoft Word fidelity',
 'physical 8GB Windows 11 test','mobile and accessibility and Arabic RTL',
 'full real-profile recovery and cross-tab','human template layout signoff']
};
fs.writeFileSync(path.join(site,'site-integrity.json'),JSON.stringify(report,null,2)+'\n');
console.log('E29 hosting build complete:',JSON.stringify(report));
