import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const abs=p=>path.join(root,p);
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const e24=read('development/e24/Ledger_CV_Studio_E24_Offline_Calendar_Timezones.html');
assert.equal(sha(Buffer.from(e24)),'4d99390d87619839374b60b22220241557f7a6fb966567ea637c8fae5625d52d',
 'Frozen E24 source changed');
const ui=read('src/features/ocr/e25-trained-ocr-ui.inline.js');
const adapter=read('src/features/ocr/e25-trained-ocr-adapter.inline.js');
new vm.Script(ui,{filename:'e25-ocr-ui.js'});
// Adapter is a script body appended to an ESM module; parse in ESM context later.
const lib=read('node_modules/tesseract-wasm/dist/lib.js');
// Upstream 0.11.0's Emscripten bootstrap unconditionally resolves its WASM
// filename against Worker location.href. A blob:null URL from local file://
 // has no usable relative base. The model's WASM bytes are already supplied
// in memory; remove ONLY that unused relative-URL construction.
const workerUpstream=fs.readFileSync(abs('node_modules/tesseract-wasm/dist/tesseract-worker.js')).toString('utf8');
const relativeAnchor='else {wasmBinaryFile=new URL("tesseract-core.wasm",(typeof document === \'undefined\' && typeof location === \'undefined\' ? new (require(\'u\' + \'rl\').URL)(\'file:\' + __filename).href : typeof document === \'undefined\' ? location.href : (document.currentScript && document.currentScript.tagName.toUpperCase() === \'SCRIPT\' && document.currentScript.src || new URL(\'tesseract-worker.js\', document.baseURI).href))).href;}';
assert.equal(workerUpstream.split(relativeAnchor).length,2,'Unexpected upstream worker version; review blob: URL compatibility patch');
const worker=Buffer.from(workerUpstream.replace(relativeAnchor,'else {wasmBinaryFile="tesseract-core.wasm";}'));
new vm.Script(worker.toString('utf8'),{filename:'tesseract-worker-patched.js'});
const wasm=fs.readFileSync(abs('node_modules/tesseract-wasm/dist/tesseract-core.wasm'));
const fallback=fs.readFileSync(abs('node_modules/tesseract-wasm/dist/tesseract-core-fallback.wasm'));
const english=fs.readFileSync(abs('vendor/e25/eng.traineddata'));
// Preserve identical single-HTML bytes on Windows Git CRLF checkouts.
const notices=read('development/e25/THIRD_PARTY_NOTICES.txt').replace(/\r\n/g,'\n');
const fileInfo={library:sha(Buffer.from(lib)),worker:sha(worker),wasm:sha(wasm),
 fallback:sha(fallback),english:sha(english)};
assert(english.length>100000&&worker.length>10000&&wasm.length>100000,'Bundled OCR asset is incomplete');
assert(lib.includes('OCRClient')&&lib.includes('supportsFastBuild'),'Unrecognized tesseract-wasm package version');
const anchor='  toolbar.append(ocrButton);';
assert.equal(e24.split(anchor).length,2,'Image review UI insertion point missing or ambiguous');
let html=e24.replace(anchor,anchor+ui);
const closing='</body>';
const closingIndex=html.lastIndexOf(closing);
assert(closingIndex>html.length-100,'Final document closing anchor is missing');
const embedded=(id,buf)=>'<script id="'+id+'" type="application/x-embedded-binary">'+buf.toString('base64')+'</script>';
const legal='<script id="ledgerE25ThirdPartyNotices" type="text/plain">'+notices.replace(/<\/script/gi,'<\\/script')+'</script>';
// Single inline ESM script contains the exact distributable library source and adapter;
// no imports, CDNs, service worker, or runtime external model request.
const moduleScript='<script type="module">\n'+lib.replace(/<\/script/gi,'<\\/script')+
 '\n'+adapter.replace(/<\/script/gi,'<\\/script')+'\n</script>';
const appendix=[
 '<!-- E25: locally bundled licensed model, worker and WASM. Load on explicit use only. -->',
 embedded('ledgerE25Worker',worker),
 embedded('ledgerE25Wasm',wasm),
 embedded('ledgerE25FallbackWasm',fallback),
 embedded('ledgerE25English',english),
 legal,
 moduleScript
].join('\n');
html=html.slice(0,closingIndex)+appendix+'\n'+html.slice(closingIndex);
assert(!/<script\b[^>]+\bsrc\s*=/i.test(html),'Unexpected remote script');
assert(!/<link\b[^>]+\brel\s*=\s*["']stylesheet["'][^>]+\bhref\s*=/i.test(html),'Unexpected external stylesheet');
const dist=abs('dist');
fs.mkdirSync(dist,{recursive:true});
const out=path.join(dist,'Ledger_CV_Studio_E25_Trained_Offline_OCR.html');
fs.writeFileSync(out,html);
const manifest={appSha256:sha(Buffer.from(html)),size:Buffer.byteLength(html),ocrAssets:fileInfo,
 assetSizes:{worker:worker.length,wasm:wasm.length,fallback:fallback.length,english:english.length},
 sourceSha256:'4d99390d87619839374b60b22220241557f7a6fb966567ea637c8fae5625d52d',
 mode:'offline-single-html',status:'UNVERIFIED/NO-GO'};
fs.writeFileSync(path.join(dist,'E25_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('E25 OCR build artifact:',out);
console.log('E25 manifest:',JSON.stringify(manifest));
