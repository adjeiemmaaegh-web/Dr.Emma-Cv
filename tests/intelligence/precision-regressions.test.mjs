import test from 'node:test';
import assert from 'node:assert/strict';
import {CLEAN,ctx} from './fixtures.mjs';
import {parseJobText} from '../../src/features/job-match/job-parser.mjs';
import {compareToDocument,extractScopeRequirements} from '../../src/features/job-match/compare.mjs';
import {SKILL_TAXONOMY,SKILL_LEXICON_VERSION,positiveEvidenceText,findPositiveMention,analyzeJobSkills} from '../../src/features/job-match/skill-evidence.mjs';
import {analyzeResumeReadiness} from '../../src/features/intelligence/expanded-review.mjs';

const req=(text,priority='required',id='req1')=>({text,priority,id});
const job=(...requirements)=>({role:'Engineering Lead',requirements});
const find=(r,id)=>r.findings.filter(x=>x.id===id);
const withDesc=(html)=>{const d=CLEAN();d.experience[0].description=html;return d;};

test('skill lexicon is versioned and has no single-letter aliases or duplicate identifiers',()=>{
 assert.match(SKILL_LEXICON_VERSION,/^\d{4}-/);
 assert(SKILL_TAXONOMY.length>=55);
 assert.equal(new Set(SKILL_TAXONOMY.map(x=>x.id)).size,SKILL_TAXONOMY.length);
 assert(SKILL_TAXONOMY.every(x=>x.aliases.every(a=>a.length>=2)));
 assert(SKILL_TAXONOMY.some(x=>x.name==='PLC programming'));
 assert(SKILL_TAXONOMY.some(x=>x.name==='C++'));
});
test('C++, C#, .NET and Java are distinct from C and JavaScript',()=>{
 const q=job(req('Develop software using C++ and C#, .NET framework and Java'));
 const matched=analyzeJobSkills(q,CLEAN()).items.map(x=>x.skill);
 for(const v of ['C++','C#','.NET','Java'])assert(matched.includes(v),v);
 assert(!matched.includes('JavaScript'));
});
test('negative, learning and not-required clauses do not count as positive evidence',()=>{
 for(const text of ['Learning Python','No experience with Python','Never used Python','Have not used Python','Without Python access','Not proficient in Python','Python is not required'])
  assert.equal(findPositiveMention(text,['python']),null,text);
 assert(findPositiveMention('Learning Python; later used Python in production',['python']));
 assert.equal(positiveEvidenceText('No experience with SQL, Python and AWS.').includes('SQL'),false);
 const q=job(req('SQL is not required; Python required'));
 assert.deepEqual(analyzeJobSkills(q,CLEAN()).items.map(x=>x.skill),['Python']);
});
test('a job can require the same skill in multiple requirements without collapsing priorities',()=>{
 const s=analyzeJobSkills(job(req('Python development','required','one'),req('Python automation','preferred','two')),CLEAN());
 const python=s.items.filter(x=>x.skill==='Python');
 assert.equal(python.length,2);
 assert.deepEqual(python.map(x=>x.priority),['required','preferred']);
});
test('CV title alone is only a mention; an actual task with action is described',()=>{
 const d=CLEAN();d.experience[0].title='Python Engineer';
 d.experience[0].description='<ul><li>Handled store operations.</li></ul>';
 let x=analyzeJobSkills(job(req('Python')),d).items[0];
 assert.equal(x.status,'mentioned');
 d.experience[0].description='<ul><li>Designed Python automation for weekly reporting.</li></ul>';
 x=analyzeJobSkills(job(req('Python')),d).items[0];
 assert.equal(x.status,'described');
});
test('unrelated keywords scattered across CV sections do not become full evidence',()=>{
 const d=CLEAN();
 d.summary='Led migration initiatives';
 d.skills=[{name:'SQL'}];
 const report=compareToDocument(job(req('SQL migration for distributed database replication')),d).results[0];
 assert.notEqual(report.status,'evidenced');
 assert(report.citations.length>0);
 assert(report.coLocatedCoverage<1);
});
test('a negated skill in the CV cannot satisfy a job requirement',()=>{
 const d=CLEAN();d.skills=[];d.summary='No experience with Python';
 d.experience.forEach(e=>e.description='<ul><li>Learning Python this year.</li></ul>');
 const match=compareToDocument(job(req('Python programming')),d).results[0];
 assert.equal(match.status,'no-evidence');
 assert.equal(match.citations.length,0);
});
test('team size thresholds are not inferred from an unrelated number',()=>{
 const d=CLEAN();
 const result=compareToDocument(job(req('Experience managing a team of 50+ people')),d).results[0];
 assert.equal(result.status,'partial');
 assert.equal(result.scopes[0].type,'team-size');
 assert.equal(result.scopes[0].minimum,50);
 assert.equal(result.scopes[0].observed,12);
 assert.equal(result.scopes[0].status,'possible-conflict');
});
test('skill-specific duration is not satisfied by unrelated years of work',()=>{
 const d=withDesc('<ul><li>Managed retail stores for 12 years.</li><li>Built Python scripts to monitor inventory.</li></ul>');
 const result=compareToDocument(job(req('5+ years of Python experience')),d).results[0];
 assert.notEqual(result.status,'evidenced');
 assert.equal(result.scopes[0].type,'years-experience');
 assert.equal(result.scopes[0].status,'not-shown');
});
test('duration in the same CV work statement is only textual support, not validation',()=>{
 const d=withDesc('<ul><li>Used Python for 7 years to automate reporting.</li></ul>');
 const result=compareToDocument(job(req('5+ years of Python experience')),d).results[0];
 assert.equal(result.scopes[0].status,'text-supported');
 assert.equal(result.scopes[0].observed,7);
 assert.equal(result.evidenceMeaning,'CV wording only; not independently verified.');
});
test('scope parser finds quantitative requirements and skips irrelevant numbers',()=>{
 const q=extractScopeRequirements('Must have 6+ years of experience and manage 15 staff, with a $30k budget.');
 assert(q.some(x=>x.type==='years-experience'&&x.minimum===6));
 assert(q.some(x=>x.type==='team-size'&&x.minimum===15));
 assert.equal(extractScopeRequirements('Experience with 2025 financial reporting').length,0);
});
test('inline vacancy headings retain important content and explicit priorities',()=>{
 const {job:parsed}=parseJobText('Operations Manager\nRequirements: SQL and Excel\nPreferred: Python and Tableau\nBenefits\n- free parking');
 assert.equal(parsed.requirements.length,2);
 assert.deepEqual(parsed.requirements.map(x=>x.priority),['required','preferred']);
 assert(!parsed.requirements.some(x=>/parking/i.test(x.text)));
});
test('observed category checks distinguish local finding from non-evaluated external benchmarking',()=>{
 const d=withDesc('<ul><li>Managed the the stock count daily.</li></ul>');
 const r=analyzeResumeReadiness(ctx(d));
 const gram=r.coverage.find(x=>x.id==='grammar');
 assert.equal(gram.observed,'review-suggested');
 assert(gram.relatedFindings>=1);
 assert(gram.preview);
 assert.equal(r.coverage.find(x=>x.id==='peer-benchmark').observed,'not-assessed');
 assert.equal(r.coverage.find(x=>x.id==='hard-skills').observed,'not-assessed');
 assert.equal(r.score,null);
});
test('progression signals do not mistake a senior director for a junior role',()=>{
 const d=CLEAN();d.experience=[
  {...d.experience[0],id:'a',title:'Director',employer:'Acme',start:'Jan 2022',end:'',current:true},
  {...d.experience[1],id:'b',title:'Senior Manager',employer:'Acme',start:'Jan 2018',end:'Dec 2021',current:false}
 ];
 const r=analyzeResumeReadiness(ctx(d));
 assert(r.signals.careerProgression>=1);
 assert(r.opportunities.some(x=>x.id==='progression'));
 assert(r.prioritizedCorrections.every(x=>x.id!=='progression'));
});
