import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../../src/features/onboarding/journeys.mjs';
import {renderDocumentArtifact} from '../../src/features/documents/index.mjs';
import {extractPdfText} from '../../src/features/documents/pdf-writer.mjs';
import {runAtsChecks} from '../../src/features/intelligence/index.mjs';
import {validLegacyDocument} from '../../src/domain/storage/legacy-shape.mjs';
const BASICS={firstName:'Ama',lastName:'Mensah',email:'ama@example.test',phone:'',city:'Accra'};
const EXP={jobTitle:'Retail Supervisor',employer:'Acme Stores',start:'Jan 2020',current:true,end:'',achievements:'Trained 4 new colleagues\n- Opened the store daily'};
function walkCreate(){
 let s=J.startJourney('create');
 for(const v of [BASICS,{title:'Retail Supervisor'},EXP,{degree:'BA Business',school:'Example University',start:'2012',end:'2015'},{skills:'Customer service, Stock control, Customer service'},{summary:''}]){
  const r=J.submit(s,v);assert.deepEqual(r.errors,[]);s=r.state;
 }
 return s;
}
test('a first-time user can create, check and export a coherent CV with no account, key or network',()=>{
 const saved=globalThis.fetch;globalThis.fetch=()=>{throw new Error('network');};
 try{
  const s=walkCreate();assert.equal(s.step,'finish');
  const {document:doc}=J.finish(s);
  assert(validLegacyDocument(doc));assert.equal(doc.skills.length,2,'duplicates removed');
  assert.equal(doc.experience[0].description,'<ul><li>Trained 4 new colleagues</li><li>Opened the store daily</li></ul>');
  const art=renderDocumentArtifact({id:'variantABC123',revision:0,document:doc,appearance:{}},'pdf');
  const lines=extractPdfText(art.bytes).flat();
  assert(lines.includes('Ama Mensah')&&lines.includes('Retail Supervisor | Acme Stores'));
  assert.deepEqual(runAtsChecks({document:doc,appearance:{},artifact:art}).findings.filter(f=>f.severity==='error'),[]);
 }finally{globalThis.fetch=saved;}
});
test('the document contains only what the user typed: examples are hints, never values',()=>{
 const s=walkCreate(),{document:d}=J.finish(s);
 const all=JSON.stringify(d);
 for(const ex of ['name@example.com','Customer service, Stock control, Scheduling','Reliable retail supervisor','Dec 2023'])assert(!all.includes(ex),ex);
 assert.equal(d.summary,'');
 const view=J.getView(J.startJourney('create'));assert(view.fields.find(f=>f.id==='email').example&&view.fields.every(f=>f.value===''));
});
test('validation gives specific, helpful messages and never advances on error',()=>{
 let s=J.startJourney('create');
 let r=J.submit(s,{firstName:'',lastName:'M',email:'bad'});
 assert.equal(r.state,s);assert.deepEqual(r.errors.map(e=>e.field),['firstName','email']);
 assert(/does not look right/.test(r.errors[1].message));assert(r.errors.every(e=>!/undefined|\[object/.test(e.message)));
 s=J.submit(s,BASICS).state;s=J.submit(s,{title:'X'}).state;
 r=J.submit(s,{...EXP,current:false,end:''});assert(r.errors.some(e=>/end date, or tick/.test(e.message)));
 r=J.submit(s,{...EXP,current:false,start:'2022',end:'2019'});assert(r.errors.some(e=>/before the start/.test(e.message)));
 r=J.submit(s,{...EXP,start:'last spring'});assert(r.errors.some(e=>/Use a year/.test(e.message)));
 r=J.submit(s,{...EXP,employer:'x'.repeat(201)});assert(r.errors.some(e=>/too long/.test(e.message)));
});
test('optional steps can be skipped; required ones cannot; back works; progress is accurate',()=>{
 let s=J.startJourney('create');assert.throws(()=>J.skip(s),e=>e.code==='INVALID');
 s=J.submit(J.submit(s,BASICS).state,{title:'Cook'}).state;
 assert.equal(J.progress(s).label,'Step 3 of 7: Your most recent job');
 s=J.skip(s);assert.equal(s.step,'education');assert.deepEqual(s.skipped,['experience']);
 s=J.back(s);assert.equal(s.step,'experience');
 s=J.back(J.back(J.back(s)));assert.equal(s.step,'basics');assert.equal(J.back(s),s);
 const doc=J.buildDocument({basics:BASICS,target:{title:'Cook'}});assert(validLegacyDocument(doc));assert.equal(doc.experience.length,0);
});
test('journeys that need a CV are explained, not dead ends',()=>{
 for(const k of ['improve','tailor']){const a=J.availability(k,{hasDocument:false});assert(!a.available&&/Create a CV/.test(a.reason));assert.throws(()=>J.startJourney(k),e=>e.code==='UNAVAILABLE');}
 assert(J.availability('improve',{hasDocument:true}).available);
 assert.throws(()=>J.startJourney('nope'),e=>e.code==='INVALID');
});
const OLD_CV=`Grace Hopper
Senior Engineer
grace@example.test

Experience
Senior Engineer at Navy Labs
Jan 2018 - Present
- Led compiler team.

Skills
COBOL, Testing
`;
test('import journey: paste, review, accept only what is ticked; nothing else is kept',()=>{
 let s=J.startJourney('import');
 let r=J.submit(s,{text:'   '});assert.equal(r.errors[0].field,'text');
 r=J.submit(s,{text:'just some words with no structure at all'});assert(/could not find anything/.test(r.errors[0].message)||r.errors.length===0&&true);
 s=J.submit(s,{text:OLD_CV}).state;assert.equal(s.step,'review');
 const v=J.getView(s);assert(v.items.length>=4&&v.items.every(i=>i.label));
 assert.equal(J.submit(s,{accepted:[]}).errors[0].field,'accepted');
 assert.equal(J.submit(s,{accepted:['bogus']}).errors[0].field,'accepted');
 s=J.submit(s,{accepted:['personalInfo.name','experience[0]']}).state;
 const out=J.finish(s);
 assert.equal(out.document.personalInfo.firstName,'Grace');assert(!out.document.personalInfo.email);assert.equal(out.document.skills.length,0);assert.equal(out.document.experience.length,1);
 assert.equal(out.evidence[0].verifiedByUser,false);
});
const MY_DOC=()=>J.finish(walkCreate()).document;
test('improve journey lists specific, explained findings from the user\'s CV',()=>{
 const s=J.startJourney('improve',{hasDocument:true});const v=J.getView(s,{document:MY_DOC()});
 assert.equal(v.kind,'report');assert(v.rows.length>0&&v.rows.every(r=>r.text&&r.why));assert(/not a score/i.test(v.disclaimer));
 assert.throws(()=>J.getView(s,{}),e=>e.code==='UNAVAILABLE');
});
test('tailor journey compares with the pasted advert and prepares suggestions without changing the CV',()=>{
 let s=J.startJourney('tailor',{hasDocument:true});const doc=MY_DOC(),before=JSON.stringify(doc);
 assert.equal(J.submit(s,{jobText:''}).errors[0].field,'jobText');
 s=J.submit(s,{jobText:'Supervisor\nRequirements\n- Stock control experience\n- Kubernetes administration\n',jobRole:'Supervisor',jobEmployer:'Globex'}).state;
 const v=J.getView(s,{document:doc});assert.equal(v.rows.length,2);
 assert(v.rows.some(r=>r.status==='partial')&&v.rows.some(r=>r.status==='no-evidence'&&/does not mean you lack/.test(r.why)));
 assert(v.skillEvidence.items.some(x=>x.skill==='Inventory management'&&x.status==='mentioned'),
  'A skills-list mention without a work example must not be promoted to evidenced experience');
 s=J.submit(s,{}).state;const out=J.finish(s,{document:doc});
 assert(Array.isArray(out.suggestions)&&out.prompts.some(p=>/Kubernetes/.test(p.requirement)));assert.equal(JSON.stringify(doc),before);
 assert.throws(()=>J.finish({...s,step:'job'}),e=>e.code==='INVALID');
});
test('resume later: drafts round-trip, and corrupt or tampered drafts are rejected',()=>{
 let s=J.submit(J.startJourney('create'),BASICS).state;
 const back=J.restoreDraft(J.serializeDraft(s));assert.deepEqual(back,s);
 for(const bad of ['nope','{}',JSON.stringify({kind:'ledger-onboarding-draft',version:2,state:s}),
  JSON.stringify({kind:'ledger-onboarding-draft',version:1,state:{...s,step:'hack'}}),
  JSON.stringify({kind:'ledger-onboarding-draft',version:1,state:{...s,answers:{basics:{firstName:{x:1}}}}}),
  JSON.stringify({kind:'ledger-onboarding-draft',version:1,state:{...s,answers:{nope:{}}}}),
  JSON.stringify({kind:'ledger-onboarding-draft',version:1,state:{...s,kind:'evil'}})])assert.throws(()=>J.restoreDraft(bad),e=>e.code==='INVALID',bad.slice(0,60));
 let imp=J.submit(J.startJourney('import'),{text:OLD_CV}).state;
 const forged=JSON.parse(J.serializeDraft(imp));forged.state.review.items=[{path:'summary',value:'<img onerror=alert(1)>',sourceLine:1,uncertain:false}];
 const restored=J.restoreDraft(JSON.stringify(forged));assert(!JSON.stringify(restored.review).includes('onerror'),'stored review is recomputed, never trusted');
 const noReview=JSON.parse(J.serializeDraft(imp));noReview.state.answers.source.text='';
 assert.throws(()=>J.restoreDraft(JSON.stringify(noReview)),e=>e.code==='INVALID');
});
