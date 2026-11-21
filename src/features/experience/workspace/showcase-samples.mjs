/**
 * Fictional, immutable showroom fixtures. These examples never read user storage
 * or affect the template gallery's real edit/export paths.
 * Company names and achievements are illustrative rather than customer claims.
 */
import {SAMPLE_DOC} from './store.mjs';

export const FEATURED_CVS=Object.freeze([
 {id:'operations',first:'Amara',last:'Okafor',role:'Procurement & Operations Lead',style:'portrait-rail',family:'Modern editorial',color:'#345d5b',initials:'AO',
  summary:'Operations leader experienced in supplier relations, cost tracking, and dependable service delivery across busy teams.',
  jobs:[
   ['Procurement Lead','Horizon Supply Co.','Accra','2021','Present',['Coordinated purchasing across three teams and maintained accurate vendor records.','Introduced weekly stock checks and improved reorder visibility.']],
   ['Operations Coordinator','Harbour Services','Accra','2017','2021',['Supported daily scheduling, purchasing requests, and team onboarding.']]],
  education:['BSc Business Administration','Coastal University','2013','2017'],skills:['Procurement','Vendor relations','Inventory control','Team leadership']},
 {id:'analytics',first:'Isabel',last:'Morgan',role:'Senior Data Analyst',style:'prestige',family:'Classic & focused',color:'#3b454d',initials:'IM',
  summary:'Data analyst turning complex operational information into clear insights and actionable reporting for cross-functional teams.',
  jobs:[
   ['Senior Data Analyst','Atlas Analytics','London','2021','Present',['Designed reporting dashboards for operational leaders.','Partnered with finance and product colleagues to improve data quality.']],
   ['Business Analyst','Northbridge Labs','London','2018','2021',['Prepared recurring performance reports and documented metric definitions.']]],
  education:['MSc Business Analytics','Westborough University','2017','2018'],skills:['SQL','Dashboards','Data quality','Business reporting']},
 {id:'marketing',first:'Elena',last:'Rivera',role:'Digital Marketing Manager',style:'horizon-teal',family:'Contemporary creative',color:'#386f69',initials:'ER',
  summary:'Digital marketing professional bringing together audience research, campaign planning, and thoughtful brand storytelling.',
  jobs:[
   ['Digital Marketing Manager','Juniper Studio','Madrid','2022','Present',['Led content calendars and reviewed campaign performance.','Coordinated designers and writers across launches.']],
   ['Marketing Specialist','Bluebird Media','Madrid','2018','2022',['Built campaign briefs and maintained reporting templates.']]],
  education:['BA Communications','Central Arts College','2014','2018'],skills:['Campaign planning','SEO','Content strategy','Analytics']},
 {id:'engineering',first:'Daniel',last:'Mensah',role:'Electrical Technician',style:'ats-classic',family:'ATS-first technical',color:'#2b596c',initials:'DM',
  summary:'Hands-on electrical technician focused on safe maintenance, fault isolation, commissioning, and clear equipment records.',
  jobs:[
   ['Electrical Technician','Cedar Works','Kumasi','2020','Present',['Performed preventive maintenance and documented test outcomes.','Assisted fault investigations and followed lockout procedures.']],
   ['Maintenance Assistant','Valley Engineering','Kumasi','2017','2020',['Prepared tools, inspected equipment, and tracked service work.']]],
  education:['Diploma Electrical Engineering','Central Technical Institute','2014','2017'],skills:['Fault finding','Maintenance','Electrical safety','Technical reporting']},
 {id:'design',first:'Maya',last:'Chen',role:'Product Designer',style:'creative-forest',family:'Creative portfolio',color:'#38615b',initials:'MC',
  summary:'Product designer combining accessible interfaces, research insight, and practical collaboration to solve everyday problems.',
  jobs:[
   ['Product Designer','Orchard Digital','Singapore','2021','Present',['Mapped product flows from customer interviews and usability reviews.','Created design systems and worked with engineers on delivery.']],
   ['UI Designer','Studio Form','Singapore','2018','2021',['Designed responsive web experiences and reusable components.']]],
  education:['BA Interaction Design','Eastbridge College','2014','2018'],skills:['User research','Prototyping','Design systems','Accessibility']},
 {id:'leadership',first:'Noah',last:'Bennett',role:'People & Operations Manager',style:'golden-banner',family:'Executive leadership',color:'#a07749',initials:'NB',
  summary:'People-focused manager building consistent operations, training programmes, and strong service teams.',
  jobs:[
   ['People & Operations Manager','Marlow Group','Toronto','2020','Present',['Coordinated training schedules and introduced clearer handover procedures.','Supported managers with performance reviews and staffing plans.']],
   ['Team Supervisor','Northside Partners','Toronto','2016','2020',['Led shift briefings and developed new colleague guidance.']]],
  education:['BCom Management','Lakeside University','2012','2016'],skills:['Team development','Scheduling','Operations','Process improvement']}
]);

/** Creates a fresh, schema-compatible CV each time; never mutates the fixtures. */
export function featuredDocument(example){
 const base=SAMPLE_DOC();
 const jobs=example.jobs.map(([title,employer,location,start,end,bullets],i)=>({
  id:'featured-'+example.id+'-'+(i+1),title,employer,location,start,end,
  current:end==='Present',description:'<ul>'+bullets.map(line=>'<li>'+line+'</li>').join('')+'</ul>'
 }));
 const [degree,school,start,end]=example.education;
 return {...base,
  personalInfo:{...base.personalInfo,firstName:example.first,lastName:example.last,title:example.role,
   email:'sample@example.test',phone:'',city:'',linkedin:'',website:'',photo:''},
  summary:example.summary,experience:jobs,
  education:[{id:'featured-education-'+example.id,degree,school,start,end,description:''}],
  skills:example.skills.map(name=>({name,level:3})),
  languages:[],certifications:[],projects:[],accomplishments:[],customSections:[]
 };
}
