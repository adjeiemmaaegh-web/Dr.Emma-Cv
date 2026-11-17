import test from 'node:test';
import assert from 'node:assert/strict';
import {CLEAN,ctx,FIXTURES,JOB} from './fixtures.mjs';
import {RULES,runAtsChecks,coverageMatrix,parseJobText,compareToDocument,buildTailoringSuggestions,applyApprovedSuggestions,analyzeWriting,createAiPort,detectUnsupportedClaims} from '../../src/features/intelligence/index.mjs';
import {renderDocumentArtifact} from '../../src/features/documents/index.mjs';
import {createCareerProfile} from '../../src/domain/profile/career-profile.mjs';
const NOW='2026-11-17T10:00:00.000Z';

/* ---------- Stage 9 ---------- */
test('every ATS rule is explained, has a false-positive policy and a named fixture',()=>{
 assert.equal(new Set(RULES.map(r=>r.id)).size,RULES.length);
 assert(RULES.length>=30,'rule count '+RULES.length);
 for(const r of RULES){assert(r.explanation&&r.falsePositive&&r.title,r.id);assert(FIXTURES[r.fixture],'missing fixture '+r.fixture);}
 assert(coverageMatrix().every(m=>m.hasExplanation&&m.hasFalsePositivePolicy));
});
test('a clean CV has no errors or warnings',()=>{
 const r=runAtsChecks(ctx(CLEAN()));
 assert.deepEqual(r.findings.filter(f=>f.severity!=='info'),[]);assert.deepEqual(r.rulesFailed,[]);assert.equal(r.rulesRun,RULES.length);
 assert(/not a score/i.test(r.disclaimer));assert.equal('score' in r,false);
});
for(const rule of RULES)test('rule '+rule.id+' fires on its fixture "'+rule.fixture+'" and not on the clean CV',()=>{
 const {document,extra}=FIXTURES[rule.fixture](CLEAN());
 const hit=runAtsChecks(ctx(document,extra),{rules:[rule]});
 assert(hit.findings.length>0,rule.id+' did not fire');
 for(const f of hit.findings)assert.equal(f.ruleId,rule.id);
 assert.equal(runAtsChecks(ctx(CLEAN()),{rules:[rule]}).findings.filter(f=>f.severity!=='info'||rule.id==='x').length,0);
});
test('a crashing rule is reported, not hidden',()=>{
 const bad={id:'x.bad',title:'bad',severity:'error',explanation:'e',falsePositive:'f',fixture:'x',run(){throw new Error('boom');}};
 const r=runAtsChecks(ctx(CLEAN()),{rules:[bad]});assert.equal(r.rulesFailed[0].ruleId,'x.bad');assert.equal(r.rulesRun,0);
});
test('rules inspect the REAL exported artifact from Group B, not only raw fields',()=>{
 const variant={id:'variantABC123',revision:1,document:CLEAN(),appearance:{template:'creative'}};
 const art=renderDocumentArtifact(variant,'pdf');
 const r=runAtsChecks({document:variant.document,appearance:variant.appearance,artifact:art,now:new Date(NOW)});
 assert(r.usedExportedArtifact);
 assert(r.findings.some(f=>f.ruleId==='layout.columns'),'sidebar template warning must propagate');
 assert(!r.findings.some(f=>f.ruleId.startsWith('export.')&&f.severity==='error'),'faithful export has no error');
 const tampered={...art,text:art.text.replace('Acme Retail','')};
 assert(runAtsChecks({document:variant.document,appearance:{},artifact:tampered,now:new Date(NOW)}).findings.some(f=>f.ruleId==='export.text'));
});
test('ATS checks reject a missing document',()=>assert.throws(()=>runAtsChecks({}),e=>e.code==='INVALID'));

