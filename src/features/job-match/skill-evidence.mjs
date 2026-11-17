/**
 * Versioned, bounded English skill lexicon. These are text observations;
 * no ability, credential, seniority, job fit or ATS outcome is certified.
 * All processing runs locally without CV data leaving the browser.
 */
import {documentUnits} from '../intelligence/text.mjs';
export const SKILL_LEXICON_VERSION='2026-11-17-r3';
// Avoid single-letter / common-verb aliases (R, C, Go).
const DEFINITIONS=[
 ['hard','JavaScript','javascript|js|ecmascript'],['hard','TypeScript','typescript'],
 ['hard','Python','python'],['hard','SQL','sql|structured query language|sql queries'],
 ['hard','Excel','microsoft excel|ms excel|excel|pivot tables'],
 ['hard','Power BI','power bi|powerbi|power query'],['hard','Tableau','tableau'],
 ['hard','AWS','amazon web services|aws'],['hard','Azure','microsoft azure|azure'],
 ['hard','Kubernetes','kubernetes|k8s'],['hard','Docker','docker|docker containers'],
 ['hard','Git','git version control|git repositories|git'],['hard','Linux','linux administration|linux'],
 ['hard','React','react.js|reactjs|react'],['hard','Node.js','node.js|nodejs|node js'],
 ['hard','HTML','html5|html'],['hard','CSS','css3|css'],
 ['hard','Java','java programming|java'],['hard','C++','c++'],['hard','C#','c#|c sharp'],
 ['hard','.NET','.net core|asp.net|.net'],['hard','PHP','php'],
 ['hard','PostgreSQL','postgresql|postgres'],['hard','MySQL','mysql'],
 ['hard','REST APIs','rest apis|restful api|rest api|api integration'],
 ['hard','Data analysis','data analysis|data analytics|analysed data|analyzed data'],
 ['hard','Machine learning','machine learning|ml models|predictive modelling|predictive modeling'],
 ['hard','Cybersecurity','cybersecurity|cyber security|security engineering'],
 ['hard','Network administration','network administration|network configuration|tcp/ip networking'],
 ['hard','Project management','project management|project planning|project delivery'],
 ['hard','Agile delivery','agile delivery|agile methodology|scrum master|scrum'],
 ['hard','Inventory management','inventory management|stock control|stock management|stock counts|inventory reconciliation'],
 ['hard','Budget management','budget management|budgeting|budget planning|managed budgets'],
 ['hard','Financial reporting','financial reporting|financial statements|prepared financial reports'],
 ['hard','Bookkeeping','bookkeeping|account reconciliation|accounts reconciliation'],
 ['hard','Customer relationship management','customer relationship management|crm system|crm software|salesforce crm|salesforce|crm'],
 ['hard','Customer service','customer service|customer support|customer complaints'],
 ['hard','Sales forecasting','sales forecasting|revenue forecasting|sales projections'],
 ['hard','Quality assurance','quality assurance|quality control|qa testing|quality inspections'],
 ['hard','Risk management','risk management|risk assessment|risk mitigation'],
 ['hard','Regulatory compliance','regulatory compliance|compliance monitoring|compliance audits'],
 ['hard','Supply chain','supply chain management|supply chain planning|logistics coordination'],
 ['hard','SAP','sap erp|sap system|sap'],['hard','AutoCAD','autocad|cad drafting'],
 ['hard','PLC programming','plc programming|ladder logic|programmable logic controllers'],
 ['hard','First aid','first aid|cpr certification|cpr training|aed training'],
 ['hard','Graphic design','graphic design|adobe illustrator|adobe photoshop'],
 ['soft','Communication','communication|communication skills|written communication|communicated findings|presented findings|stakeholder communication'],
 ['soft','Leadership','leadership|led a team|lead a team|managed a team|managing a team|supervised staff|team leadership|led teams'],
 ['soft','Teamwork','teamwork|cross-functional collaboration|cross functional collaboration|collaborated with colleagues|collaborated across teams'],
 ['soft','Problem solving','problem solving|problem-solving|resolved complex problems|troubleshooting|root cause analysis'],
 ['soft','Stakeholder management','stakeholder management|stakeholder engagement|managed stakeholders'],
 ['soft','Time management','time management|prioritisation|prioritization|managed deadlines'],
 ['soft','Conflict resolution','conflict resolution|resolved disputes|mediated conflicts'],
 ['soft','Adaptability','adaptability|adapted to change|adapted quickly|adaptation to change'],
 ['soft','Attention to detail','attention to detail|detail-oriented|quality checking'],
 ['soft','Mentoring','mentoring|mentored|coached colleagues|trained new staff|staff coaching'],
 ['soft','Negotiation','negotiation|negotiated contracts|negotiated terms'],
 ['soft','Critical thinking','critical thinking|evaluated alternatives|evaluated options'],
 ['soft','Decision making','decision making|decision-making|made informed decisions'],
 ['soft','Presentation','public speaking|delivered presentations|presentation skills'],
 ['soft','Organization','organizational skills|organisational skills|organized workflows|organised workflows']
];
export const SKILL_TAXONOMY=Object.freeze(DEFINITIONS.map(([kind,name,aliases])=>Object.freeze({
 id:name.toLowerCase().replace(/\+\+/g,'-plus-plus').replace(/#/g,'-sharp').replace(/^\./,'dot-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),kind,name,
 aliases:Object.freeze(aliases.split('|'))
})));
const rxEscape=s=>s.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g,'\\$&');
const boundary=alias=>new RegExp('(^|[^a-z0-9])('+rxEscape(alias).replace(/\s+/g,'\\s+')+')(?![a-z0-9])','gi');
const NOT_REQUIRED=/^\s+(?:(?:is|are)\s+)?(?:not\s+(?:required|used|needed|expected)|no\s+longer\s+used|not\s+(?:a\s+)?requirement)\b/i;
const DENIAL_BEFORE=/\b(?:no|without|not|lacking?|never\s+used|no\s+prior|does\s+not\s+have|do\s+not\s+have)\s*$/i;
/* Suppress explicitly negative/learning clauses; preserve positive claims after but/however. */
const NEGATED=/\b(?:no\s+(?:hands-on\s+)?(?:experience|knowledge)\s+(?:with|in|of)|not\s+(?:proficient|experienced|familiar)\s+(?:with|in)|do\s+not\s+(?:know|use)|have\s+not\s+(?:used|worked\s+with)|never\s+(?:used|worked\s+with)|without\s+(?:using|knowledge\s+of|experience\s+with)?|lack(?:ing)?\s+(?:experience|knowledge)\s+(?:with|of|in)?|learning|currently\s+learning|studying|want\s+to\s+learn|need\s+to\s+learn|plan\s+to\s+learn|interested\s+in\s+learning)\b[^.;!?\n]*?(?=\s+\b(?:but|however|although)\b|[.;!?\n]|$)/gi;
export function positiveEvidenceText(text){
 if(typeof text!=='string')return '';
 return text.replace(NEGATED,' ').replace(/\b(?:but|however)\b/gi,' ');
}
export function findPositiveMention(text,aliases){
 if(typeof text!=='string'||!text||!Array.isArray(aliases))return null;
 const safe=positiveEvidenceText(text);
 for(const alias of [...aliases].sort((a,b)=>b.length-a.length)){
  if(typeof alias!=='string'||alias.length<2)continue;
  for(const m of safe.matchAll(boundary(alias))){
   const index=m.index+m[1].length;
   const before=safe.slice(Math.max(0,index-85),index);
   const after=safe.slice(m.index+m[0].length);
   // Handle reverse-scope negatives: “no SQL experience”, “no Python”, “not C#”.
   if(!DENIAL_BEFORE.test(before)&&!NOT_REQUIRED.test(after))return {term:m[2],index};
  }
 }
 return null;
}
export function recognizeSkills(text){
 return SKILL_TAXONOMY.flatMap(skill=>{
  const mention=findPositiveMention(text,skill.aliases);
  return mention?[{id:skill.id,kind:skill.kind,name:skill.name,term:mention.term}]:[];
 });
}
const EVIDENCE_RANK={experience:0,projects:1,certifications:2,summary:3,skills:4,other:5};
const ACTION=/\b(?:used|built|designed|implemented|deployed|developed|managed|led|supervised|trained|mentored|coached|collaborated|analysed|analyzed|delivered|maintained|reduced|increased|improved|resolved|created|conducted|administered|prepared|coordinated|audited|reviewed|supported|automated|installed|programmed|tested|optimized|optimised|negotiated|produced|tracked)\b/i;
function unitKind(path){
 if(path.startsWith('experience['))return path.includes('.description[')?'experience':'other';
 if(path.startsWith('projects['))return 'projects';
 if(path.startsWith('certifications['))return 'certifications';
 if(path==='summary')return 'summary';
 if(path.startsWith('skills['))return 'skills';
 return 'other';
}
function meaningfulExample(unit,aliases){
 if(unit.source!=='experience'&&unit.source!=='projects')return false;
 // Actions must occur in the same sentence/clause as the actual skill phrase.
 // “Managed cashflow. Learning Python” must not count as demonstrated Python.
 return positiveEvidenceText(unit.excerpt).split(/[.;!?\n]+/).some(part=>
  part.trim().split(/\s+/).filter(Boolean).length>=4&&ACTION.test(part)&&!!findPositiveMention(part,aliases));
}
/** Skill results stay per requirement; duplicate requested skills can have different priorities. */
export function analyzeJobSkills(job,document){
 const requirements=Array.isArray(job?.requirements)?job.requirements:[];
 if(requirements.length>180)throw Object.assign(new Error('Too many requirements for local skill analysis (limit 180).'),{code:'INVALID'});
 const units=documentUnits(document||{}),requested=[];
 for(const [i,req] of requirements.entries()){
  if(typeof req?.text!=='string')continue;
  for(const skill of SKILL_TAXONOMY)if(findPositiveMention(req.text,skill.aliases))
   requested.push({skill,requirementId:req.id??'req-'+i,requirement:req.text,priority:req.priority||'unknown'});
 }
 const items=requested.map(({skill,requirementId,requirement,priority})=>{
  const evidence=units.flatMap(u=>{
   const mention=findPositiveMention(u.text,skill.aliases);
   return mention?[{path:u.path,excerpt:u.text.slice(0,200),term:mention.term,source:unitKind(u.path)}]:[];
  }).sort((a,b)=>EVIDENCE_RANK[a.source]-EVIDENCE_RANK[b.source]).slice(0,5);
  const hasExample=evidence.some(x=>meaningfulExample(x,skill.aliases));
  const status=hasExample?'described':evidence.length?'mentioned':'not-found';
  const correction=status==='not-found'?'If you have used this skill, add a truthful example and the actual context in a relevant role or project.':
   status==='mentioned'?'The wording appears without a specific work example. Add one only if you can substantiate it.':
   'A related action is described. Confirm it demonstrates the advertised requirement and its scope.';
  return {id:skill.id,kind:skill.kind,skill:skill.name,requirementId,requirement,priority,status,
   evidence,explanation:'Whole-phrase local matching with cautious alias and negation rules. CV text is not independent validation of competence.',
   correction};
 });
 const priorityRank={required:0,preferred:1,unknown:2},statusRank={'not-found':0,mentioned:1,described:2};
 items.sort((a,b)=>(priorityRank[a.priority]??2)-(priorityRank[b.priority]??2)||
  statusRank[a.status]-statusRank[b.status]||a.skill.localeCompare(b.skill)||String(a.requirementId).localeCompare(String(b.requirementId)));
 return {items,hardSkills:items.filter(x=>x.kind==='hard'),softSkills:items.filter(x=>x.kind==='soft'),
  summary:{requiredMissing:items.filter(x=>x.priority==='required'&&x.status==='not-found').length,
   mentionedOnly:items.filter(x=>x.status==='mentioned').length,described:items.filter(x=>x.status==='described').length},
  lexiconVersion:SKILL_LEXICON_VERSION,score:null,validated:false,
  disclaimer:'Deterministic, incomplete English phrase checks, not independent proof of ability. A missing mention is not a missing skill. No job-fit percentage or hiring probability.'};
}
