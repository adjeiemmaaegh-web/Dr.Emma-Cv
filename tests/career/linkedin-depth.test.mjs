import test from 'node:test';
import assert from 'node:assert/strict';
import {zipStore,utf8} from '../../src/features/documents/zip.mjs';
import {fromOfficialExport,fromOfficialZip,fromPastedText,compareLinkedInDetails,compareWithCv,linkedinActionPlan,coachLinkedIn} from '../../src/features/linkedin-coach/linkedin.mjs';
import {linkedinToCvReview} from '../../src/features/linkedin-coach/to-cv.mjs';
import {approveImportReview} from '../../src/features/import/text-import.mjs';
const doc=()=>({
 personalInfo:{title:'Retail Manager'},
 summary:'Retail operations manager who coached sales teams.',
 experience:[
  {id:'roleABC1',title:'Store Manager',employer:'Atlas Retail',start:'2018',end:'2020',location:'Accra',description:'<ul><li>Managed shifts</li></ul>'},
  {id:'roleABC2',title:'Regional Manager',employer:'Atlas Retail',start:'2020',end:'',location:'Accra',description:'<ul><li>Led teams</li></ul>'}
 ],
 education:[{id:'degreeABC1',school:'City University',degree:'BSc Business'}],
 certifications:[{id:'certABC1',name:'Operations Certificate'}],
 skills:[{id:'skillABC1',name:'Scheduling'},{id:'skillABC2',name:'Customer service'}]
});
const rows={
 profileCsv:'First Name,Last Name,Headline,Summary\nAda,Example,Retail Manager,Operations leader\n',
 positionsCsv:'Title,Company Name,Description,Location,Started On,Finished On\nRegional Manager,Atlas Retail,,Accra,2020,2024\nStore Manager,Atlas Retail,Managed stock,Accra,2018,2020\n',
 skillsCsv:'Name\nScheduling\nReporting\n',
 educationCsv:'School Name,Degree Name,Start Date,End Date\nCity University,BA Marketing,2014,2018\n',
 certificationsCsv:'Name,Authority\nLeadership Certificate,Training Body\n',
 projectsCsv:'Name,Description\nStock review,Local stock reconciliation\n'
};
test('selected LinkedIn CSV categories retain source fields and ignore unrelated personal data',()=>{
 const li=fromOfficialExport(rows);
 assert.equal(li.profileName,'Ada Example');
 assert.equal(li.positions.length,2);
 assert.deepEqual(li.skills,['Scheduling','Reporting']);
 assert.equal(li.education[0].school,'City University');
 assert.equal(li.certifications[0].authority,'Training Body');
 assert.equal(li.projects[0].name,'Stock review');
 assert(li.coverage.skills&&li.coverage.education);
});
test('official ZIP is local-only and excludes messages/connections',async()=>{
 const files=[...Object.entries(rows).map(([k,v])=>({name:'LinkedIn/'+({
  profileCsv:'Profile.csv',positionsCsv:'Positions.csv',skillsCsv:'Skills.csv',educationCsv:'Education.csv',
  certificationsCsv:'Certifications.csv',projectsCsv:'Projects.csv'}[k]),data:utf8(v)})),
  {name:'Messages.csv',data:utf8('Date,Message\n2026-01-01,private content')},
  {name:'Connections.csv',data:utf8('Name,Email\nSecret,secret@example.test')}];
 const li=await fromOfficialZip(zipStore(files));
 assert.equal(li.positions.length,2);
 assert(!JSON.stringify(li).includes('private content'));
 assert(!JSON.stringify(li).includes('secret@example.test'));
 const dup=zipStore([{name:'A/Profile.csv',data:utf8(rows.profileCsv)},{name:'B/Profile.csv',data:utf8(rows.profileCsv)}]);
 await assert.rejects(()=>fromOfficialZip(dup),/Duplicate LinkedIn/);
});
test('multi-role same-employer records compare without reusing one CV position',()=>{
 const li=fromOfficialExport(rows);
 const details=compareLinkedInDetails(li,doc());
 const kinds=details.map(f=>f.kind);
 for(const kind of ['end-differs','skill-cv-only','skill-linkedin-only','education-degree-differs','certification-cv-only','description-missing'])
  assert(kinds.includes(kind),'missing '+kind);
 assert(details.find(x=>x.kind==='end-differs').citations[0].includes('roleABC2'));
 const actions=linkedinActionPlan(li,doc());
 assert(actions.some(a=>a.priority===1));
 assert(actions.every(a=>a.requiresReview&&a.action));
});
test('coaching creates source-cited changes only and leaves source CV untouched',()=>{
 const cv=doc(),original=JSON.stringify(cv),li=fromOfficialExport(rows);
 const result=coachLinkedIn(li,cv);
 assert.equal(JSON.stringify(cv),original);
 assert(result.suggestions.some(s=>s.path==='skills'&&s.after.includes('Customer service')));
 assert(result.suggestions.every(s=>s.status==='proposed'&&s.citations.length&&s.unsupportedFact===false));
 assert(result.findings.some(f=>f.kind==='education-degree-differs'));
 assert(/Nothing was fetched/.test(result.notice));
});