/* ---------- Stage 10 ---------- */
test('vacancy parser separates required, preferred and ignores benefits/about text',()=>{
 const p=parseJobText(JOB,{idFactory:(()=>{let i=0;return()=>'reqAAA'+(i++);})()});
 const req=p.job.requirements;
 assert.equal(req.length,6);
 assert.deepEqual(req.map(r=>r.priority),['required','required','required','required','preferred','preferred']);
 assert(!req.some(r=>/parking|growing/i.test(r.text)));
 assert.equal(p.duties.length,2);assert.equal(p.job.originalText,JOB.slice(0,JOB.length));
 assert(p.keywords.includes('stock')||p.keywords.includes('team'));
 assert.equal(parseJobText('Senior Chef\nRequirements\n- Cooking').seniority,'senior');
});
test('vacancy parser bounds input and warns when nothing is recognised',()=>{
 assert.throws(()=>parseJobText('  '),e=>e.code==='INVALID');
 const p=parseJobText('We need a person who likes cats.');assert(p.warnings.some(w=>/No requirement/.test(w)));
 assert(parseJobText('x\n'.repeat(40000)).warnings.some(w=>/NOT analysed/.test(w)));
});
test('every comparison finding cites the requirement and real CV text, or states missing evidence',()=>{
 const {job}=parseJobText(JOB);const c=compareToDocument(job,CLEAN());
 const byText=t=>c.results.find(r=>r.requirement.includes(t));
 const stock=byText('stock control');assert.equal(stock.status,'evidenced');assert(stock.citations.some(x=>/Stock control|stock counts/i.test(x.excerpt)));
 const team=byText('managing a team');assert.notEqual(team.status,'no-evidence');assert(team.citations.length);
 const k8s=byText('Kubernetes');assert.equal(k8s.status,'partial'.length?k8s.status:'');assert(['no-evidence','partial'].includes(k8s.status));
 assert(c.results.filter(r=>r.status==='no-evidence').every(r=>/does not mean you lack it/.test(r.note)&&r.citations.length===0));
 assert(c.results.every(r=>r.requirementId&&r.requirement));assert(/not a prediction/i.test(c.disclaimer));
 const spanish=byText('Spanish');assert.equal(spanish.status,'no-evidence');
 for(const r of c.results)for(const cite of r.citations)assert(cite.excerpt.length>0&&cite.path);
 assert.equal(c.summary.total,6);assert.equal(c.summary.evidenced+c.summary.partial+c.summary.noEvidence+c.summary.notAssessable,6);
});

/* ---------- claims guard ---------- */
test('unsupported-claim guard flags invented numbers, names and credentials but not CV facts',()=>{
 const src='Managed a team of 12 at Acme Retail. Reduced waste.';
 assert.deepEqual(detectUnsupportedClaims('Managed a team of 12 at Acme Retail',src),[]);
 assert(detectUnsupportedClaims('Managed a team of 40',src).some(i=>i.type==='number'));
 assert(detectUnsupportedClaims('Reduced waste by 30%',src).some(i=>i.text.includes('30')));
 assert(detectUnsupportedClaims('Worked at Globex Corporation',src).some(i=>i.type==='name'));
 assert(detectUnsupportedClaims('Certified expert',src).some(i=>i.type==='credential'));
});

