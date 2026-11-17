import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../src/features/interview/advanced-coach.mjs';
import {emptySession,addStory} from '../../src/features/interview/interview.mjs';
import {extractPdfText} from '../../src/features/documents/pdf-writer.mjs';
const now='2026-11-17T10:00:00Z';
const doc=()=>({personalInfo:{firstName:'Ada',lastName:'Example',title:'Operations Manager'},
 summary:'Retail operations and stock control',
 experience:[{id:'expA',title:'Operations Manager',employer:'Acme Retail',description:'Managed a team of 12. Improved stock control by reviewing weekly inventory.'}],
 education:[],skills:[{name:'Stock control'},{name:'Team supervision'}],certifications:[],projects:[],accomplishments:[],languages:[]});
const job=()=>({id:'jobAAA001',role:'Store Manager',employer:'Sample Retail',
 originalText:'Store Manager\nRequirements\n- Manage a team of staff\n- Stock control\n- Report inventory discrepancies',
 requirements:[{id:'reqA',text:'Manage a team of staff',priority:'required'},{id:'reqB',text:'Stock control',priority:'required'}]});
const se=()=>emptySession({id:'sessionAAA001',jobTargetId:'jobAAA001'});
const star=()=>({title:'Stock review',context:'Stock records were inconsistent',task:'Review the stock records',actions:'I checked inventory with my team',results:'We corrected the stock ledger'});

