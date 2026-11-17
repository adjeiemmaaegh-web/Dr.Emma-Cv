import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../src/features/career/index.mjs';
import {createCareerProfile,createCVVariant,updateCVVariant,blankCareerDocument} from '../../src/domain/profile/career-profile.mjs';
import {parseJobText} from '../../src/features/intelligence/index.mjs';
import {extractPdfText} from '../../src/features/documents/pdf-writer.mjs';
import {unzipEntries,bytesToText} from '../../src/features/documents/zip.mjs';
import zlib from 'node:zlib';
const NOW='2026-11-17T10:00:00.000Z',inflate=async b=>new Uint8Array(zlib.inflateRawSync(b));
const doc=()=>({personalInfo:{firstName:'Ada',lastName:'Example',title:'Operations Manager',email:'ada@example.test',phone:'+44 20 7946 0000',city:'Leeds'},
 summary:'Operations manager with a record of running stores.',
 experience:[{id:'e1',title:'Operations Manager',employer:'Acme Retail',start:'Jan 2020',end:'',current:true,description:'<ul><li>Managed a team of 12 across two sites.</li><li>Reduced waste by reviewing weekly stock counts.</li></ul>'},
  {id:'e2',title:'Supervisor',employer:'Bolt Stores',start:'Jan 2016',end:'Dec 2019',current:false,description:'<ul><li>Scheduled rotas for 8 staff.</li></ul>'}],
 education:[{id:'d1',degree:'BA Business',school:'Example University',start:'2012',end:'2015'}],skills:[{name:'Scheduling'},{name:'Stock control'},{name:'Team training'}],
 languages:[],certifications:[],projects:[],accomplishments:[],hobbies:'',references:'',customSections:[]});
const idf=(()=>{let i=0;return p=>()=>(p||'idx')+String(++i).padStart(6,'0');})();
const profile=()=>createCareerProfile({id:'profileABC123',now:NOW,idFactory:()=> 'masterABC123',document:doc()});
const job=()=>parseJobText('Operations Manager\nRequirements\n- Managing a team\n- Stock control',{id:'jobAAAAAA1',role:'Operations Manager',employer:'Globex Retail',idFactory:idf('req')}).job;
const variant=()=>({id:'masterABC123',revision:0,document:doc(),appearance:{template:'modern',color:'#1e3a5f',paper:'Letter'}});

