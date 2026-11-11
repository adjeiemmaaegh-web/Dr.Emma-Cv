import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p);
const read=p=>fs.readFileSync(at(p),'utf8');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const basePath='dist/Ledger_CV_Studio_E25_Trained_Offline_OCR.html';
const base=read(basePath);
const e25hash='1126a81933d86dc54c7ac36eac9dd4e6aa01f8bddb47e7bcac5a546fb810c8a7';
assert.equal(sha(base),e25hash,'E25 frozen input mismatch: never patch an unverified app');
const pdfMain=read('node_modules/pdfjs-dist/legacy/build/pdf.mjs');
const pdfWorker=fs.readFileSync(at('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'));
const pdfLicense=read('node_modules/pdfjs-dist/LICENSE');
assert(pdfMain.length>100000&&pdfWorker.length>100000&&/Apache License/i.test(pdfLicense),'Missing PDF.js and license');
const ui=read('src/features/pdf/e26-review-ui.inline.js');
const raster=read('src/features/pdf/e26-render-pdf.inline.js');
new vm.Script(ui,{filename:'e26-review-ui.inline.js'});
new vm.Script(raster,{filename:'e26-render-pdf.inline.js'});
const sourceAnchor='function stagePdfImport(file,{done,fail,isCurrent,stale})';
const callAnchor='  e12AttachPdfReference(review,file);';
assert.equal(base.split(sourceAnchor).length,2,'PDF import module source moved');
assert.equal(base.split(callAnchor).length,2,'PDF reference review anchor moved');
let html=base.replace(sourceAnchor,ui+'\n'+sourceAnchor)
 .replace(callAnchor,callAnchor+'\n  e26AttachScannedPdfReview(review,file);');
const pdfModule='<script type="module">\n'+pdfMain.replace(/<\/script/gi,'<\\/script')+
 '\nwindow.ledgerE26Pdfjs={getDocument,GlobalWorkerOptions};\n</script>';
const inlineWorker='<script id="ledgerE26PdfWorker" type="application/x-embedded-binary">'+pdfWorker.toString('base64')+'</script>';
const legal='<script id="ledgerE26PdfLicense" type="text/plain">'+
 ('Mozilla PDF.js 6.5.438 (Apache-2.0)\\n'+pdfLicense).replace(/<\/script/gi,'<\\/script')+
 '</script>';
const closing='</body>';
const where=html.lastIndexOf(closing);
assert(where>html.length-250,'Missing final body close');
const appendix=['<!-- E26 embedded PDF.js for strictly local scanned-PDF OCR -->',inlineWorker,
 legal,pdfModule,'<script>\n'+raster+'\n</script>'].join('\n');
html=html.slice(0,where)+appendix+'\n'+html.slice(where);
assert(html.includes('ledgerE26Pdfjs={getDocument,GlobalWorkerOptions}'));
assert(!/<script\b[^>]+\bsrc\s*=/i.test(html),'External JS resource detected');
assert(!/<link\b[^>]+\brel=["']stylesheet["'][^>]+\bhref=/i.test(html),'External CSS detected');
const file='dist/Ledger_CV_Studio_E26_Scanned_PDF_Offline_OCR.html';
assert.equal(sha(html),'c05e4c037af412bd11822f4c9b089cbf02f4636cec787cfc32bf94d7c7fe180e','E26 frozen single-HTML checksum mismatch');
fs.writeFileSync(at(file),html);
const report={appSha256:sha(html),size:Buffer.byteLength(html),
 baseAppSha256:e25hash,pdfJsVersion:'6.5.438',
 pdfCoreSha256:sha(pdfMain),pdfWorkerSha256:sha(pdfWorker),
 pdfWorkerBytes:pdfWorker.length,pdfCoreBytes:Buffer.byteLength(pdfMain),
 implementation:'one-page-at-a-time local raster and trained English OCR review',
 dataFormatChanged:false,networkRequiredAtRuntime:false,
 status:'ENGINEERING ONLY — NO-GO'};
fs.writeFileSync(at('dist/E26_MANIFEST.json'),JSON.stringify(report,null,2)+'\n');
console.log('E26 HTML:',file);
console.log('E26 manifest:',JSON.stringify(report));