test('questions retain stable identity, source labels and never fabricate candidate achievements',()=>{
 const p=C.buildInterviewPlan({job:job(),document:doc()});
 assert(p.length>=3&&p.some(q=>q.source==='job-requirement'));
 assert.deepEqual(p.map(x=>x.id),C.buildInterviewPlan({job:job(),document:doc()}).map(x=>x.id));
 assert(p.every(q=>q.coachingHint&&Array.isArray(q.evidence)));
 assert(p.some(q=>q.source==='your-role'));
 for(const q of p)for(const evidence of q.evidence)
  assert(doc().experience[0].description.includes(evidence.excerpt)||
   doc().summary.includes(evidence.excerpt)||doc().skills.some(x=>x.name===evidence.excerpt)||
   doc().experience[0].title+' at '+doc().experience[0].employer===evidence.excerpt);
 assert(!JSON.stringify(p).includes('99% success'));
});
test('STAR framework never invents result metrics or credentials',()=>{
 const t=C.assembleSTARAnswer(star());
 assert(t.includes('Situation: Stock records were inconsistent'));
 assert(t.includes('Result: We corrected the stock ledger'));
 assert(!t.includes('300%'));
 assert(C.assembleSTARAnswer({}).includes('[write a true example]'));
});
test('local answer coaching offers bounded, non-predictive feedback and flags new claims',()=>{
 const f=C.coachInterviewAnswer({answer:'We achieved 777% revenue growth at MythCorp.',story:star(),document:doc(),job:job()});
 assert.equal(f.kind,'local-rule-based-coaching');
 assert(f.notes.some(x=>x.kind==='ownership'));
 assert(f.notes.some(x=>x.kind==='factual-review'));
 assert(f.flaggedClaims.some(x=>x.type==='number'));
 assert.match(f.disclaimer,/cannot confirm truth/);
 assert.throws(()=>C.coachInterviewAnswer({answer:''}),x=>x.code==='INVALID');
});
test('incomplete STAR story leads to follow-up prompts rather than fabricated STAR material',()=>{
 const f=C.coachInterviewAnswer({answer:'I helped our team finish.',story:{context:'A backlog'},document:doc(),job:job()});
 assert(f.notes.filter(x=>x.kind==='star').length>=3);
});
test('AI prompt is local, opt-in, labelled as private and forbids invented claims',()=>{
 const text=C.prepareOptionalAIPrompt({answer:'I checked stock.',question:{text:'Tell me about stock control'},story:star(),document:doc(),job:job()});
 assert.match(text,/private career data/i);
 assert.match(text,/do not invent/i);
 assert(text.includes('Acme Retail')&&text.includes('I checked stock.'));
});
test('pasted AI improvement always needs human approval and identifies unsupported numbers',()=>{
 const v=C.reviewAIDraft({draft:'I increased sales by 9000%.',originalAnswer:'I checked stock.',document:doc(),job:job(),story:star()});
 assert.equal(v.requiresHumanApproval,true);
 assert(v.flaggedClaims.some(x=>x.type==='number'));
 const clean=C.reviewAIDraft({draft:'I checked stock.',originalAnswer:'I checked stock.',document:doc(),job:job()});
 assert.equal(clean.requiresHumanApproval,true);
 assert.throws(()=>C.reviewAIDraft({draft:''}),x=>x.code==='INVALID');
});
test('review persistence is immutable and checks the exact session revision',()=>{
 const s=se(),feedback=C.coachInterviewAnswer({answer:'I checked inventory records.',document:doc(),job:job()});
 const n=C.saveCoachingReview(s,{questionId:'question-0-job-requirement',questionText:'How did you control stock?',answer:'I checked inventory records.',feedback,expectedRevision:0,now,idFactory:()=> 'reviewABC001'});
 assert.equal(s.revision,0);assert.equal(s.reviews,undefined);
 assert.equal(n.revision,1);assert.equal(n.reviews.length,1);
 assert.throws(()=>C.saveCoachingReview(n,{questionText:'Again',answer:'yes',feedback,expectedRevision:0}),x=>x.code==='CONFLICT');
});
test('research sources require user review and safe public HTTPS links',()=>{
 const s=se();
 for(const bad of ['javascript:alert(1)','http://example.org/a','https://localhost/a','https://192.168.1.1/a','https://user:pass@example.org/','https://[::1]/']){
  assert.throws(()=>C.safeResearchUrl(bad),x=>x.code==='INVALID',bad);
 }
 assert.equal(C.safeResearchUrl('https://example.org/about#team'),'https://example.org/about');
 assert.throws(()=>C.addReviewedResearchSource(s,{title:'Example',url:'https://example.org',excerpt:'Source text',expectedRevision:0}),x=>x.code==='UNCONFIRMED');
 assert.throws(()=>C.addReviewedResearchSource(s,{title:'Example',url:'javascript:alert(1)',excerpt:'Source text',userReviewed:true,expectedRevision:0}),x=>x.code==='INVALID');
 const n=C.addReviewedResearchSource(s,{title:'Official company news',url:'https://example.org/news',excerpt:'The company opened a new warehouse.',insight:'Ask about warehouse operations',sourceType:'company-official',userReviewed:true,expectedRevision:0,idFactory:()=> 'sourceABC001',now});
 assert.equal(s.researchSources,undefined);
 assert.equal(n.researchSources[0].reviewedByUser,true);
 assert.throws(()=>C.addReviewedResearchSource(n,{title:'A',url:'https://example.org',excerpt:'B',userReviewed:true,expectedRevision:0}),x=>x.code==='CONFLICT');
});
test('brief contains only provided job requirements and attributed research excerpts',()=>{
 const s=se(),j=job();
 const empty=C.buildCompanyRoleBrief({job:j,session:s});
 assert.equal(empty.facts.length,0);
 assert.match(empty.limitation,/No company facts/);
 const n=C.addReviewedResearchSource(s,{title:'Site',url:'https://example.org/news',excerpt:'The company opened a new warehouse.',insight:'Ask about logistics',sourceType:'company-official',userReviewed:true,expectedRevision:0,idFactory:()=> 'sourceABC001'});
 const b=C.buildCompanyRoleBrief({job:j,session:n});
 assert.equal(b.facts.length,1);
 assert.equal(b.facts[0].citation,'[1]');
 assert.match(b.facts[0].verification,/not independently authenticated/);
 assert(b.requirements.every(r=>r.provenance==='user-pasted job advert'));
 assert(!JSON.stringify(b).includes('industry leader'));
});
test('workbook includes labelled questions, STAR stories, answer reviews and cited company sources',()=>{
 let s=se();s=addStory(s,{...star(),expectedRevision:0,idFactory:()=> 'storyABC001'});
 const f=C.coachInterviewAnswer({answer:'I checked inventory records.',story:star(),document:doc(),job:job()});
 s=C.saveCoachingReview(s,{questionId:'question-0',questionText:'What did you do?',answer:'I checked inventory records.',feedback:f,expectedRevision:1,idFactory:()=> 'reviewABC001'});
 s=C.addReviewedResearchSource(s,{title:'Official news',url:'https://example.org/news',excerpt:'Example company facts.',userReviewed:true,expectedRevision:2,idFactory:()=> 'sourceABC001'});
 const blocks=C.interviewWorkbookBlocks({session:s,questions:C.buildInterviewPlan({job:job(),document:doc()}),job:job(),candidateName:'Ada Example'});
 const all=blocks.map(b=>b.text).join('\n');
 for(const part of ['Stock review','What did you do?','Official news','https://example.org/news','Example company facts.','reviewed'])assert(all.includes(part),part);
 assert(!all.includes('Automatically verified company information'));
});
test('PDF and Word workbooks are local, with expected headers and text content',()=>{
 const args={session:se(),questions:C.buildInterviewPlan({job:job(),document:doc()}),job:job(),candidateName:'Ada Example',appearance:{paper:'Letter'}};
 const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network must not be used')};
 try{
  const pdf=C.exportInterviewWorkbook(args,'pdf'),word=C.exportInterviewWorkbook(args,'docx');
  assert.equal(pdf.mime,'application/pdf');
  assert.equal(Buffer.from(pdf.bytes).subarray(0,4).toString('utf8'),'%PDF');
  assert.equal(Buffer.from(word.bytes).subarray(0,2).toString('utf8'),'PK');
  const text=extractPdfText(pdf.bytes).flat().join('\n');
  assert(text.includes('Interview preparation workbook'));
  assert(text.includes('Store Manager'));
  assert.throws(()=>C.exportInterviewWorkbook(args,'html'),x=>x.code==='INVALID');
 }finally{globalThis.fetch=old}
});
