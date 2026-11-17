import test from 'node:test';
import assert from 'node:assert/strict';
import {zipStore,utf8} from '../../src/features/documents/zip.mjs';
import {fromOfficialExport,fromOfficialZip,compareLinkedInDetails,linkedinActionPlan,coachLinkedIn} from '../../src/features/linkedin-coach/linkedin.mjs';
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
