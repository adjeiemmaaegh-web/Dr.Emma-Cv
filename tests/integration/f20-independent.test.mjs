/**
 * Stage F20 independent regression gates. F owns tests, never feature writes.
 * Fixtures are invented and contain no private CVs, keys, or personal records.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {SYNTH_DOC} from '../documents/fixtures.mjs';
import {createCareerProfile} from '../../src/domain/profile/career-profile.mjs';
import {createMemoryRevisionStore} from '../../src/domain/storage/revision-store.mjs';
import {createMemoryCareerJourneyStore,emptyCareerJourney} from '../../src/domain/storage/career-journey-store.mjs';
import {createMemoryApplicationStore} from '../../src/domain/storage/application-revision-store.mjs';
import {createCareerProfileBackup,previewCareerProfileBackup,approveCareerProfileBackup} from '../../src/domain/storage/profile-backup.mjs';
import {parseJobText,compareToDocument,buildTailoringSuggestions,applyApprovedSuggestions,runAtsChecks,RULES} from '../../src/features/intelligence/index.mjs';
import {renderDocumentArtifact} from '../../src/features/export/export-service.mjs';
import {createLetterDraft,reviseLetter,checkLetterFacts} from '../../src/features/cover-letter/letter.mjs';
import {emptyBook,addApplication,linkDocuments,verifyLinks} from '../../src/features/tracker/tracker.mjs';
import {exportBook,reviewBookImport,approveBookImport} from '../../src/features/tracker/io.mjs';
import {winAnsi} from '../../src/features/documents/pdf-writer.mjs';

const now='2026-11-17T10:00:00.000Z';
const profile=()=>createCareerProfile({id:'profileF20fixture01',idFactory:()=>'masterF20fixture01',now,document:SYNTH_DOC()});
const job=()=>parseJobText('Operations Manager\nRequirements\n- Stock control and team scheduling\n- Skilled with PostgreSQL administration',{id:'jobF20fixture01',role:'Operations Manager',employer:'Example Company'}).job;
const snapshot=x=>JSON.stringify(x);

test('F20: adverse summary with invented metric, employer and credential is not committed despite approval',()=>{
 const p=profile(),j=job(),master=snapshot(p.master.document);
 const sg={id:'sg-F20-unsupported',path:'summary',before:p.master.document.summary,
  after:'I increased revenue by 870% at Globex and earned a PhD from MIT.',
  unsupportedFact:false,operation:{type:'set-summary',text:'I increased revenue by 870% at Globex and earned a PhD from MIT.'}};
 const output=applyApprovedSuggestions(p,{job:j,suggestions:[sg],decisions:{[sg.id]:'approved'},
  expectedRevision:0,now,idFactory:()=>'variantF20unsafe01'});
 assert.equal(output.applied.length,0);
 assert(output.skipped.some(x=>x.id===sg.id&&/unsupported-fact/.test(x.reason)));
 assert.equal(snapshot(p.master.document),master);
 assert.equal(output.profile.variants[0].document.summary,p.master.document.summary);
});
test('F20: edited previously-safe suggestion becomes unsafe and is rechecked',()=>{
 const p=profile(),j=job(),sg={id:'sg-F20-edited01',path:'summary',before:p.master.document.summary,
  after:p.master.document.summary,unsupportedFact:false,
  operation:{type:'set-summary',text:p.master.document.summary}};
 const out=applyApprovedSuggestions(p,{job:j,suggestions:[sg],
  decisions:{[sg.id]:{status:'approved',after:'Won 900 million dollars at a fictional company in 2025.'}},
  expectedRevision:0,now,idFactory:()=>'variantF20unsafe02'});
 assert.deepEqual(out.applied,[]);
 assert(out.skipped.some(x=>/unsupported-fact/.test(x.reason)));
 assert.equal(out.profile.master.document.summary,p.master.document.summary);
});
test('F20: changed summary blocks stale suggestions; master and original CV are unaffected',()=>{
 const p=profile(),j=job(),sg={id:'sg-F20-stale01',path:'summary',before:'outdated summary',after:'new',
  operation:{type:'set-summary',text:'new'},unsupportedFact:false};
 const out=applyApprovedSuggestions(p,{job:j,suggestions:[sg],decisions:{[sg.id]:'approved'},
  expectedRevision:0,now,idFactory:()=>'variantF20stale01'});
 assert.deepEqual(out.applied,[]);
 assert.match(out.skipped[0].reason,/changed since suggestion/);
 assert.equal(snapshot(p.master.document),snapshot(out.profile.master.document));
});
test('F20: missing vacancy evidence cannot be presented as a matched candidate fact',()=>{
 const j=job(),d=SYNTH_DOC(),comparison=compareToDocument(j,d);
 assert.equal(comparison.results.length,j.requirements.length);
 const missing=comparison.results.find(x=>x.requirement.includes('PostgreSQL'));
 assert(missing&&missing.status==='no-evidence');
 assert.equal(missing.citations.length,0);
 assert.match(missing.note,/No supporting text/);
 const suggestions=buildTailoringSuggestions({document:d,job:j,comparison});
 assert(suggestions.prompts.some(x=>/PostgreSQL|missing|evidence/i.test(x.message)));
});
test('F20: explicit backup preview blocks tampered data and does not write repository',async()=>{
 const p=profile(),repo=createMemoryRevisionStore();
 await repo.save(p.id,p,null);
 const backup=await createCareerProfileBackup(p,{now}),verified=await previewCareerProfileBackup(backup);
 assert.equal(verified.status,'review-required');
 assert.throws(()=>approveCareerProfileBackup(verified,{confirmed:false}),e=>e.code==='UNCONFIRMED');
 const tampered=JSON.parse(backup);
 tampered.payload=tampered.payload.replace('Synthetic summary','Fabricated summary');
 const reject=await previewCareerProfileBackup(JSON.stringify(tampered));
 assert.equal(reject.status,'blocked');
 assert.equal((await repo.load(p.id)).revision,0);
 assert.equal((await repo.load(p.id)).value.master.document.summary,p.master.document.summary);
});
test('F20: independent CAS stores reject stale concurrent writers without mutating winning record',async()=>{
 const p=profile(),repo=createMemoryRevisionStore(),a=await repo.save(p.id,p,null);
 const b=await repo.load(p.id);assert.equal(b.revision,0);
 const j=job(),cr=createMemoryCareerJourneyStore();
 await cr.save(p.id,emptyCareerJourney(p.id),null);
 const chosen=await cr.load(p.id);
 await cr.save(p.id,{...chosen.value,job:j},chosen.revision);
 await assert.rejects(cr.save(p.id,chosen.value,chosen.revision),e=>e.code==='CONFLICT');
 assert.equal((await cr.load(p.id)).value.job.id,j.id);
 const apps=createMemoryApplicationStore();
 const first=await apps.save(emptyBook(),null);
 const next=addApplication(first,{company:'Example Company',role:'Operations Manager',
  expectedRevision:0,now,idFactory:()=>'appF20fixture01'});
 await apps.save(next,0);
 await assert.rejects(apps.save(next,0),e=>e.code==='CONFLICT');
 assert.equal((await apps.load()).applications.length,1);
 await assert.rejects(repo.save(p.id,p,null),e=>e.code==='CONFLICT');
});
test('F20: linked application names exact revision and flags stale CV, letter, job mismatch',()=>{
 const p=profile(),j=job(),v=p.master;
 const letter=createLetterDraft({variant:v,job:j,now,idFactory:()=>'letterF20fixture01'});
 let book=addApplication(emptyBook(),{company:'Example Company',role:j.role,jobTargetId:j.id,
  expectedRevision:0,now,idFactory:()=>'appF20fixture02'});
 book=linkDocuments(book,book.applications[0].id,
  {cvVariantId:v.id,cvRevision:v.revision,coverLetterId:letter.id,coverLetterRevision:letter.revision,expectedRevision:1,now});
 assert.deepEqual(verifyLinks(book.applications[0],{profile:p,letters:[letter]}),[]);
 const wrong={...letter,jobTargetId:'jobOtherF2001',cvVariantId:'cvOtherF20001',revision:letter.revision+1};
 const anomalies=verifyLinks(book.applications[0],{profile:p,letters:[wrong]});
 assert(anomalies.some(x=>x.kind==='stale'&&x.target==='letter'));
 assert(anomalies.some(x=>x.kind==='mismatch'&&x.target==='letter'));
 const moved={...p,master:{...p.master,revision:p.master.revision+1}};
 assert(verifyLinks(book.applications[0],{profile:moved,letters:[letter]}).some(x=>x.kind==='stale'&&x.target==='cv'));
});
test('F20: application restore is reviewed, bounded, and requires explicit consent',()=>{
 let book=addApplication(emptyBook(),{company:'Example Company',role:'Engineer',expectedRevision:0,now,idFactory:()=>'appF20fixture03'});
 const reviewed=reviewBookImport(exportBook(book),emptyBook());
 assert.equal(reviewed.status,'review-required');
 assert.throws(()=>approveBookImport(emptyBook(),reviewed,{confirmed:false,expectedRevision:0}),e=>e.code==='UNCONFIRMED');
 assert.throws(()=>approveBookImport(emptyBook(),reviewed,{confirmed:true,conflictPolicy:'unsafe',expectedRevision:0}),e=>e.code==='INVALID');
 const restored=approveBookImport(emptyBook(),reviewed,{confirmed:true,expectedRevision:0});
 assert.equal(restored.applications.length,1);
 assert.equal(restored.applications[0].id,'appF20fixture03');
});
test('F20: 30 local ATS checks have executable metadata; no predictive ATS score is emitted',()=>{
 assert.equal(RULES.length,30);
 assert.equal(new Set(RULES.map(x=>x.id)).size,30);
 for(const rule of RULES)assert(rule.fixture&&rule.explanation&&rule.falsePositive&&typeof rule.run==='function');
 const pdf=renderDocumentArtifact({id:'masterF20fixture01',revision:0,document:SYNTH_DOC(),
  appearance:{template:'modern',paper:'A4'}},'pdf');
 const report=runAtsChecks({document:SYNTH_DOC(),appearance:{paper:'A4'},artifact:pdf,now:new Date(now)});
 assert.equal(report.rulesRun,30);
 assert.deepEqual(report.rulesFailed,[]);
 assert.equal('score' in report,false);
 assert.match(report.disclaimer,/cannot predict/);
});
test('F20: PDF unsupported scripts are disclosed as export warnings rather than silently considered faithful',()=>{
 const d=SYNTH_DOC();d.summary='عمل باللغة العربية، अनुभव in Hindi.';
 const v={id:'masterF20fixture01',revision:0,document:d,appearance:{paper:'A4'}};
 const pdf=renderDocumentArtifact(v,'pdf');
 assert(pdf.warnings.some(x=>/replaced|Unicode|encoding/i.test(x)));
 const docx=renderDocumentArtifact(v,'docx');
 assert(!docx.warnings.some(x=>/replaced.*Unicode/i.test(x)));
 assert.equal(winAnsi('مرحبا').lossy,true);
});