/* ---------- Stage 11 ---------- */
const seedProfile=()=>createCareerProfile({id:'profileABC123',now:NOW,idFactory:()=> 'masterABC123',document:CLEAN()});
function setup(){
 const {job}=parseJobText(JOB,{id:'jobAAAAAA1',idFactory:(()=>{let i=0;return()=>'reqAAA'+(i++);})()});
 const profile=seedProfile();const doc=profile.master.document;
 const comparison=compareToDocument(job,doc);
 return {job,profile,doc,comparison,...buildTailoringSuggestions({document:doc,job,comparison})};
}
test('tailoring proposes only reorder/summary suggestions grounded in the CV, plus prompts for gaps',()=>{
 const {suggestions,prompts,doc}=setup();
 assert(suggestions.length>0);
 for(const s of suggestions){assert(['proposed'].includes(s.status));assert.equal(s.unsupportedFact,false,s.id+' '+JSON.stringify(s.issues));assert(s.explanation);}
 const skills=suggestions.find(s=>s.path==='skills');
 assert.deepEqual([...skills.after.split(', ')].sort(),[...skills.before.split(', ')].sort(),'no skill added or removed');
 assert(prompts.some(p=>/Kubernetes/.test(p.requirement)));
 assert(prompts.every(p=>/If it is true/.test(p.message)));
 assert.equal(JSON.stringify(doc),JSON.stringify(CLEAN()));
});
test('nothing is applied without approval; master is never modified; variant is linked to the job',()=>{
 const {job,profile,suggestions}=setup();
 const none=applyApprovedSuggestions(profile,{job,suggestions,decisions:{},expectedRevision:0,now:NOW});
 assert.equal(none.applied.length,0);assert.equal(none.profile.variants.length,1);
 assert.deepEqual(none.profile.variants[0].document,profile.master.document);
 assert.equal(none.profile.variants[0].targetJobId,'jobAAAAAA1');
 const dec=Object.fromEntries(suggestions.map(s=>[s.id,'approved']));
 const all=applyApprovedSuggestions(profile,{job,suggestions,decisions:dec,expectedRevision:0,now:NOW});
 assert(all.applied.length>0);
 assert.deepEqual(all.profile.master.document,profile.master.document,'master untouched');
 assert.equal(profile.variants.length,0,'input profile not mutated');
 const v=all.profile.variants[0].document;
 assert.deepEqual(v.skills.map(s=>s.name).sort(),CLEAN().skills.map(s=>s.name).sort());
 assert.equal(v.experience.length,2);
 const rejected=applyApprovedSuggestions(profile,{job,suggestions,decisions:Object.fromEntries(suggestions.map(s=>[s.id,'rejected'])),expectedRevision:0,now:NOW});
 assert.equal(rejected.applied.length,0);assert(rejected.skipped.every(s=>s.reason==='rejected'));
});
test('bullet reordering keeps every line and its wording',()=>{
 const {job,profile,suggestions}=setup();
 const dec=Object.fromEntries(suggestions.map(s=>[s.id,'approved']));
 const out=applyApprovedSuggestions(profile,{job,suggestions,decisions:dec,expectedRevision:0,now:NOW}).profile.variants[0].document;
 const lines=h=>[...h.matchAll(/<li>(.*?)<\/li>/g)].map(m=>m[1]).sort();
 out.experience.forEach((e,i)=>assert.deepEqual(lines(e.description),lines(CLEAN().experience[i].description)));
});
test('an unsupported suggestion is refused unless the user edits it into supported text',()=>{
 const {job,profile}=setup();
 const bad={id:'sg-x',path:'summary',before:'',after:'Led 500 engineers',explanation:'x',evidenceIds:[],unsupportedFact:true,status:'proposed',operation:{type:'set-summary',text:'Led 500 engineers'}};
 let r=applyApprovedSuggestions(profile,{job,suggestions:[bad],decisions:{'sg-x':'approved'},expectedRevision:0,now:NOW});
 assert.equal(r.applied.length,0);assert(/unsupported-fact/.test(r.skipped[0].reason));
 r=applyApprovedSuggestions(profile,{job,suggestions:[bad],decisions:{'sg-x':{status:'approved',after:'Led 900 engineers'}},expectedRevision:0,now:NOW});
 assert.equal(r.applied.length,0,'edited text must still be supported by the CV');
 r=applyApprovedSuggestions(profile,{job,suggestions:[bad],decisions:{'sg-x':{status:'approved',after:'Operations manager running stores.'}},expectedRevision:0,now:NOW});
 assert.deepEqual(r.applied,['sg-x']);assert.equal(r.profile.variants[0].document.summary,'Operations manager running stores.');
});
test('stale revision and stale suggestions are rejected safely',()=>{
 const {job,profile,suggestions}=setup();
 assert.throws(()=>applyApprovedSuggestions(profile,{job,suggestions,decisions:{},expectedRevision:5,now:NOW}),e=>e.code==='CONFLICT');
 assert.throws(()=>applyApprovedSuggestions(profile,{job:{id:'x'},suggestions,decisions:{},expectedRevision:0}),e=>e.code==='INVALID');
 const sk=suggestions.find(s=>s.path==='skills');
 const changed=structuredClone(profile);changed.master.document.skills.pop();
 const r=applyApprovedSuggestions(changed,{job,suggestions:[sk],decisions:{[sk.id]:'approved'},expectedRevision:0,now:NOW});
 assert.equal(r.applied.length,0);assert(/changed/.test(r.skipped[0].reason));
});
test('tailoring works with no AI key and no network',()=>{
 const saved=globalThis.fetch;globalThis.fetch=()=>{throw new Error('network used');};
 try{assert(setup().suggestions.length>0);}finally{globalThis.fetch=saved;}
});

