/**
 * Stage F20: reproducible synthetic 30 x A4/Letter x PDF/DOCX matrix.
 * This produces only synthetic artifacts in a CI temp directory (never site/).
 * Native parser tests are separate and do not claim Microsoft Word fidelity.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import crypto from 'node:crypto';import {performance} from 'node:perf_hooks';
import {SYNTH_DOC} from '../../tests/documents/fixtures.mjs';
import {TEMPLATES} from '../../src/features/templates/registry.mjs';
import {renderDocumentArtifact} from '../../src/features/export/export-service.mjs';

const dir=process.env.F20_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'ledger-f20-'));
fs.mkdirSync(dir,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const doc=SYNTH_DOC(),original=JSON.stringify(doc),rows=[];
assert.equal(TEMPLATES.length,30);
for(const t of TEMPLATES)for(const paper of ['A4','Letter'])for(const format of ['pdf','docx']){
 assert(/^[a-z0-9-]+$/.test(t.id));
 const variant={id:'masterF20fixture01',revision:0,name:'Synthetic CV',
  document:doc,appearance:{template:t.id,paper}};
 const started=performance.now(),out=renderDocumentArtifact(variant,format);
 const elapsedMs=Math.round((performance.now()-started)*1000)/1000;
 assert.equal(out.format,format);
 assert.equal(out.sourceVariantId,variant.id);
 assert.equal(out.sourceRevision,0);
 assert(out.bytes.length>250,'Empty document export: '+t.id+' '+paper+' '+format);
 assert(out.pageCount>=1&&out.pageCount<12,'Invalid page count');
 assert.equal(JSON.stringify(doc),original,'Export mutated source CV');
 const name=t.id+'-'+paper+'.'+format,bytes=Buffer.from(out.bytes);
 fs.writeFileSync(path.join(dir,name),bytes);
 rows.push({template:t.id,family:t.family,paper,format,name,
  size:bytes.length,sha256:hash(bytes),pageCount:out.pageCount,
  warnings:out.warnings,renderMs:elapsedMs});
}
assert.equal(rows.length,120);
const manifest={schema:'ledger-f20-native-export-matrix',version:1,
 source:'synthetic invented fixture tests/documents/fixtures.mjs',
 provenance:'native extraction pending; no user CVs',
 generatedAt:new Date().toISOString(),templateCount:30,papers:['A4','Letter'],
 files:rows,sourceDocumentSha256:hash(Buffer.from(original))};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('F20: generated '+rows.length+' synthetically labeled PDF/DOCX documents in '+dir);