/* ---------- Stage 13 ---------- */
test('letter draft uses only CV and job facts and starts independent of the CV',()=>{
 const l=D.createLetterDraft({variant:variant(),job:job(),now:NOW,idFactory:()=> 'letterAAA001'});
 assert.equal(l.structure.senderName,'Ada Example');assert.match(l.structure.opening,/Operations Manager position at Globex Retail/);
 assert.equal(l.cvVariantId,'masterABC123');assert.equal(l.jobTargetId,'jobAAAAAA1');assert.equal(l.revision,0);
 assert(l.content.includes('Dear Hiring Manager,'));
});
test('letter edits are immutable, revision-checked and validated; CV is never touched',()=>{
 const v=variant(),before=JSON.stringify(v);
 let l=D.createLetterDraft({variant:v,job:job(),now:NOW,idFactory:()=> 'letterAAA001'});
 const l2=D.reviseLetter(l,{body:['I have managed a team of 12 across two sites.']},{expectedRevision:0,now:NOW});
 assert.equal(l.revision,0);assert.equal(l2.revision,1);assert.deepEqual(l.structure.body,[]);assert(l2.content.includes('managed a team of 12'));
 assert.throws(()=>D.reviseLetter(l2,{body:[]},{expectedRevision:0}),e=>e.code==='CONFLICT');
 assert.throws(()=>D.reviseLetter(l2,{evil:'x'},{expectedRevision:1}),e=>e.code==='INVALID');
 assert.throws(()=>D.reviseLetter(l2,{body:Array(13).fill('x')},{expectedRevision:1}),e=>e.code==='INVALID');
 assert.throws(()=>D.setLetterLayout(l2,'nope',{expectedRevision:1}),e=>e.code==='INVALID');
 assert.equal(D.setLetterLayout(l2,'executive',{expectedRevision:1,now:NOW}).appearance.layout,'executive');
 assert.equal(JSON.stringify(v),before);
});
test('fact check flags invented numbers, wrong employer/role, placeholders and a changed CV',()=>{
 const v=variant(),j=job();let l=D.createLetterDraft({variant:v,job:j,now:NOW,idFactory:()=> 'letterAAA001'});
 assert.deepEqual(D.checkLetterFacts(l,{variant:v,job:j}).filter(x=>x.severity==='error'),[],'draft has no errors');
 l=D.reviseLetter(l,{body:['I grew revenue by 300% at Initech and led 500 people. [insert achievement here]'],employer:'Initech'},{expectedRevision:0,now:NOW});
 const kinds=D.checkLetterFacts(l,{variant:v,job:j}).map(x=>x.kind);
 for(const k of ['unsupported-fact','employer-mismatch','placeholder'])assert(kinds.includes(k),k);
 const changed={...v,revision:3};assert(D.checkLetterFacts(l,{variant:changed,job:j}).some(x=>x.kind==='cv-changed'));
 assert(D.checkLetterFacts(l,{variant:{...v,id:'otherVariant1'},job:j}).some(x=>x.kind==='wrong-variant'));
 const ok=D.reviseLetter(D.createLetterDraft({variant:v,job:j,now:NOW,idFactory:()=> 'letterAAA002'}),{body:['I managed a team of 12 and kept stock control tight.']},{expectedRevision:0,now:NOW});
 assert.deepEqual(D.checkLetterFacts(ok,{variant:v,job:j}).filter(x=>x.severity==='error'),[]);
});
test('letter exports to PDF and DOCX with the CV branding (colour/paper) and all text intact',async()=>{
 const v=variant();let l=D.createLetterDraft({variant:v,job:job(),now:NOW,idFactory:()=> 'letterAAA001'});
 l=D.reviseLetter(l,{body:['First paragraph about stores.','Second paragraph about teams.']},{expectedRevision:0,now:NOW});
 const pdf=D.exportLetter(l,{cvAppearance:v.appearance},'pdf'),again=D.exportLetter(l,{cvAppearance:v.appearance},'pdf');
 assert.deepEqual([...pdf.bytes],[...again.bytes]);assert.equal(pdf.sourceVariantId,l.id);assert.equal(pdf.sourceRevision,1);
 const lines=extractPdfText(pdf.bytes).flat();
 for(const t of ['Dear Hiring Manager,','First paragraph about stores.','Second paragraph about teams.','Yours sincerely,'])assert(lines.includes(t),t);
 assert(lines.indexOf('First paragraph about stores.')<lines.indexOf('Second paragraph about teams.'));
 assert(Buffer.from(pdf.bytes).toString('latin1').includes('/MediaBox [0 0 612 792]'),'CV paper size carried over');
 assert(Buffer.from(pdf.bytes).toString('latin1').includes('0.118 0.227 0.373 rg'),'CV accent colour carried over');
 const docx=D.exportLetter(l,{cvAppearance:v.appearance},'docx');
 const xml=bytesToText((await unzipEntries(docx.bytes,{inflate})).get('word/document.xml'));
 assert(xml.includes('First paragraph about stores.')&&xml.includes('w:w="12240"'));
});

/* ---------- Stage 14 ---------- */
const book0=()=>D.tracker.emptyBook();
function seedBook(){let b=D.tracker.addApplication(book0(),{company:'Acme',role:'Manager',expectedRevision:0,now:NOW,idFactory:()=> 'appAAAA0001'});
 return D.tracker.addApplication(b,{company:'Bolt',role:'Supervisor',status:'Applied',date:'2026-10-01',expectedRevision:1,now:NOW,idFactory:()=> 'appAAAA0002'});}
