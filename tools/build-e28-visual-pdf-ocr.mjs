import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p),read=p=>fs.readFileSync(at(p),'utf8');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const input='dist/Ledger_CV_Studio_E27_Transactional_PDF_Batch_OCR.html';
const old=read(input);
const expectedInput='f6d68fea1f7cc93be5884631d1a945db92c5ce946a39ab22d12e04e2c0789650';
assert.equal(sha(old),expectedInput,'Frozen E27 HTML changed; refuse unverified rewrite');
const startAnchor='function e26AttachScannedPdfReview(review,file){';
const endAnchor='function stagePdfImport(file,{done,fail,isCurrent,stale})';
const start=old.indexOf(startAnchor),end=old.indexOf(endAnchor,start);
assert(start>0&&end>start&&old.indexOf(startAnchor,start+1)<0,'Unexpected PDF import function boundaries');
const module=read('src/features/pdf/e28-pdf-visual-review.inline.js');
const first=module.indexOf(startAnchor);
assert(first>=0&&module.includes('const MAX_VISIBLE=5')&&module.includes('async function orientedBlob'));
new vm.Script(module.slice(first),{filename:'e28-pdf-visual-review.inline.js'});
const next=old.slice(0,start)+module.slice(first)+'\n'+old.slice(end);
assert(next.startsWith(old.slice(0,start))&&next.endsWith(old.slice(end)),
 'Unexpected surrounding app changes');
assert(!/<script\b[^>]+\bsrc\s*=/i.test(next),'External JS resource detected');
const out='dist/Ledger_CV_Studio_E28_Offline_Visual_PDF_OCR.html';
fs.writeFileSync(at(out),next);
const report={
 appSha256:sha(next),appBytes:Buffer.byteLength(next),frozenE27Sha256:expectedInput,
 fileOrigin:true,normalUseRequiresNetwork:false,normalUseRequiresInstallation:false,
 preservesCVDataSchema:true,productionAccepted:false,
 features:['local original-PDF-page thumbnail for manual OCR review','orientation before trained English OCR',
 'bounded zoom','maximum five in-memory source-page image references','revoke object URLs on review close',
 'transactional batch update and previous E27 behavior'],
 limitations:['only clean synthetic English OCR corpus is automated','user-device acceptance open',
 'real Word fidelity and accessibility signoff open'],
 status:'ENGINEERING QA — RELEASE NO-GO'
};
fs.writeFileSync(at('dist/E28_MANIFEST.json'),JSON.stringify(report,null,2)+'\n');
console.log('E28 generated:',out);
console.log('E28 manifest:',JSON.stringify(report));
