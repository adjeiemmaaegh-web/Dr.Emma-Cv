/**
 * Deployable A-E offline-first workspace. The already pinned E30/E31 build is
 * always built first and preserved byte-for-byte at /legacy/index.html.
 * Root publishes the Group A-E human-led workspace with only public JS/CSS.
 * Never copy data, test fixtures, environment files or dependencies into site.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const run=spawnSync(process.execPath,['tools/build-e31-unified-ux.mjs'],{cwd:root,stdio:'inherit',timeout:240000});
if(run.error)throw run.error;
assert.equal(run.status,0,'Frozen E31 build failed; no workspace may publish');
const target=at('site'),originalHtml=fs.readFileSync(path.join(target,'index.html'));
const original=JSON.parse(fs.readFileSync(path.join(target,'site-integrity.json'),'utf8'));
assert.equal(original.hostedHtmlSha256,sha(originalHtml),'Frozen classic E31 source hash mismatch');
fs.mkdirSync(path.join(target,'legacy'),{recursive:true});
fs.writeFileSync(path.join(target,'legacy/index.html'),originalHtml);
fs.copyFileSync(path.join(target,'site-integrity.json'),path.join(target,'legacy/site-integrity.json'));
const folders=[
 'src/contracts','src/core','src/domain',
 ...['accessibility','ats','career','career-region','cover-letter','documents','editor',
 'experience','export','import','intelligence','interview','job-match','linkedin-coach',
 'ocr','onboarding','pwa-ui','tailoring','templates','tracker','writing'].map(s=>'src/features/'+s)
];
for(const folder of folders){
 const dest=path.join(target,folder);
 assert(fs.statSync(at(folder)).isDirectory(),'Missing public workspace module: '+folder);
 fs.cpSync(at(folder),dest,{recursive:true,force:true});
}
// Whitelist emitted client-side files; no test fixtures, backup data, .env,
// third-party model weights or local career records are published.
const allowed=new Set(['.mjs','.js','.css','.html','.svg','.png','.webp','.woff2','.json']);
const served=[];
function visit(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const abs=path.join(dir,item.name);
  if(item.isDirectory()){visit(abs);continue}
  assert(item.isFile(),'Non-file in public source copy: '+abs);
  if(!allowed.has(path.extname(abs).toLowerCase())){fs.rmSync(abs);continue}
  const rel='/'+path.relative(target,abs).split(path.sep).join('/');
  assert(!/\/(?:tests?|fixtures?|node_modules|vendor|\.git|\.env)(?:\/|$)/i.test(rel),'Private source path copied: '+rel);
  served.push(rel);
 }
}
visit(path.join(target,'src'));

/* Same-origin, offline-cached PDF.js runtime. Build-only dependency; no CDN. */
const pdfInput=at('node_modules/pdfjs-dist/legacy/build');
const pdfOutput=path.join(target,'pdf-engine');
fs.mkdirSync(pdfOutput,{recursive:true});
for(const [file,source] of [
 ['pdf.mjs',path.join(pdfInput,'pdf.mjs')],
 ['pdf.worker.mjs',path.join(pdfInput,'pdf.worker.mjs')],
 ['LICENSE.txt',at('node_modules/pdfjs-dist/LICENSE')]
]){
 const data=fs.readFileSync(source);
 assert(data.length>1000,'Missing bundled PDF import dependency: '+source);
 fs.writeFileSync(path.join(pdfOutput,file),data);
 served.push('/pdf-engine/'+file);
}


/* Optional-on-demand ENGLISH OCR is bundled for normal use, never fetched from
 * the browser or a CDN. The pinned model is retrieved only in the BUILD
 * environment from an immutable upstream git revision, with Git blob SHA check.
 * Do not ship a host build if the exact trained model cannot be verified.
 */
