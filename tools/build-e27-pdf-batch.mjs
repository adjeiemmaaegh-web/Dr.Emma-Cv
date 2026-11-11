import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p),read=p=>fs.readFileSync(at(p),'utf8');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const e26Path='dist/Ledger_CV_Studio_E26_Scanned_PDF_Offline_OCR.html';
const old=read(e26Path);
const frozen='c05e4c037af412bd11822f4c9b089cbf02f4636cec787cfc32bf94d7c7fe180e';
assert.equal(sha(old),frozen,'E26 HTML input checksum changed; refuse unsafe rewrite');
const startAnchor='function e26AttachScannedPdfReview(review,file){';
const endAnchor='function stagePdfImport(file,{done,fail,isCurrent,stale})';
const start=old.indexOf(startAnchor),end=old.indexOf(endAnchor,start);
assert(start>0&&end>start&&old.indexOf(startAnchor,start+1)<0,'E26 PDF review module boundary mismatch');
const module=read('src/features/pdf/e27-batch-review.inline.js');
assert(module.startsWith('/* E27: transactional, user-initiated multi-page scanned PDF OCR'));
assert(module.includes(startAnchor)&&!module.includes(endAnchor));
const testSource=module.slice(module.indexOf(startAnchor));
new vm.Script(testSource,{filename:'e27-batch-review.inline.js'});
const next=old.slice(0,start)+module+'\n'+old.slice(end);
assert.equal(next.slice(0,start),old.slice(0,start));
assert.equal(next.slice(start+module.length+1),old.slice(end));
assert(!/<script\b[^>]+\bsrc\s*=/i.test(next),'Unexpected external JS');
assert(!/<link\b[^>]+\brel\s*=\s*["']stylesheet["'][^>]+\bhref\s*=/i.test(next),'Unexpected external stylesheet');
const out='dist/Ledger_CV_Studio_E27_Transactional_PDF_Batch_OCR.html';
assert.equal(sha(next),'f6d68fea1f7cc93be5884631d1a945db92c5ce946a39ab22d12e04e2c0789650','E27 standalone source integrity mismatch');
fs.writeFileSync(at(out),next);
const manifest={
 appSha256:sha(next),appBytes:Buffer.byteLength(next),
 frozenE26Sha256:frozen,
 fileOrigin:true,offlineOnly:true,cvStorageSchemaChanged:false,
 features:['1–5 sequential pages per batch','atomic review-draft update','cooperative stop','duplicate-page protection',
 'no missing-page silent truncation','explicit OCR acknowledgment','existing single-page UX retained'],
 status:'DEVELOPMENT ONLY — NO-GO'
};
fs.writeFileSync(at('dist/E27_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('E27 standalone generated:',out);
console.log('E27 manifest:',JSON.stringify(manifest));
