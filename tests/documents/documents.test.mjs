import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SYNTH_DOC,LONG_DOC,TEXT_CV} from './fixtures.mjs';
import {TEMPLATES,FAMILIES,applyTemplate,normalizeAppearance,resolveStyle,listTemplates} from '../../src/features/templates/registry.mjs';
import {createEditor} from '../../src/features/editor/editor-state.mjs';
import {layoutDocument,pagesToText,htmlToLines,paginate} from '../../src/features/documents/layout.mjs';
import {renderDocumentArtifact,renderPreview} from '../../src/features/export/export-service.mjs';
import {extractPdfText} from '../../src/features/documents/pdf-writer.mjs';
import {unzipEntries,zipStore,utf8,bytesToText} from '../../src/features/documents/zip.mjs';
import {parseResumeText,createImportReview,approveImportReview} from '../../src/features/import/text-import.mjs';
import {htmlToImportText,docxToImportText} from '../../src/features/import/html-import.mjs';
import {runOcrBatch} from '../../src/features/ocr/ocr-session.mjs';
import {validLegacyDocument} from '../../src/domain/storage/legacy-shape.mjs';
const inflate=async b=>new Uint8Array(zlib.inflateRawSync(b));
const variant=(o={})=>({id:'variantABC123',revision:2,name:'CV',document:SYNTH_DOC(),appearance:{},...o});

/* ---------- Stage 6 ---------- */
test('registry keeps all 30 legacy templates across seven families with unique ids',()=>{
 assert.equal(TEMPLATES.length,30);assert.equal(new Set(TEMPLATES.map(t=>t.id)).size,30);
 for(const f of FAMILIES)assert(listTemplates({family:f}).length>0,'empty family '+f);
 const sig=new Set(TEMPLATES.map(t=>JSON.stringify([t.family,t.tokens,t.color])));
 assert.equal(sig.size,30,'every template must be visually distinguishable by tokens or accent');
});
test('switching template never touches the document',()=>{
 const doc=SYNTH_DOC(),before=JSON.stringify(doc);
 for(const t of TEMPLATES){const a=applyTemplate({template:'modern'},t.id);assert.equal(a.template,t.id);}
 assert.equal(JSON.stringify(doc),before);
 const ed=createEditor({document:doc}),docBefore=JSON.stringify(ed.snapshot().document);
 ed.setAppearance(applyTemplate(ed.snapshot().appearance,'prestige'));
 assert.equal(JSON.stringify(ed.snapshot().document),docBefore);assert.equal(ed.snapshot().appearance.template,'prestige');
});
test('legacy appearance values degrade safely and invalid options are reported',()=>{
 const r=normalizeAppearance({template:'nope',font:'lora',color:'red',paper:'Legal',fontSize:'huge'});
 assert.equal(r.appearance.template,'modern');assert.equal(r.appearance.font,'serif');
 assert(r.errors.length>=3);assert.equal(resolveStyle({paper:'Letter'}).paper,'Letter');
});