test('tracker commands are immutable, revisioned and validated',()=>{
 const b=seedBook();assert.equal(b.revision,2);assert.equal(b.applications.length,2);
 const s=D.tracker.setStatus(b,'appAAAA0001','Interview',{expectedRevision:2,now:'2026-11-18T00:00:00.000Z'});
 assert.equal(b.applications[0].status,'Saved');assert.equal(s.applications[0].status,'Interview');
 assert.deepEqual(s.applications[0].history.map(h=>[h.from,h.to]),[[null,'Saved'],['Saved','Interview']]);
 assert.throws(()=>D.tracker.setStatus(s,'appAAAA0001','Applied',{expectedRevision:2}),e=>e.code==='CONFLICT');
 assert.throws(()=>D.tracker.setStatus(s,'appAAAA0001','Bogus',{expectedRevision:3}),e=>e.code==='INVALID');
 assert.throws(()=>D.tracker.addApplication(s,{company:'X',url:'javascript:alert(1)',expectedRevision:3}),e=>e.code==='INVALID');
 assert.throws(()=>D.tracker.addApplication(s,{company:'',role:'',expectedRevision:3}),e=>e.code==='INVALID');
 assert.throws(()=>D.tracker.updateApplication(s,'appAAAA0001',{status:'Offer'},{expectedRevision:3}),/not editable/);
 assert.throws(()=>D.tracker.removeApplication(s,'appAAAA0001',{expectedRevision:3}),e=>e.code==='UNCONFIRMED');
 assert.equal(D.tracker.removeApplication(s,'appAAAA0001',{expectedRevision:3,confirmed:true}).applications.length,1);
});
test('linked CV and letter revisions are recorded exactly and wrong versions are flagged',()=>{
 let p=profile();p=createCVVariant(p,{id:'variantAAA001',name:'Acme',expectedRevision:0,now:NOW});
 const v=p.variants[0];
 let l=D.createLetterDraft({variant:v,job:job(),now:NOW,idFactory:()=> 'letterAAA001'});
 let b=D.tracker.linkDocuments(seedBook(),'appAAAA0001',{cvVariantId:v.id,cvRevision:v.revision,coverLetterId:l.id,coverLetterRevision:l.revision,expectedRevision:2,now:NOW});
 const app=()=>b.applications[0];
 assert.deepEqual(D.tracker.verifyLinks(app(),{profile:p,letters:[l]}),[]);
 const d=doc();d.summary='Changed after sending';
 const p2=updateCVVariant(p,{variantId:v.id,document:d,expectedRevision:1,now:NOW});
 assert(D.tracker.verifyLinks(app(),{profile:p2,letters:[l]}).some(x=>x.kind==='stale'&&x.target==='cv'));
 const l2=D.reviseLetter(l,{opening:'Changed.'},{expectedRevision:0,now:NOW});
 assert(D.tracker.verifyLinks(app(),{profile:p,letters:[l2]}).some(x=>x.kind==='stale'&&x.target==='letter'));
 assert(D.tracker.verifyLinks(app(),{profile:p,letters:[]}).some(x=>x.kind==='missing'&&x.target==='letter'));
 assert(D.tracker.verifyLinks(app(),{profile:{...p,variants:[],master:p.master},letters:[l]}).some(x=>x.kind==='missing'&&x.target==='cv'));
 const other={...l,cvVariantId:'masterABC123'};
 assert(D.tracker.verifyLinks(app(),{profile:p,letters:[other]}).some(x=>x.kind==='mismatch'));
 assert.throws(()=>D.tracker.linkDocuments(b,'appAAAA0001',{cvVariantId:v.id,expectedRevision:3}),e=>e.code==='INVALID','exact revision is mandatory');
});
test('kanban, list filters, due tasks and honest reminder capability',()=>{
 let b=seedBook();b=D.tracker.addTask(b,'appAAAA0001',{title:'Send thanks',due:'2026-11-15',expectedRevision:2,now:NOW});
 b=D.tracker.addTask(b,'appAAAA0001',{title:'Follow up',due:'2026-11-20',expectedRevision:3,now:NOW});
 b=D.tracker.addTask(b,'appAAAA0002',{title:'Far away',due:'2027-03-01',expectedRevision:4,now:NOW});
 const k=D.tracker.kanban(b);assert.equal(k.Saved.length,1);assert.equal(k.Applied.length,1);assert.equal(Object.keys(k).length,6);
 assert.deepEqual(D.tracker.listApplications(b,{query:'bolt'}).map(a=>a.company),['Bolt']);
 assert.deepEqual(D.tracker.listApplications(b,{sort:'company'}).map(a=>a.company),['Acme','Bolt']);
 const due=D.tracker.dueTasks(b,'2026-11-17');assert.deepEqual(due.map(x=>[x.task.title,x.state]),[['Send thanks','overdue'],['Follow up','upcoming']]);
 const t=b.applications[0].tasks[0].id;b=D.tracker.toggleTask(b,'appAAAA0001',t,{expectedRevision:5,now:NOW});assert.equal(D.tracker.dueTasks(b,'2026-11-17').length,1);
 const cap=D.tracker.reminderCapability({notification:{permission:'default'}});assert(cap.needsPermission&&!cap.browserNotifications&&/closed/.test(cap.limitation));
 assert.equal(D.tracker.reminderCapability({}).browserNotifications,false);
});
test('backup round-trips and import is review-first with explicit conflict policy',()=>{
 const b=D.tracker.setStatus(seedBook(),'appAAAA0001','Offer',{expectedRevision:2,now:NOW});
 const text=D.exportBook(b);
 const rv=D.reviewBookImport(text,D.tracker.emptyBook());
 assert.equal(rv.status,'review-required');assert.equal(rv.incoming.length,2);assert.deepEqual(rv.conflicts,[]);
 assert.throws(()=>D.approveBookImport(D.tracker.emptyBook(),rv,{expectedRevision:0}),e=>e.code==='UNCONFIRMED');
 const restored=D.approveBookImport(D.tracker.emptyBook(),rv,{confirmed:true,expectedRevision:0});
 assert.deepEqual(restored.applications,b.applications);
 const rv2=D.reviewBookImport(text,b);assert.equal(rv2.conflicts.length,2);
 const edited=D.tracker.updateApplication(b,'appAAAA0001',{notes:'local note'},{expectedRevision:3,now:NOW});
 assert.equal(D.approveBookImport(edited,rv2,{confirmed:true,expectedRevision:4}).applications[0].notes,'local note','keep-existing by default');
 assert.equal(D.approveBookImport(edited,rv2,{confirmed:true,expectedRevision:4,conflictPolicy:'replace'}).applications[0].notes,'');
 assert.throws(()=>D.approveBookImport(edited,rv2,{confirmed:true,expectedRevision:0}),e=>e.code==='CONFLICT');
});
test('legacy stage-6 applications import; corrupt or hostile files are blocked',()=>{
 const legacy=[{id:'legacyApp001',company:'Old Co',role:'Clerk',location:'',url:'https://x.test',notes:'',date:'2025-01-02',status:'Applied'}];
 const rv=D.reviewBookImport(JSON.stringify(legacy),D.tracker.emptyBook());
 assert.equal(rv.status,'review-required');assert(rv.warnings.some(w=>/Legacy/.test(w)));assert.deepEqual(rv.incoming[0].tasks,[]);
 for(const bad of ['not json','{}','[{"id":"x"}]',JSON.stringify({kind:'ledger-applications',version:9,book:{applications:[]}})])assert.equal(D.reviewBookImport(bad,D.tracker.emptyBook()).status,'blocked');
 const hostile=JSON.stringify({kind:'ledger-applications',version:1,book:{applications:[{id:'appHOSTILE1',status:'Saved',company:'X',role:'Y',url:'javascript:alert(1)'},{id:'../evil',status:'Saved'}]}});
 const r=D.reviewBookImport(hostile,D.tracker.emptyBook());assert.equal(r.incoming.length,1);assert.equal(r.incoming[0].url,'');assert(r.warnings.length>=2);
});
test('CSV export neutralises spreadsheet formulas and quotes fields',()=>{
 let b=D.tracker.addApplication(D.tracker.emptyBook(),{company:'=HYPERLINK("http://evil")',role:'Say "hi", ok',notes:'line1\nline2',expectedRevision:0,now:NOW,idFactory:()=> 'appAAAA0009'});
 const csv=D.exportCsv(b);assert(csv.includes("\"'=HYPERLINK(\"\"http://evil\"\")\"")||csv.includes("'=HYPERLINK"));assert(csv.includes('"Say ""hi"", ok"'));assert(!/(^|,)=HYPERLINK/.test(csv));
});

