export const CLEAN=()=>({personalInfo:{firstName:'Ada',lastName:'Example',title:'Operations Manager',email:'ada@example.test',phone:'+44 20 7946 0000',city:'Leeds',linkedin:'linkedin.com/in/ada-example',website:'ada.example.test'},
 summary:'Operations manager with a record of running stores and training teams.',
 experience:[
  {id:'e1',title:'Operations Manager',employer:'Acme Retail',start:'Jan 2020',end:'',current:true,description:'<ul><li>Managed a team of 12 across two sites.</li><li>Reduced waste by reviewing weekly stock counts.</li><li>Trained new staff on safety procedures.</li></ul>'},
  {id:'e2',title:'Supervisor',employer:'Bolt Stores',start:'Jan 2016',end:'Dec 2019',current:false,description:'<ul><li>Opened and closed the store daily.</li><li>Scheduled rotas for 8 staff.</li><li>Handled customer complaints.</li></ul>'}],
 education:[{id:'d1',degree:'BA Business',school:'Example University',start:'2012',end:'2015'}],
 skills:[{name:'Scheduling'},{name:'Stock control'},{name:'Team training'},{name:'Budget management'}],
 languages:[],certifications:[],projects:[],accomplishments:[],hobbies:'',references:'',customSections:[]});
const NOW=new Date('2026-11-17T00:00:00Z');
export const ctx=(document,extra={})=>({document,appearance:{},now:NOW,...extra});
/** fixture name -> function(clean doc) returning {document,extra?}; each must trigger the rule that cites it. */
export const FIXTURES={
 'missing-name':d=>{d.personalInfo.firstName='';d.personalInfo.lastName='';return {document:d};},
 'bad-email':d=>{d.personalInfo.email='ada@@example';return {document:d};},
 'missing-phone':d=>{d.personalInfo.phone='';return {document:d};},
 'missing-location':d=>{d.personalInfo.city='';return {document:d};},
 'missing-title':d=>{d.personalInfo.title='';return {document:d};},
 'photo-on':d=>({document:d,extra:{appearance:{photo:true}}}),
 'no-summary':d=>{d.summary='';return {document:d};},
 'long-summary':d=>{d.summary=Array(130).fill('word').join(' ');return {document:d};},
 'no-experience':d=>{d.experience=[];return {document:d};},
 'incomplete-role':d=>{d.experience[0].employer='';d.experience[1].start='';return {document:d};},
 'bad-dates':d=>{d.experience[0].start='sometime';return {document:d};},
 'mixed-dates':d=>{d.experience[1].start='2016';d.experience[1].end='12/2019';return {document:d};},
 'wrong-order':d=>{d.experience.reverse();return {document:d};},
 'gap':d=>{d.experience[1].end='Dec 2017';return {document:d};},
 'no-bullets':d=>{d.experience[1].description='';return {document:d};},
 'long-bullet':d=>{d.experience[0].description='<ul><li>'+Array(45).fill('word').join(' ')+'</li></ul>';return {document:d};},
 'weak-verbs':d=>{d.experience[0].description='<ul><li>Responsible for the weekly rota</li></ul>';return {document:d};},
 'pronouns':d=>{d.experience[0].description='<ul><li>I led my team daily</li></ul>';return {document:d};},
 'no-numbers':d=>{d.experience[0].description='<ul><li>Managed a large team</li><li>Reduced waste weekly</li></ul>';d.experience[1].description='<ul><li>Opened the store</li></ul>';return {document:d};},
 'no-skills':d=>{d.skills=[];return {document:d};},
 'many-skills':d=>{d.skills=Array.from({length:26},(_,i)=>({name:'Skill '+i}));return {document:d};},
 'no-education':d=>{d.education=[];return {document:d};},
 'odd-heading':d=>{d.customSections=[{title:'My Journey So Far',content:'x'}];return {document:d};},
 'sidebar-export':d=>({document:d,extra:{artifact:{text:'Ada Example\nada@example.test\nAcme Retail\nBolt Stores',pageCount:1,warnings:['Sidebar template is exported as a single column to keep reading order ATS-safe.']}}}),
 'four-pages':d=>({document:d,extra:{artifact:{text:'Ada Example\nada@example.test\nAcme Retail\nBolt Stores',pageCount:4,warnings:[]}}}),
 'lossy-pdf':d=>({document:d,extra:{artifact:{text:'Ada Example\nada@example.test\nAcme Retail\nBolt Stores',pageCount:1,warnings:['Some characters are outside the PDF standard font encoding and were replaced with "?".']}}}),
 'missing-export-text':d=>({document:d,extra:{artifact:{text:'Ada Example\nBolt Stores',pageCount:1,warnings:[]}}}),
 'swapped-order':d=>({document:d,extra:{artifact:{text:'Bolt Stores\nAcme Retail\nada@example.test',pageCount:1,warnings:[]}}}),
 'unsafe-link':d=>{d.personalInfo.website='javascript:alert(1)';return {document:d};},
 'repeated-start':d=>{d.experience[0].description='<ul><li>Managed rotas</li><li>Managed stock</li><li>Managed budgets</li></ul>';return {document:d};}
};
export const JOB=`Operations Manager - Retail

About us
We are a growing retail group.

Key responsibilities
- Run daily store operations
- Lead and develop a team

Requirements
- Experience managing a team of 10+ people
- Strong stock control and inventory skills
- Knowledge of Kubernetes and cloud infrastructure
- Budget management experience

Nice to have
- Team training qualification
- Fluent Spanish

Benefits
- Free parking
`;