/* ---------- Stage 5 ---------- */
test('editor commands are undoable, never drop content and stay contract-valid',()=>{
 const ed=createEditor({document:SYNTH_DOC()});
 const snap0=JSON.stringify(ed.snapshot().document);
 ed.setPersonal('firstName','Grace');ed.setPersonal('firstName','Gracie'); // coalesced typing
 ed.undo();assert.equal(JSON.stringify(ed.snapshot().document),snap0);
 ed.redo();assert.equal(ed.snapshot().document.personalInfo.firstName,'Gracie');
 const id=ed.addItem('experience',{title:'New'});assert.equal(ed.snapshot().document.experience.length,3);
 ed.moveItem('experience',id,-5);assert.equal(ed.snapshot().document.experience[0].id,id);
 ed.moveItem('experience',id,+1);assert.equal(ed.snapshot().document.experience[1].id,id);
 const removed=ed.snapshot().document.experience.find(e=>e.id==='e1');
 ed.removeItem('experience','e1');assert(!ed.snapshot().document.experience.some(e=>e.id==='e1'));
 ed.undo();assert.deepEqual(ed.snapshot().document.experience.find(e=>e.id==='e1'),removed);
 assert(validLegacyDocument(ed.snapshot().document));
 ed.moveSection('skills',-2);assert.equal(ed.snapshot().appearance.sectionOrder.indexOf('skills'),1);
});
test('editor rejects protected fields, unknown items and bad appearance; input is not aliased',()=>{
 const src=SYNTH_DOC(),ed=createEditor({document:src});
 assert.throws(()=>ed.setPersonal('__proto__','x'),/Invalid/);
 assert.throws(()=>ed.updateItem('experience','e1',{id:'z'}),/Protected/);
 assert.throws(()=>ed.removeItem('experience','nope'),/Unknown/);
 assert.throws(()=>ed.setAppearance({paper:'Legal'}),/paper/);
 src.summary='mutated outside';assert.notEqual(ed.snapshot().document.summary,'mutated outside');
 const s=ed.snapshot();s.document.summary='mutated snapshot';assert.notEqual(ed.snapshot().document.summary,'mutated snapshot');
 assert.equal(ed.snapshot().dirty,false);ed.setText('summary','x');assert.equal(ed.snapshot().dirty,true);ed.markSaved();assert.equal(ed.snapshot().dirty,false);
});