/* ---------- Stage 12 ---------- */
test('writing checks work offline and propose conservative rewrites only',()=>{
 const d=CLEAN();d.experience[0].description='<ul><li>Responsible for managing the rota</li><li>I led my team</li><li>The stock was counted weekly</li><li>Helped with deliveries</li></ul>';
 d.summary='A team player who is a hard worker.';
 const w=analyzeWriting(d);const kinds=new Set(w.map(x=>x.kind));
 for(const k of ['weak-opening','first-person','passive','cliche'])assert(kinds.has(k),k);
 const weak=w.find(x=>x.kind==='weak-opening'&&x.after);assert.equal(weak.after,'Managed the rota');
 assert.equal(w.find(x=>x.kind==='first-person'&&x.after).after,'Led my team');
 assert(w.every(x=>x.requiresReview===true));
 assert(w.every(x=>!x.after||detectUnsupportedClaims(x.after,x.before).length===0),'rewrites introduce no new facts');
 const m=analyzeWriting({...CLEAN(),experience:[{id:'z',title:'t',employer:'e',description:'<ul><li>Increased sales across the region quickly</li></ul>'}]});
 assert(m.some(x=>x.kind==='missing-metric'&&x.after===undefined),'never invents a figure');
});
test('AI port: nothing is sent without exact one-time consent; key never leaks',async()=>{
 const sent=[];const KEY='sk-test-1234567890';
 const port=createAiPort({provider:'example',endpointHost:'api.example.test',send:async x=>{sent.push(x);if(x.body.task==='fail')throw new Error('bad key '+x.key);return {text:'Managed a team of 12.'};}});
 const req=port.prepare({task:'rewrite',text:'Managed a team of 12.'});
 assert(req.disclosure.willSend.includes('Managed a team of 12.'));assert.equal(req.disclosure.host,'api.example.test');
 await assert.rejects(()=>port.execute(req,{}),e=>e.code==='UNCONFIRMED');
 await assert.rejects(()=>port.execute(req,{consent:{acknowledged:true,requestId:'other'}}),e=>e.code==='UNCONFIRMED');
 await assert.rejects(()=>port.execute(req,{consent:{acknowledged:true,requestId:req.id}}),e=>e.code==='UNAVAILABLE','needs a key');
 assert.equal(sent.length,0,'no request may leave before consent and a key');
 port.setKey(KEY);
 const r=await port.execute(req,{consent:{acknowledged:true,requestId:req.id}});
 assert.equal(sent.length,1);assert.equal(r.text,'Managed a team of 12.');
 await assert.rejects(()=>port.execute(req,{consent:{acknowledged:true,requestId:req.id}}),e=>e.code==='INVALID','consent is single-use');
 assert(!JSON.stringify(port).includes(KEY));assert(!String(Object.keys(port)).includes('key')||!('key' in port));
 const bad=port.prepare({task:'fail',text:'x'});
 await assert.rejects(()=>port.execute(bad,{consent:{acknowledged:true,requestId:bad.id}}),e=>!e.message.includes(KEY)&&e.message.includes('[redacted]'));
 port.clearKey();assert.equal(port.hasKey(),false);
 const s=port.toSuggestion({path:'summary',before:'Managed a team of 12.',after:'Managed a team of 300 at Globex.',sourceText:'Managed a team of 12.'});
 assert.equal(s.unsupportedFact,true);assert.equal(s.status,'proposed');assert.equal(s.source,'ai');
});

test('approved edits on initially safe tailoring suggestions still reject invented facts',()=>{
 const {job,profile,suggestions}=setup();
 const summary=suggestions.find(s=>s.operation.type==='set-summary');
 assert(summary&&summary.unsupportedFact===false);
 const out=applyApprovedSuggestions(profile,{job,suggestions:[summary],
  decisions:{[summary.id]:{status:'approved',after:'Managed 999 people at Initech Corporation.'}},
  expectedRevision:0,now:NOW});
 assert.equal(out.applied.length,0);
 assert.match(out.skipped[0].reason,/unsupported-fact/);
});
test('stale reordered bullet text is refused even when line count matches',()=>{
 const {job,profile,suggestions}=setup();
 const bullet=suggestions.find(s=>s.operation.type==='reorder-lines');
 assert(bullet,'test needs a reorder suggestion');
 const changed=structuredClone(profile);
 const entry=changed.master.document.experience.find((e,i)=>(e.id??i)===bullet.operation.experienceKey);
 assert(entry);
 entry.description=entry.description.replace(/(<li>)([^<]+)/,'$1A freshly edited achievement');
 const out=applyApprovedSuggestions(changed,{job,suggestions:[bullet],
  decisions:{[bullet.id]:'approved'},expectedRevision:0,now:NOW});
 assert.equal(out.applied.length,0);
 assert.match(out.skipped[0].reason,/changed/);
 assert.match(out.profile.variants[0].document.experience.find(e=>e.id===entry.id).description,/freshly edited/);
});