/* ---------- Stage 15 ---------- */
test('interview questions are labelled by source and examples never claim user facts',()=>{
 const j=parseJobText('Retail Team Leader\nRequirements\n- Lead a team of shop-floor staff\n- Handle customer complaints\nNice to have\n- Spanish',{idFactory:idf('r')}).job;
 const qs=D.buildQuestions({job:{...j,originalText:'Lead a team. Customer service. Handle complaints.'},document:doc()});
 const bySource=s=>qs.filter(q=>q.source===s);
 assert.equal(bySource('job-requirement').length,2,'preferred requirements are not turned into must-answer questions');
 assert(bySource('your-role').some(q=>/Operations Manager at Acme Retail/.test(q.text)));
 assert(bySource('example').length>=2&&bySource('example').every(q=>q.note&&/Generic|generic/.test(q.note)));
 assert(new Set(qs.map(q=>q.id)).size===qs.length);
});
test('STAR stories and practice sessions: validation, timer, scoring and summary',()=>{
 let se=D.emptySession({id:'sessionAAA01',jobTargetId:'jobAAAAAA1'});
 se=D.addStory(se,{title:'Rota crisis',context:'Two staff left',task:'Cover the rota',actions:'We reorganised shifts',results:'Shops stayed open',expectedRevision:0,idFactory:()=> 'storyAAA001'});
 const c=D.storyCompleteness(se.stories[0]);assert(c.complete);assert(c.notes.some(n=>/no figure/.test(n))&&c.notes.some(n=>/"we"/.test(n)));
 assert.equal(D.storyCompleteness({context:'x'}).missing.length,3);
 assert.throws(()=>D.updateStory(se,'storyAAA001',{id:'z'},{expectedRevision:1}),/not editable/);
 assert.throws(()=>D.addStory(se,{expectedRevision:0}),e=>e.code==='CONFLICT');
 se=D.startPractice(se,{questionId:'q1',questionText:'Tell me about a time',limitSeconds:60,now:1000,expectedRevision:1});
 assert.throws(()=>D.startPractice(se,{questionText:'again',now:2000,expectedRevision:2}),/Finish the current/);
 const pid=se.practice[0].id;
 assert.throws(()=>D.finishPractice(se,pid,{now:5000,scores:{structure:9},expectedRevision:2}),e=>e.code==='INVALID');
 se=D.finishPractice(se,pid,{now:91000,scores:{structure:4,evidence:2,clarity:3,concision:3},notes:'Too long',expectedRevision:2});
 assert.equal(se.practice[0].elapsedSeconds,90);assert.equal(se.practice[0].overTime,true);
 const sum=D.practiceSummary(se);assert.deepEqual([sum.answers,sum.overTime,sum.averages.structure,sum.selfAssessed],[1,1,4,true]);
});
test('interview data exports, restores and is cleared only on confirmation; pack exports offline',async()=>{
 let se=D.addStory(D.emptySession({id:'sessionAAA01'}),{title:'Rota crisis',context:'c',task:'t',actions:'a',results:'r',expectedRevision:0,idFactory:()=> 'storyAAA001'});
 assert.deepEqual(D.importSession(D.exportSession(se)),se);
 for(const bad of ['x','{}',JSON.stringify({kind:'ledger-interview-session',version:1,session:{id:'x',stories:[],practice:[]}})])assert.throws(()=>D.importSession(bad),e=>e.code==='INVALID');
 assert.throws(()=>D.clearSession(se,{expectedRevision:1}),e=>e.code==='UNCONFIRMED');
 const cleared=D.clearSession(se,{confirmed:true,expectedRevision:1});assert.equal(cleared.stories.length,0);assert.equal(cleared.id,se.id);
 const questions=D.buildQuestions({job:job(),document:doc()});
 const pack=D.exportPreparationPack({session:se,questions,candidateName:'Ada Example',role:'Operations Manager'},'pdf');
 const text=extractPdfText(pack.bytes).flat().join('\n');
 assert(text.includes('Rota crisis')&&text.includes('Result: r')&&text.includes('(generic example)')&&text.includes('After each practice answer'));
 const saved=globalThis.fetch;globalThis.fetch=()=>{throw new Error('network');};try{D.exportPreparationPack({session:se,questions},'docx');}finally{globalThis.fetch=saved;}
});