/* ---------- Stage 7 ---------- */
test('layout keeps logical order and no content is lost across 1-4+ pages and both papers',()=>{
 for(const paper of ['A4','Letter'])for(const n of [1,12,40,90]){
  const doc=n===1?SYNTH_DOC():LONG_DOC(n);
  const l=layoutDocument(doc,{paper,template:'modern'});
  const text=pagesToText(l.pages);
  for(const e of doc.experience)assert(text.includes(e.title+' | '+e.employer),paper+n+' missing '+e.title);
  const order=doc.experience.map(e=>text.indexOf(e.title+' | '+e.employer));
  assert.deepEqual(order,[...order].sort((a,b)=>a-b),'experience order changed');
  for(const pg of l.pages)for(const ln of pg)assert(ln.y<=l.paper.height-l.style.margin+1,'line below bottom margin');
 }
});
test('section titles are never stranded at the bottom of a page',()=>{
 for(const n of [8,13,21,34]){
  const l=layoutDocument(LONG_DOC(n),{});
  for(const pg of l.pages){const last=pg[pg.length-1];assert.notEqual(last.kind,'section-title');assert.notEqual(last.kind,'entry-head');}
 }
});
test('entry head stays with its first description line',()=>{
 const l=layoutDocument(LONG_DOC(30),{});
 for(const pg of l.pages)pg.forEach((ln,i)=>{if(ln.kind==='entry-head')assert(i<pg.length-1,'orphaned entry head');});
});
test('hidden CV text, scripts and unsafe URLs never reach the layout',()=>{
 const d=SYNTH_DOC();d.personalInfo.website='javascript:alert(1)';d.experience[0].description='<script>x()</script><b>safe</b>';
 const a=renderDocumentArtifact(variant({document:d}),'pdf');
 assert(!/\/URI \(javascript/i.test(Buffer.from(a.bytes).toString('latin1')),'unsafe scheme must never become a link');assert(!a.text.includes('x()'));
 assert.deepEqual(htmlToLines('<p>a&amp;b</p><ul><li>x</li></ul>'),[{bullet:false,text:'a&b'},{bullet:true,text:'x'}]);
});
test('PDF export: deterministic, paginated, text in logical order, links present',()=>{
 const a=renderDocumentArtifact(variant(),'pdf'),b=renderDocumentArtifact(variant(),'pdf');
 assert.equal(a.mime,'application/pdf');assert.equal(a.sourceVariantId,'variantABC123');assert.equal(a.sourceRevision,2);
 assert.deepEqual([...a.bytes],[...b.bytes],'export must be reproducible');
 assert(Buffer.from(a.bytes).toString('latin1').includes('/URI (mailto:ada@example.test)'));
 const pages=extractPdfText(a.bytes);
 assert.equal(pages.length,a.pageCount);
 const flat=pages.flat();
 assert(flat.indexOf('Operations Manager | Acme Retail')<flat.indexOf('Supervisor | Bolt Stores'));
 assert(flat.includes('Jan 2020 – Present'));
 assert(flat.every(x=>!/[�]/.test(x)));
});
test('PDF export reports characters it cannot encode instead of silently dropping them',()=>{
 const d=SYNTH_DOC();d.summary='Café — مرحبا';
 const a=renderDocumentArtifact(variant({document:d}),'pdf');
 assert(a.warnings.some(w=>/DOCX/.test(w)));
 const d2=SYNTH_DOC();d2.summary='Café — “quoted”';
 assert(extractPdfText(renderDocumentArtifact(variant({document:d2}),'pdf').bytes).flat().includes('Café — “quoted”'));
});
test('DOCX export round-trips through the importer with headings, bullets and hyperlinks intact',async()=>{
 const a=renderDocumentArtifact(variant({appearance:{template:'executive',paper:'Letter'}}),'docx');
 const files=await unzipEntries(a.bytes,{inflate});
 const xml=bytesToText(files.get('word/document.xml'));
 assert(xml.includes('w:w="12240"'),'Letter width');assert(xml.includes('<w:pStyle w:val="Heading1"/>'));assert(xml.includes('w:numId w:val="1"'));
 assert(bytesToText(files.get('word/_rels/document.xml.rels')).includes('mailto:ada@example.test'));
 const r=await docxToImportText(a.bytes,{inflate});
 assert(r.text.includes('Led a team of 12.'));assert(/• Led a team/.test(r.text));
 assert(r.text.indexOf('Acme Retail')<r.text.indexOf('Bolt Stores'));
});
test('exports are valid files for independent tools (LibreOffice / poppler when installed)',{skip:!hasTool('pdftotext')},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cvdoc-'));
 try{
  const pdf=path.join(dir,'a.pdf');fs.writeFileSync(pdf,renderDocumentArtifact(variant({document:LONG_DOC(25)}),'pdf').bytes);
  const out=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  assert(out.includes('Role 0 | Company 0'));assert(out.indexOf('Role 3 | Company 3')<out.indexOf('Role 20 | Company 20'));
  const info=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});assert(/Page size:\s+595\.28 x 841\.89/.test(info));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('invalid input to the renderer fails with a typed error',()=>{
 assert.throws(()=>renderDocumentArtifact({id:'x',document:{}},'pdf'),e=>e.code==='INVALID');
 assert.throws(()=>renderDocumentArtifact(variant(),'rtf'),e=>e.code==='INVALID');
 assert.equal(renderPreview(SYNTH_DOC(),{}).pageCount,1);
});
test('sidebar templates export single-column and say so',()=>{
 assert(renderDocumentArtifact(variant({appearance:{template:'creative'}}),'pdf').warnings.some(w=>/single column/.test(w)));
});

/* ---------- ZIP safety ---------- */
test('zip reader refuses oversize, truncated and mismatched archives',async()=>{
 const z=zipStore([{name:'a.txt',data:utf8('hello')}]);
 assert.equal(bytesToText((await unzipEntries(z)).get('a.txt')),'hello');
 await assert.rejects(()=>unzipEntries(z,{limits:{maxEntries:1,maxEntryBytes:2,maxTotalBytes:10}}),/too large/);
 await assert.rejects(()=>unzipEntries(utf8('not a zip')),/Not a ZIP/);
 await assert.rejects(()=>unzipEntries(z.subarray(0,z.length-30)),/Not a ZIP|Corrupt|Truncated/);
});

/* ---------- Stage 8 ---------- */
test('text import extracts structure into a review that is never auto-committed',()=>{
 const p=parseResumeText(TEXT_CV);
 assert.equal(p.document.personalInfo.firstName,'Grace');assert.equal(p.document.personalInfo.email,'grace@example.test');
 assert.equal(p.document.experience.length,2);
 assert.deepEqual([p.document.experience[0].title,p.document.experience[0].employer,p.document.experience[0].current],['Senior Engineer','Navy Labs',true]);
 assert.deepEqual([p.document.experience[1].title,p.document.experience[1].employer,p.document.experience[1].start,p.document.experience[1].end],['Engineer','Univac','2012','2017']);
 assert(p.document.experience[0].description.includes('<li>Led compiler team.</li>'));
 assert.equal(p.document.education[0].school,'Vassar College');
 assert.deepEqual(p.document.skills.map(s=>s.name),['COBOL','Testing','Mentoring']);
 const review=createImportReview(p,{sourceName:'cv.txt'});
 assert.equal(review.status,'review-required');assert.equal(review.requiresUserConfirmation,true);
 assert(review.items.every(i=>i.decision==='pending'));
 assert.throws(()=>approveImportReview(review,{accepted:['summary']}),e=>e.code==='UNCONFIRMED');
 assert.throws(()=>approveImportReview(review,{confirmed:true,accepted:[]}),/No items/);
});
test('approval imports only accepted items and records unverified document evidence',()=>{
 const review=createImportReview(parseResumeText(TEXT_CV),{sourceName:'cv.txt'});
 const profile=approveImportReview(review,{confirmed:true,accepted:['personalInfo.name','experience[0]']});
 assert.equal(profile.master.document.personalInfo.firstName,'Grace');
 assert(!profile.master.document.personalInfo.email);
 assert.equal(profile.master.document.experience.length,1);assert.equal(profile.master.document.education.length,0);
 assert.equal(profile.evidence.length,1);assert.equal(profile.evidence[0].source,'document');assert.equal(profile.evidence[0].verifiedByUser,false);
 assert(profile.evidence[0].sourceRef.startsWith('cv.txt:line'));
});
test('import warns about missing and ambiguous data, bounds input, and blocks empty documents',()=>{
 const p=parseResumeText('Jane\nExperience\n2019 - 2020\n- did things\n');
 assert(p.warnings.some(w=>/No email/.test(w)));assert(p.warnings.some(w=>/missing a title/.test(w)));
 assert.equal(createImportReview(parseResumeText('\n\n   \n')).status,'blocked');
 assert(parseResumeText('x\n'.repeat(210000)).warnings.some(w=>/NOT imported/.test(w)));
 assert.throws(()=>parseResumeText(null),e=>e.code==='INVALID');
 const evil=parseResumeText('<img src=x onerror=alert(1)>\nExperience\nA at B\n2020 - 2021\n- <script>1</script>');
 assert(!evil.document.experience[0].description.includes('<script>'));
});
test('HTML import omits hidden and scripted content and reports it',()=>{
 const r=htmlToImportText('<h1>Ann Lee</h1><div style="display:none">KEYWORD STUFFING</div><script>evil()</script><p>ann@example.test</p><ul><li>One</li></ul>');
 assert(!r.text.includes('KEYWORD')&&!r.text.includes('evil'));assert(r.warnings.some(w=>/hidden/.test(w)));assert(r.text.includes('• One'));
});
test('DOCX import omits hidden runs, includes headers, and warns about tables/text boxes',async()=>{
 const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
 const doc=`<w:document ${W}><w:body><w:p><w:r><w:t>Ann Lee</w:t></w:r></w:p><w:p><w:r><w:rPr><w:vanish/></w:rPr><w:t>HIDDEN KEYWORDS</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Skills</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`;
 const header=`<w:hdr ${W}><w:p><w:r><w:t>ann@example.test</w:t></w:r></w:p></w:hdr>`;
 const deflated=z=>zlib.deflateRawSync(Buffer.from(z));
 const store=zipStore([{name:'word/document.xml',data:utf8(doc)},{name:'word/header1.xml',data:utf8(header)}]);
 const r=await docxToImportText(store,{inflate});
 assert(!r.text.includes('HIDDEN'));assert(r.text.startsWith('ann@example.test'));
 assert(r.warnings.some(w=>/hidden text run/.test(w)));assert(r.warnings.some(w=>/Tables/.test(w)));assert(r.warnings.some(w=>/header1/.test(w)));
 assert(deflated(doc).length>0);
 await assert.rejects(()=>docxToImportText(zipStore([{name:'x.txt',data:utf8('x')}]),{inflate}),/Not a Word/);
});
const engine=(texts,{delay=0,conf}={})=>{let i=0;return {async recognize(_,{signal}={}){await new Promise(r=>setTimeout(r,delay));if(signal?.aborted)throw new Error('x');return {text:texts[i++]??'',confidence:conf};}};};
const img=n=>({byteLength:n});
test('OCR batch is bounded, unverified-by-default and all-or-nothing',async()=>{
 const r=await runOcrBatch({images:[img(10),img(10)],engine:engine([TEXT_CV.split('\nEducation')[0],'Education\nBSc Mathematics - Vassar College\n2008 - 2012\n'],{conf:0.5})});
 assert(r.review.warnings.some(w=>/unverified/.test(w)));assert(r.review.warnings.some(w=>/low recognition confidence/.test(w)));
 assert(r.review.items.every(i=>i.decision==='pending'));assert.equal(r.pages,2);
 await assert.rejects(()=>runOcrBatch({images:[img(10),img(10)],engine:engine([TEXT_CV,'  '])}),/too little text/);
 await assert.rejects(()=>runOcrBatch({images:Array(6).fill(img(1)),engine:engine([])}),/At most 5/);
 await assert.rejects(()=>runOcrBatch({images:[img(7*1024*1024)],engine:engine([TEXT_CV])}),/larger than/);
 await assert.rejects(()=>runOcrBatch({images:[],engine:engine([])}),/No pages/);
});
test('OCR cancellation discards everything, including the in-flight page',async()=>{
 const ac=new AbortController();
 const p=runOcrBatch({images:[img(1),img(1)],engine:engine([TEXT_CV,TEXT_CV],{delay:20}),signal:ac.signal});
 setTimeout(()=>ac.abort(),5);
 await assert.rejects(p,e=>e.code==='CANCELLED');
});
function hasTool(t){try{execFileSync('which',[t]);return true;}catch{return false;}}

test('asynchronous save acknowledgement never marks later unsaved edits as saved',()=>{
 const editor=createEditor({document:SYNTH_DOC()});
 editor.setText('summary','Sent to storage');
 const sent=editor.snapshot();
 editor.setText('summary','Edited while save was pending');
 editor.markSaved({document:sent.document,appearance:sent.appearance});
 assert.equal(editor.snapshot().dirty,true,'newer change must remain dirty');
 assert.equal(editor.snapshot().document.summary,'Edited while save was pending');
 editor.markSaved({document:editor.snapshot().document,appearance:editor.snapshot().appearance});
 assert.equal(editor.snapshot().dirty,false);
});
test('renderer adapter satisfies async pdf/docx/html contract without running network code',async()=>{
 const {createDocumentRenderer}=await import('../../src/features/documents/index.mjs');
 const renderer=createDocumentRenderer(),v=variant();
 for(const format of ['pdf','docx','html']){
  const art=await renderer.render({sourceVariantId:v.id,sourceRevision:v.revision,
   document:v.document,appearance:v.appearance,format});
  assert.equal(art.format,format);assert.equal(art.sourceVariantId,v.id);
  assert.equal(art.sourceRevision,v.revision);assert(art.bytes.length>100);
 }
 await assert.rejects(renderer.render({sourceVariantId:v.id,sourceRevision:v.revision,
  document:v.document,appearance:v.appearance,format:'pdf'}, {aborted:true}),e=>e.name==='AbortError');
});
