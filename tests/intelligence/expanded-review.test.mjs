import test from 'node:test';
import assert from 'node:assert/strict';
import {CLEAN,ctx} from './fixtures.mjs';
import {ENHANCV_27_COVERAGE,analyzeResumeReadiness,analyzeJobSkills,
 SKILL_TAXONOMY,recognizeSkills,findPositiveMention,compareToDocument} from '../../src/features/intelligence/index.mjs';

const role=(text,priority='required',id='r1')=>({id,text,priority});
const job=(...requirements)=>({role:'Senior Operations Manager',requirements});
const issues=(report,id)=>report.findings.filter(x=>x.id===id);
const withRole=(description)=>{const d=CLEAN();d.experience[0].description=description;return d;};

test('published reference is exactly 27 distinct checks in the seven named categories',()=>{
 assert.equal(ENHANCV_27_COVERAGE.length,27);
 assert.equal(new Set(ENHANCV_27_COVERAGE.map(c=>c.id)).size,27);
 assert.deepEqual([...new Set(ENHANCV_27_COVERAGE.map(c=>c.category))],[
  'ATS essentials','Resume sections','Content','Job tailoring',
  'Recruiter red flags','Bias & discrimination','Seniority & impact'
 ]);
 assert.equal(ENHANCV_27_COVERAGE.filter(c=>c.category==='ATS essentials').length,6);
 assert.equal(ENHANCV_27_COVERAGE.filter(c=>c.category==='Seniority & impact').length,3);
});
test('review gives corrections, limitations and NO fabricated score',()=>{
 const result=analyzeResumeReadiness(ctx(CLEAN()));
 assert.equal(result.coverage.length,27);
 assert.equal(result.score,null);assert.equal(result.scoreValidated,false);
 assert.equal(result.baseline.rulesFailed.length,0);
 assert(result.findings.every(x=>x.correction&&x.explanation&&x.requiresHumanReview));
 assert(result.findings.every((x,i,a)=>!i||({critical:0,high:1,medium:2,low:3}[a[i-1].priority] <= {critical:0,high:1,medium:2,low:3}[x.priority])));
 assert.equal(result.coverage.find(x=>x.id==='parse-rate').status,'not-verified');
 assert.equal(result.coverage.find(x=>x.id==='peer-benchmark').status,'not-verified');
 assert.equal(result.coverage.find(x=>x.id==='linkedin-match').status,'not-verified');
 assert.equal(result.coverage.find(x=>x.id==='hard-skills').status,'needs-input');
 assert.equal(result.coverage.find(x=>x.id==='file-name').status,'needs-input');
});
test('file and job inputs enable limited checks without asserting ATS validity',()=>{
 const d=CLEAN(),r=analyzeResumeReadiness({...ctx(d),job:job(role('SQL and team leadership')),fileName:'untitled.docx',artifact:{text:'ada@example.test\nAcme Retail\nBolt Stores',pageCount:1,warnings:[],sizeBytes:2200000}});
 assert.equal(r.coverage.find(x=>x.id==='hard-skills').status,'limited-check');
 assert.equal(r.coverage.find(x=>x.id==='file-name').status,'limited-check');
 assert(issues(r,'file-name').length);
 assert(issues(r,'file-size').length);
 assert.equal(r.score,null);
});
test('skill recognition uses bounded word/phrase aliases, not substring guesses',()=>{
 assert.equal(recognizeSkills('NoSQL and JavaScripters').some(x=>x.name==='SQL'||x.name==='JavaScript'),false);
 assert(recognizeSkills('Used JavaScript with SQL queries and Microsoft Excel').some(x=>x.name==='JavaScript'));
 assert(recognizeSkills('Used JavaScript with SQL queries and Microsoft Excel').some(x=>x.name==='SQL'));
 assert(recognizeSkills('Used JavaScript with SQL queries and Microsoft Excel').some(x=>x.name==='Excel'));
 assert.equal(findPositiveMention('I have no experience with SQL',['sql']),null);
 assert.equal(findPositiveMention('Learning Python this year',['python']),null);
 assert.equal(findPositiveMention('Worked without AWS access',['aws']),null);
 assert(findPositiveMention('Built dashboards in Power BI',['power bi']));
});
test('required and preferred hard/soft skills are separate and cite actual CV lines',()=>{
 const d=CLEAN(),j=job(role('Stock control and team leadership'),
   role('Python scripting','preferred','r2'),role('Communication skills','preferred','r3'));
 const skills=analyzeJobSkills(j,d);
 const stock=skills.items.find(x=>x.skill==='Inventory management');
 const leader=skills.items.find(x=>x.skill==='Leadership');
 const python=skills.items.find(x=>x.skill==='Python');
 const comm=skills.items.find(x=>x.skill==='Communication');
 assert.equal(stock.status,'described');assert(stock.evidence.some(x=>x.path.includes('experience[')));
 assert.equal(leader.status,'described');
 assert.equal(python.status,'not-found');
 assert.equal(comm.status,'not-found');
 assert.equal(skills.summary.requiredMissing,0);
 assert.equal(skills.score,null);assert.equal(skills.validated,false);
});
test('skills-only and negated mentions do not count as work examples',()=>{
 const d=withRole('<ul><li>Learning Python, no experience with SQL.</li></ul>');
 d.skills.push({name:'Python'});
 const s=analyzeJobSkills(job(role('Python and SQL')),d);
 assert.equal(s.items.find(x=>x.skill==='Python').status,'mentioned');
 assert.equal(s.items.find(x=>x.skill==='SQL').status,'not-found');
 assert(!s.items.find(x=>x.skill==='SQL').evidence.length);
});
test('the existing requirement comparison remains backwards-compatible and adds skill evidence',()=>{
 const d=CLEAN(),j=job(role('Stock control'));
 const result=compareToDocument(j,d);
 assert.equal(result.results.length,1);
 assert(result.results[0].citations.length);
 assert.equal(result.skillEvidence.items[0].skill,'Inventory management');
 assert.equal(result.skillEvidence.score,null);
 assert.match(result.disclaimer,/not a prediction/i);
});
test('grammar and credibility flags are specific, not assertions of fraud',()=>{
 const d=withRole('<ul><li>Managed the the weekly rota!</li><li>World\'s best supervisor at every task</li><li>Supervised a team.</li></ul>');
 const r=analyzeResumeReadiness(ctx(d));
 assert(issues(r,'grammar-repeat').length);
 assert(issues(r,'credibility').length);
 assert(issues(r,'credibility')[0].explanation.includes('not a claim'));
});
test('inconsistent bullet punctuation is flagged with a fix',()=>{
 const d=withRole('<ul><li>Managed a team.</li><li>Reduced waste</li><li>Trained staff.</li></ul>');
 const r=analyzeResumeReadiness(ctx(d));
 assert(issues(r,'bullet-style').length);
});
test('large definite gaps are detected without assuming a reason',()=>{
 const d=CLEAN();
 d.experience[1].end='Dec 2016';
 d.experience[0].start='Jan 2020';
 const r=analyzeResumeReadiness(ctx(d));
 assert(issues(r,'employment-gap').length);
 assert.match(issues(r,'employment-gap')[0].explanation,/legitimate/);
});
test('year-only partial dates do not create speculative gap flags',()=>{
 const d=CLEAN();
 d.experience[1].start='2018';d.experience[1].end='2019';d.experience[0].start='2021';
 assert.equal(issues(analyzeResumeReadiness(ctx(d)),'employment-gap').length,0);
});
test('overlapping jobs are coalesced before determining a gap',()=>{
 const d=CLEAN();d.experience=[
  {...d.experience[0],id:'a',start:'Jan 2022',end:'Dec 2023',current:false},
  {...d.experience[1],id:'b',start:'Jan 2021',end:'Dec 2022',current:false},
  {...d.experience[1],id:'c',start:'Jan 2020',end:'Dec 2021',current:false}
 ];
 assert.equal(issues(analyzeResumeReadiness(ctx(d)),'employment-gap').length,0);
});
test('reversed role dates are identified with a path',()=>{
 const d=CLEAN();d.experience[1].start='Jan 2024';d.experience[1].end='Dec 2020';
 const wrong=issues(analyzeResumeReadiness(ctx(d)),'invalid-period');
 assert(wrong.length);assert(wrong[0].path.includes('.start'));
});
test('explicit age metadata is a cautious optional-field warning; education year is not',()=>{
 const d=CLEAN();
 assert.equal(issues(analyzeResumeReadiness(ctx(d)),'age-bias').length,0);
 d.personalInfo.age='42';
 assert.equal(issues(analyzeResumeReadiness(ctx(d)),'age-bias').length,1);
});
test('leadership job demand without example yields a truthful prompt',()=>{
 const d=CLEAN();d.experience.forEach(e=>e.description='<ul><li>Delivered store operations safely.</li></ul>');
 const r=analyzeResumeReadiness({...ctx(d),job:job(role('Team leadership'))});
 assert(issues(r,'leadership-evidence').length);
 assert(issues(r,'skill-leadership').length);
});
test('seniority progression is discussed only as a possibility',()=>{
 const d=CLEAN();d.experience[1].employer='Acme Retail';
 const r=analyzeResumeReadiness(ctx(d));
 assert(r.signals.careerProgression>=1);
 assert(issues(r,'progression')[0].explanation.includes('not proof'));
});


