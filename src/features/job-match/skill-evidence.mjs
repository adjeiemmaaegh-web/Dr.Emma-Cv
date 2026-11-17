/**
 * Bounded, explainable English-language skill detection.
 * Positive mention is never treated as verified competence, and no match score is calculated.
 */
import {documentUnits} from '../intelligence/text.mjs';

const definitions=[
 ['hard','JavaScript',['javascript','js','ecmascript']],
 ['hard','TypeScript',['typescript']],
 ['hard','Python',['python']],
 ['hard','SQL',['sql','structured query language']],
 ['hard','Excel',['excel','microsoft excel','ms excel','pivot tables']],
 ['hard','Power BI',['power bi','powerbi']],
 ['hard','Tableau',['tableau']],
 ['hard','AWS',['aws','amazon web services']],
 ['hard','Azure',['microsoft azure','azure']],
 ['hard','Kubernetes',['kubernetes','k8s']],
 ['hard','Docker',['docker','containers using docker']],
 ['hard','Project management',['project management','project planning','project delivery']],
 ['hard','Inventory management',['inventory management','stock control','stock management','stock counts']],
 ['hard','Budget management',['budget management','budgeting','budget planning']],
 ['hard','Financial reporting',['financial reporting','financial statements']],
 ['hard','Data analysis',['data analysis','data analytics','analysed data','analyzed data']],
 ['hard','CRM',['crm','customer relationship management','salesforce']],
 ['hard','First aid',['first aid','cpr','aed']],
 ['hard','Bookkeeping',['bookkeeping','accounts reconciliation']],
 ['soft','Communication',['communication','communicated','presented findings','written communication']],
 ['soft','Leadership',['leadership','led a team','lead a team','managed a team','managing a team','supervised staff','team leadership']],
 ['soft','Teamwork',['teamwork','team player','cross-functional collaboration','collaborated with colleagues']],
 ['soft','Problem solving',['problem solving','problem-solving','resolved complex problems','troubleshooting']],
 ['soft','Stakeholder management',['stakeholder management','stakeholder engagement','managed stakeholders']],
 ['soft','Time management',['time management','prioritisation','prioritization','managed deadlines']],
 ['soft','Conflict resolution',['conflict resolution','resolved disputes','mediated conflicts']],
 ['soft','Adaptability',['adaptability','adaptable','adapted to change']],
 ['soft','Attention to detail',['attention to detail','detail-oriented','quality checking']],
 ['soft','Mentoring',['mentoring','mentored','coached colleagues','trained new staff']],
 ['soft','Negotiation',['negotiation','negotiated contracts','negotiated terms']],
 ['soft','Critical thinking',['critical thinking','evaluated alternatives']]
];
export const SKILL_TAXONOMY=Object.freeze(definitions.map(([kind,name,aliases])=>Object.freeze({
 id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),kind,name,aliases:Object.freeze(aliases)
})));
const escapeRegex=x=>x.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g,'\\$&');
const negation=/\b(?:no|not|without|lack|lacking|learning|studying|seeking|interested in|want to learn|need to learn|never used|unfamiliar with|no experience with|not proficient in)\s+(?:(?:\w+|to|with|in)\s+){0,3}$/i;
/** Whole phrases only: "SQL" does not match "NoSQL"; "js" does not match "objects". */
export function findPositiveMention(text,aliases){
 if(typeof text!=='string'||!text)return null;
 for(const alias of [...aliases].sort((a,b)=>b.length-a.length)){
  const rx=new RegExp('(^|[^a-z0-9])('+escapeRegex(alias).replace(/\s+/g,'\\s+')+')(?![a-z0-9])','gi');
  let hit;
  while((hit=rx.exec(text))){
   const index=hit.index+hit[1].length,previous=text.slice(Math.max(0,index-65),index);
   if(!negation.test(previous))return {term:hit[2],index};
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
function unitKind(path){
 if(path.startsWith('experience['))return 'experience';
 if(path.startsWith('projects['))return 'projects';
 if(path.startsWith('certifications['))return 'certifications';
 if(path==='summary')return 'summary';
 if(path.startsWith('skills['))return 'skills';
 return 'other';
}
/**
 * A requirement is included only when the job advertisement explicitly mentions a known skill.
 * "demonstrated" means described in an experience/project line, NOT independently verified.
 */
export function analyzeJobSkills(job,document){
 const requirements=Array.isArray(job?.requirements)?job.requirements:[];
 const units=documentUnits(document||{}),requested=new Map();
 for(const req of requirements){
  if(typeof req.text!=='string')continue;
  for(const skill of SKILL_TAXONOMY){
   if(!findPositiveMention(req.text,skill.aliases))continue;
   const prev=requested.get(skill.id);
   if(!prev||prev.priority!=='required'&&req.priority==='required')
    requested.set(skill.id,{skill,requirementId:req.id,requirement:req.text,priority:req.priority||'unknown'});
  }
 }
 const items=[...requested.values()].map(({skill,requirementId,requirement,priority})=>{
  const evidence=units.flatMap(u=>{
   const mention=findPositiveMention(u.text,skill.aliases);
   return mention?[{path:u.path,excerpt:u.text.slice(0,200),term:mention.term,source:unitKind(u.path)}]:[];
  }).sort((a,b)=>EVIDENCE_RANK[a.source]-EVIDENCE_RANK[b.source]).slice(0,4);
  const hasExample=evidence.some(x=>x.source==='experience'||x.source==='projects');
  const status=hasExample?'described':evidence.length?'mentioned':'not-found';
  const fix=status==='not-found'?'If you genuinely have this skill, add a specific, truthful example in a relevant role or project.':
   status==='mentioned'?'A skills-list mention is not a work example; add a specific example if you can substantiate it.':
   'A related example is present. Check that it demonstrates the requirement rather than just using its words.';
  return {id:skill.id,kind:skill.kind,skill:skill.name,requirementId,requirement,priority,status,evidence,
   explanation:'Phrase-based local detection with bounded aliases. Mentions do not prove ability.',correction:fix};
 });
 items.sort((a,b)=>(a.priority==='required'?0:1)-(b.priority==='required'?0:1)||
  (a.status==='not-found'?0:a.status==='mentioned'?1:2)-(b.status==='not-found'?0:b.status==='mentioned'?1:2)||a.skill.localeCompare(b.skill));
 return {items,hardSkills:items.filter(x=>x.kind==='hard'),softSkills:items.filter(x=>x.kind==='soft'),
  summary:{requiredMissing:items.filter(x=>x.priority==='required'&&x.status==='not-found').length,
   mentionedOnly:items.filter(x=>x.status==='mentioned').length,described:items.filter(x=>x.status==='described').length},
  score:null,validated:false,
  disclaimer:'Deterministic English skill phrase checks only; missing text is not missing ability. No job-fit percentage or hiring probability is available.'};
}