const ocrOutput=path.join(target,'ocr-engine');
fs.mkdirSync(ocrOutput,{recursive:true});
const ocrModelRevision='87416418657359cb625c412a48b6e1d6d41c29bd';
const ocrModelBlobSha='bbef4675053b5b468cdb477053e28b1c698ba08e';
const modelInput=at('vendor/e25/eng.traineddata');
let trainedModel;
if(fs.existsSync(modelInput))trainedModel=fs.readFileSync(modelInput);
else{
 const source='https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/'+ocrModelRevision+'/eng.traineddata';
 const response=await fetch(source,{signal:AbortSignal.timeout(60000)});
 assert(response.ok,'Pinned English OCR build-time download failed; abort rather than ship incomplete OCR');
 trainedModel=Buffer.from(await response.arrayBuffer());
}
assert.equal(trainedModel.length,4113088,'English trained model size mismatch');
const modelGitSha=crypto.createHash('sha1').update('blob '+trainedModel.length+'\0').update(trainedModel).digest('hex');
assert.equal(modelGitSha,ocrModelBlobSha,'Pinned English trained model Git blob mismatch');
const upstreamOcr=at('node_modules/tesseract-wasm/dist');
const ocrLib=fs.readFileSync(path.join(upstreamOcr,'lib.js'),'utf8');
assert(ocrLib.includes('OCRClient')&&ocrLib.includes('supportsFastBuild'),'Unrecognized tesseract-wasm@0.11.0 interface');
const workerUpstream=fs.readFileSync(path.join(upstreamOcr,'tesseract-worker.js'),'utf8');
const relativeAnchor='else {wasmBinaryFile=new URL("tesseract-core.wasm",(typeof document === \'undefined\' && typeof location === \'undefined\' ? new (require(\'u\' + \'rl\').URL)(\'file:\' + __filename).href : typeof document === \'undefined\' ? location.href : (document.currentScript && document.currentScript.tagName.toUpperCase() === \'SCRIPT\' && document.currentScript.src || new URL(\'tesseract-worker.js\', document.baseURI).href))).href;}';
assert.equal(workerUpstream.split(relativeAnchor).length,2,'Unrecognized tesseract worker; review compatibility patch');
const patchedWorker=workerUpstream.replace(relativeAnchor,'else {wasmBinaryFile="tesseract-core.wasm";}');
for(const [file,data] of [
 ['client.mjs',ocrLib],
 ['worker.js',patchedWorker],
 ['tesseract-core.wasm',fs.readFileSync(path.join(upstreamOcr,'tesseract-core.wasm'))],
 ['tesseract-core-fallback.wasm',fs.readFileSync(path.join(upstreamOcr,'tesseract-core-fallback.wasm'))],
 ['eng.traineddata',trainedModel],
 ['THIRD_PARTY_NOTICES.txt',fs.readFileSync(at('development/e25/THIRD_PARTY_NOTICES.txt'))]
]){
 fs.writeFileSync(path.join(ocrOutput,file),data);
 served.push('/ocr-engine/'+file);
}

let index=fs.readFileSync(at('src/features/experience/workspace/index.html'),'utf8');
function change(old,next){
 assert.equal(index.split(old).length,2,'Unexpected workspace entry: '+old);
 index=index.replace(old,next);
}
change('href="../../accessibility/a11y.css"','href="/src/features/accessibility/a11y.css"');
change('href="./workspace.css"','href="/src/features/experience/workspace/workspace.css"');
change("from './workspace.mjs'","from '/src/features/experience/workspace/workspace.mjs'");
change('Preview of the Ledger CV Studio workspace. Your CV stays on this device.',
 'Ledger CV Studio: offline-first CVs, job matching and career tools. Your private career data stays on your device.');
change('</head>',[
 '<link rel="manifest" href="/site.webmanifest">',
 '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
 '<meta name="theme-color" content="#0b6b72">',
 '</head>'
].join('\n'));
change('</body>',[
 '<script>',
 '(function(){',
 " if(('serviceWorker' in navigator)&&(location.protocol==='https:'||(['localhost','127.0.0.1'].includes(location.hostname))))",
 "  window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});},{once:true});",
 '})();',
 '</script>',
 '</body>'
].join('\n'));
const rootHtml=Buffer.from(index);
assert(rootHtml.length<10000&&rootHtml.includes(Buffer.from('mountWorkspace')));
fs.writeFileSync(path.join(target,'index.html'),rootHtml);
const publicShell=['/','/index.html','/site.webmanifest','/favicon.svg',...served].sort();
assert(publicShell.includes('/src/features/experience/workspace/workspace.mjs'));
assert(publicShell.includes('/src/domain/storage/career-journey-store.mjs'));
const swTemplate=fs.readFileSync(at('hosting/sw.workspace.template.js'),'utf8');
assert(swTemplate.includes('WORKSPACE_CACHE_KEY')&&swTemplate.includes('WORKSPACE_PUBLIC_ASSETS'));
// Include every actual public asset in the offline cache identity, not merely the
// unchanged HTML shell. Otherwise a newer importer/PDF worker can be served stale.
const assetHashes=publicShell.filter(u=>u!=='/').map(u=>[u,sha(fs.readFileSync(path.join(target,u.slice(1))))]);
const cache='ledger-workspace-'+sha(JSON.stringify(assetHashes)).slice(0,14);
const sw=swTemplate.replaceAll('WORKSPACE_CACHE_KEY',cache)
 .replace('WORKSPACE_PUBLIC_ASSETS',JSON.stringify(publicShell));
fs.writeFileSync(path.join(target,'sw.js'),sw);
const manifest={
 version:'Ledger A-E hosted workspace / user-led career journey',
 status:'DEPLOYABLE BETA: independent production acceptance still open',
 sourceBranch:'main',workspaceHtmlSha256:sha(rootHtml),workspaceHtmlBytes:rootHtml.length,
 classicE31Sha256:sha(originalHtml),classicE31Bytes:originalHtml.length,
 classicRoute:'/legacy/index.html',publicModuleCount:served.length,bundledPdfEngine:true,
 bundledTrainedEnglishOCR:true,englishOcrModelGitSha:modelGitSha,
 noServerCVStorage:true,noBundledPrivateData:true,legacyOriginalDataUntouched:true,
 releaseGatesOpen:['real-device/browser acceptance','native PDF/DOCX and RTL fidelity','independent F signoff']
};
fs.writeFileSync(path.join(target,'site-integrity.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('A-E hosted workspace built',JSON.stringify({homeSha256:manifest.workspaceHtmlSha256,modules:served.length,legacySha256:manifest.classicE31Sha256,cache}));