test('lexicon uses unique stable IDs for punctuation-heavy skills',()=>{
 const ids=SKILL_TAXONOMY.map(s=>s.id);
 assert.equal(new Set(ids).size,ids.length);
 const hits=recognizeSkills('Developed C++ and C# services using .NET');
 for(const skill of ['C++','C#','.NET'])assert(hits.some(h=>h.name===skill),skill);
 const matched=hits.filter(h=>['C++','C#','.NET'].includes(h.name));
 assert.equal(new Set(matched.map(h=>h.id)).size,3);
});
test('negation after or before skill does not produce positive CV evidence',()=>{
 for(const text of [
  'No SQL experience', 'I have no SQL experience',
  'SQL is not required', 'Not SQL', 'Without SQL'
 ])assert.equal(findPositiveMention(text,['sql']),null,text);
 assert(findPositiveMention('No experience with SQL, but used Python at work',['python']));
 assert(findPositiveMention('SQL used in daily reconciliation',['sql']));
});
test('an action in another sentence does not demonstrate a named technical skill',()=>{
 const d=withRole('<ul><li>Managed stock systems. Python</li></ul>');
 d.skills=[];
 const skills=analyzeJobSkills(job(role('Python scripting')),d);
 assert.equal(skills.items.find(x=>x.skill==='Python').status,'mentioned');
});
test('job comparison does not elevate a CV header or skills-list keyword to demonstrated evidence',()=>{
 const d=CLEAN();
 d.summary='Python';
 d.skills=[{name:'Python'}];
 d.experience.forEach(e=>{e.description='<p>Improved store operations.</p>';});
 const out=compareToDocument(job(role('Python')),d);
 assert.equal(out.results[0].status,'partial');
 assert.equal(out.skillEvidence.items.find(x=>x.skill==='Python').status,'mentioned');
 assert.equal(out.score,null);
});
test('numeric requirements cite the matching figure but never claim a person is ineligible',()=>{
 const d=withRole('<ul><li>Used SQL for 2 years.</li></ul>');
 d.skills=[{name:'SQL'}];
 const result=compareToDocument(job(role('At least 5 years of SQL experience')),d).results[0];
 assert.equal(result.scopes.length,1);
 assert.equal(result.scopes[0].minimum,5);
 assert.equal(result.scopes[0].observed,2);
 assert(result.scopes[0].citations[0].path.includes('.description['));
 assert.equal(result.status,'partial');
 assert.match(result.scopes[0].note,/not proof|context/i);
});