test('LinkedIn conversion is a review, never a master CV overwrite',()=>{
 const li=fromOfficialExport(rows),cv=doc(),before=JSON.stringify(cv);
 const next=(()=>{let n=0;return()=> 'reviewIdABC'+(++n);})();
 const review=linkedinToCvReview(li,{idFactory:next,now:'2026-11-17T10:00:00Z'});
 assert.equal(review.format,'linkedin');
 assert.equal(review.requiresUserConfirmation,true);
 assert(review.items.some(i=>i.path==='experience[0]'&&i.sourceRef.includes('Positions.csv')));
 assert.throws(()=>approveImportReview(review,{accepted:review.items.map(i=>i.path)}),e=>e.code==='UNCONFIRMED');
 const imported=approveImportReview(review,{accepted:review.items.map(i=>i.path),confirmed:true,
  idFactory:next,now:'2026-11-17T10:00:00Z'});
 assert.equal(imported.master.document.experience.length,2);
 assert.equal(imported.master.document.personalInfo.firstName,'Ada');
 assert(imported.evidence.some(e=>e.sourceRef.includes('Positions.csv')));
 assert.equal(JSON.stringify(cv),before);
});

test('missing LinkedIn export categories never imply an empty skills, education or positions profile',()=>{
 const li=fromOfficialExport({profileCsv:'Headline,Summary\nRetail Manager,About\n'});
 const cv=doc();
 const result=coachLinkedIn(li,cv);
 assert(!result.findings.some(x=>/^(cv-only|skill-cv-only|education-cv-only|certification-cv-only)$/.test(x.kind)));
 assert(!result.suggestions.some(x=>x.path==='skills'));
 assert.equal(li.coverage.positions,false);
});
test('repeated employers are matched by role rather than export ordering in every comparison layer',()=>{
 const li=fromOfficialExport(rows),cv=doc(),result=coachLinkedIn(li,cv);
 assert(!result.findings.some(x=>x.kind==='title-differs'||x.kind==='start-differs'),
  JSON.stringify(result.findings.filter(x=>x.kind==='title-differs'||x.kind==='start-differs')));
 assert(result.findings.some(x=>x.kind==='end-differs'&&x.citations[0].includes('roleABC2')));
});

test('ambiguous same-employer roles are not forcibly matched or reported as absent',()=>{
 const linkedin={source:'official-export',headline:'',about:'',coverage:{positions:true,skills:false,education:false,certifications:false,projects:false},
  positions:[{title:'Shift Coordinator',company:'Atlas Retail',start:'',end:''}]};
 const findings=compareWithCv(linkedin,doc());
 assert(findings.some(x=>x.kind==='role-ambiguous'),JSON.stringify(findings));
 assert(!findings.some(x=>x.kind==='title-differs'||x.kind==='cv-only'||x.kind==='linkedin-only'),
  'ambiguity must not create fabricated role mismatch or absence');
});
test('month dates produce specific differences without inventing month for year-only dates',()=>{
 const cv=doc();cv.experience=[{...cv.experience[0],start:'Feb 2018',end:'Nov 2020'}];
 const linkedin={source:'pasted',coverage:{positions:true},positions:[{title:'Store Manager',company:'Atlas Retail',
  start:'Jan 2018',end:'Oct 2020',description:''}]};
 const c=coachLinkedIn(linkedin,cv);
 assert(c.findings.some(x=>x.kind==='start-month-differs'));
 assert(c.findings.some(x=>x.kind==='end-month-differs'));
 linkedin.positions[0].start='2018';linkedin.positions[0].end='2020';
 const yearly=coachLinkedIn(linkedin,cv);
 assert(!yearly.findings.some(x=>/month-differs/.test(x.kind)));
});
test('partial paste text does not manufacture missing positions or skills comparisons',()=>{
 const li=fromPastedText('Retail Operations\nAbout\nResponsible for busy retail stores.');
 assert.equal(li.coverage.positions,false);
 assert.equal(li.coverage.skills,false);
 const result=coachLinkedIn(li,doc());
 assert(!result.findings.some(f=>f.kind==='cv-only'||f.kind==='skill-cv-only'));
 const withSkills=fromPastedText('Retail Operations\nSkills\nScheduling\n• Customer service\nExperience\n');
 assert.equal(withSkills.coverage.skills,true);
 assert.deepEqual(withSkills.skills,['Scheduling','Customer service']);
});
test('education dates, certifications and project differences are surfaced with provenance',()=>{
 const linkedin=fromOfficialExport(rows),cv=doc();
 const issues=compareLinkedInDetails(linkedin,cv);
 assert(issues.some(x=>x.kind==='certification-linkedin-only'));
 assert(issues.some(x=>x.kind==='project-linkedin-only'));
 linkedin.education[0].start='2012';
 cv.education[0].start='2011';
 assert(compareLinkedInDetails(linkedin,cv).some(x=>x.kind==='education-start-differs'));
});
test('duplicate important CSV columns are rejected rather than silently discarding a value',()=>{
 assert.throws(()=>fromOfficialExport({profileCsv:'Headline,Headline,Summary\none,two,some\n'}),e=>e.code==='INVALID');
});