/* ---------- Stage 16 ---------- */
const PASTE=`Operations Manager | Retail
About
Experienced store operator.
Experience
Ops Manager
Acme Retail · Full-time
Jan 2021 - Present · 5 yrs
Led store teams.
Supervisor
Bolt Stores
Jan 2016 - Dec 2019 · 4 yrs
Education
Example University`;
test('CSV parser handles quotes, embedded newlines and BOM; rejects unterminated quotes',()=>{
 assert.deepEqual(D.parseCsv('﻿a,b\r\n"x, y","He said ""hi""\nthere"\r\n'),[['a','b'],['x, y','He said "hi"\nthere']]);
 assert.throws(()=>D.parseCsv('a,"b'),e=>e.code==='INVALID');
});
test('official export and pasted text are parsed; URLs are refused (no scraping)',()=>{
 const o=D.fromOfficialExport({profileCsv:'First Name,Last Name,Headline,Summary\nAda,Example,"Ops Manager, Retail","About ""me"""\n',
  positionsCsv:'Company Name,Title,Description,Location,Started On,Finished On\nAcme Retail,Ops Manager,,Leeds,Jan 2020,\n'});
 assert.equal(o.headline,'Ops Manager, Retail');assert.equal(o.about,'About "me"');assert.equal(o.positions[0].company,'Acme Retail');assert.equal(o.source,'official-export');
 assert.throws(()=>D.fromOfficialExport({profileCsv:'a,b\n1,2\n'}),e=>e.code==='INVALID');
 const p=D.fromPastedText(PASTE);
 assert.equal(p.headline,'Operations Manager | Retail');assert.equal(p.positions.length,2);
 assert.deepEqual([p.positions[0].title,p.positions[0].company,p.positions[0].start,p.positions[0].end],['Ops Manager','Acme Retail','Jan 2021','']);
 assert.equal(p.positions[0].description,'Led store teams.');assert.equal(p.positions[1].company,'Bolt Stores');
 assert.throws(()=>D.fromPastedText('https://www.linkedin.com/in/someone'),/never fetches/);
 assert.throws(()=>D.fromPastedText('  '),e=>e.code==='INVALID');
});
test('LinkedIn vs CV: differences are reported read-only; suggestions cite the CV and pass the fact guard',()=>{
 const li=D.fromPastedText(PASTE),d=doc(),before=JSON.stringify(d);
 const r=D.coachLinkedIn(li,d);
 const kinds=r.findings.map(f=>f.kind);
 assert(kinds.includes('title-differs')&&kinds.includes('start-differs'));
 assert(r.findings.find(f=>f.kind==='title-differs').citations[0].startsWith('experience[e1]'));
 assert(r.suggestions.every(s=>s.citations.length&&s.unsupportedFact===false&&s.status==='proposed'));
 const head=r.suggestions.find(s=>s.path==='headline');assert.equal(head.after,'Operations Manager | Scheduling | Stock control | Team training');
 assert(!r.suggestions.some(s=>s.path==='about'),'about exists on LinkedIn, so no overwrite suggestion');
 assert.equal(JSON.stringify(d),before);assert(/Nothing was fetched/.test(r.notice));
 const long=D.coachLinkedIn({source:'pasted',headline:'x'.repeat(230),about:'',positions:[]},d);assert(long.findings.some(f=>f.kind==='headline-length'));
 const fromScratch=D.coachLinkedIn({source:'pasted',headline:'',about:'',positions:[{title:'Supervisor',company:'Bolt Stores',start:'2016',end:'2019',description:''}]},d);
 assert(fromScratch.suggestions.some(s=>s.path==='about')&&fromScratch.suggestions.some(s=>s.path==='position:Bolt Stores'&&/Scheduled rotas for 8 staff/.test(s.after)));
});
test('region advice is guidance only and never edits; every region is marked unreviewed',()=>{
 assert(D.REGIONS.length>=12&&D.REGIONS.every(r=>r.reviewStatus==='unreviewed-general-guidance'&&r.paper&&r.pages));
 const d=doc();d.personalInfo.dateOfBirth='1990-01-01';d.personalInfo.maritalStatus='Married';const before=JSON.stringify(d);
 const us=D.regionChecks('us',{document:d,appearance:{paper:'A4',photo:true}});
 const k=us.findings.map(f=>f.kind);for(const x of ['paper','photo','personal-detail','guidance'])assert(k.includes(x),x);
 assert(us.findings.filter(f=>f.kind==='personal-detail').length===2);assert(/not been reviewed/.test(us.disclaimer));assert.equal(JSON.stringify(d),before);
 assert(!D.regionChecks('uk',{document:doc(),appearance:{paper:'A4'}}).findings.some(f=>f.severity==='warning'));
 assert.throws(()=>D.regionChecks('xx',{document:d}),e=>e.code==='INVALID');
});
test('locale labels fall back honestly and flag the Arabic/RTL renderer limitation',()=>{
 assert.equal(D.sectionLabels('fr').labels.experience,'Expérience professionnelle');
 const ar=D.sectionLabels('ar');assert.equal(ar.dir,'rtl');assert(/DOCX/.test(ar.rendererNote));assert.equal(ar.reviewStatus,'unreviewed-by-native-speaker');
 const xx=D.sectionLabels('xx');assert.equal(xx.fallback,true);assert.equal(xx.labels.summary,'Summary');
 for(const l of Object.values(D.LOCALES))assert.deepEqual(Object.keys(l.labels),Object.keys(D.LOCALES.en.labels));
});

test('new-format application backups reject invalid status, nested fields and conflict policies',()=>{
 const base={kind:'ledger-applications',version:1,book:{applications:[{
  id:'appSafe00001',status:'Saved',company:'Retail',role:'Lead',url:'',
  location:'',notes:'',jobText:'',date:'2026-11-17',contacts:[],tasks:[],history:[]
 }]}};
 const probe=patch=>D.reviewBookImport(JSON.stringify({ ...base,book:{applications:[{...base.book.applications[0],...patch}]} }),D.tracker.emptyBook());
 for(const patch of [{status:'Hired'}, {company:23}, {date:'2026-02-31'},
  {contacts:[{name:42}]},{tasks:[{id:'taskSafe001',title:'Call',due:'2026-11-17',done:'yes'}]},
  {cvVariantId:'variantABC123',cvRevision:'one'}]){
  const r=probe(patch);assert.equal(r.status,'blocked',JSON.stringify(patch));assert.equal(r.incoming.length,0);
 }
 const good=probe({});assert.equal(good.status,'review-required');
 assert.throws(()=>D.approveBookImport(D.tracker.emptyBook(),good,
  {confirmed:true,expectedRevision:0,conflictPolicy:'silently-merge'}),e=>e.code==='INVALID');
});