test('explicit OR skills are alternatives rather than simultaneous compulsory requirements',()=>{
 const d=withRole('<ul><li>Used Python to automate monthly reports.</li></ul>');
 d.skills=[];
 const j=job(role('Experience with Python or SQL'));
 const skills=analyzeJobSkills(j,d);
 const py=skills.items.find(x=>x.skill==='Python');
 const sql=skills.items.find(x=>x.skill==='SQL');
 assert.equal(py.status,'described');
 assert.equal(sql.status,'alternative-covered');
 assert.equal(skills.summary.requiredMissing,0);
 assert.equal(skills.alternatives.length,1);
 const review=analyzeResumeReadiness({...ctx(d),job:j});
 assert.equal(issues(review,'skill-sql').length,0,'must not urge adding unnecessary skill');
});
test('a missing OR pair counts as one uncovered alternative requirement',()=>{
 const d=withRole('<ul><li>Trained staff on safety procedures.</li></ul>');
 d.skills=[];
 const skills=analyzeJobSkills(job(role('Python or SQL')),d);
 assert.equal(skills.items.filter(x=>x.status==='not-found').length,2);
 assert.equal(skills.summary.requiredMissing,1);
 assert.equal(skills.alternatives.length,1);
});
test('explicit AND skills remain separate required competencies',()=>{
 const d=withRole('<ul><li>Used Python to automate monthly reports.</li></ul>');
 d.skills=[];
 const skills=analyzeJobSkills(job(role('Python and SQL')),d);
 assert.equal(skills.alternatives.length,0);
 assert.equal(skills.items.find(x=>x.skill==='SQL').status,'not-found');
 assert.equal(skills.summary.requiredMissing,1);
});
