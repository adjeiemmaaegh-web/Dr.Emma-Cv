/**
 * Requirement-to-CV text evidence; no employment, competence or hiring inference.
 * One shared phrase must appear in a specific unit before a row is "evidenced".
 * Numeric requirements cannot be satisfied by unrelated numbers or job titles.
 */
import {documentUnits,stems,tokens,isStop} from '../intelligence/text.mjs';
import {analyzeJobSkills,positiveEvidenceText,findPositiveMention,SKILL_TAXONOMY} from './skill-evidence.mjs';
const SYN={js:'javascript',ts:'typescript',ml:'machine learning',pm:'project management',
 crm:'customer relationship management',qa:'quality assurance',hr:'human resources',kpi:'key performance indicators'};
const expand=t=>SYN[t]?[t,...SYN[t].split(' ')]:[t];
export function requirementTerms(text){
 return [...new Set(tokens(text).filter(t=>t.length>2&&!isStop(t)&&!/^\d+$/.test(t)).flatMap(expand))];
}
const GENERIC=new Set('experience skills ability knowledge strong good excellent proven demonstrated understanding years year degree level required preferred working team teams role responsibilities professional proficient familiar at least minimum must have people'.split(' '));
const scopePattern=[
 {type:'team-size',rx:/\b(?:team|staff|employees|people|direct reports)\s+(?:of\s+|with\s+)?(\d{1,3})\s*\+?/i},
 {type:'team-size',rx:/\b(\d{1,3})\s*\+?\s*(?:staff|employees|people|direct reports)\b/i},
 {type:'years-experience',rx:/\b(\d{1,2})\s*\+?\s*(?:years|yrs)\b/i},
 {type:'years-experience',rx:/\b(?:minimum|at least)\s+(\d{1,2})\s*(?:years|yrs)\b/i}
];
/** Bounded, explicit scope checks. Does not calculate industry tenure from role dates. */
export function extractScopeRequirements(text){
 const found=new Map();
 for(const rule of scopePattern){
  const m=String(text||'').match(rule.rx);
  if(m){
   const minimum=Number(m[1]);
   if(Number.isSafeInteger(minimum)&&minimum>0&&minimum<200){
    const prev=found.get(rule.type);
    if(!prev||minimum>prev.minimum)found.set(rule.type,{type:rule.type,minimum,source:m[0]});
   }
  }
 }
 return [...found.values()];
}
function numericEvidence(constraint,units,requiredSkills=[]){
 const candidates=[];
 const regex=constraint.type==='team-size'?
  /(?:\b(?:team|staff|employees|people|direct reports)\s+(?:of\s+|with\s+)?(\d{1,3})\s*\+?|\b(\d{1,3})\s*\+?\s*(?:staff|employees|people|direct reports)\b)/gi:
  /(?:\b(\d{1,2})\s*\+?\s*(?:years|yrs)\b|\b(?:minimum|at least)\s+(\d{1,2})\s*(?:years|yrs)\b)/gi;
 for(const u of units){
  if(!/\.description\[|^summary$|^projects\[/.test(u.path))continue;
  if(constraint.type==='years-experience'&&requiredSkills.length&&
    !requiredSkills.every(skill=>findPositiveMention(u.text,skill.aliases)))continue;
  for(const match of positiveEvidenceText(u.text).matchAll(regex)){
   const count=Number(match[1]||match[2]);
   if(Number.isSafeInteger(count))candidates.push({path:u.path,value:count,excerpt:u.text.slice(0,200)});
  }
 }
 const highest=candidates.length?Math.max(...candidates.map(x=>x.value)):null;
 return {...constraint,status:highest===null?'not-shown':highest<constraint.minimum?'possible-conflict':'text-supported',
  observed:highest,citations:candidates.sort((a,b)=>b.value-a.value).slice(0,2),
  note:highest===null?'No directly stated matching number was found; experience duration is not inferred from job dates.':
   highest<constraint.minimum?'The CV states a smaller figure in related wording; review the actual requirement and context.':
   'The CV states a sufficiently large figure, but the underlying claim has not been verified.'};
}
export function compareToDocument(job,document){
 if(!job||!Array.isArray(job.requirements)||!document)throw Object.assign(new Error('job requirements and CV document required'),{code:'INVALID'});
 if(job.requirements.length>180)throw Object.assign(new Error('Too many requirements for local comparison (limit 180).'),{code:'INVALID'});
 const units=documentUnits(document).filter(u=>typeof u.text==='string').map(u=>({
  ...u,positive:positiveEvidenceText(u.text),
  stems:new Set(stems(positiveEvidenceText(u.text)))
 }));
 const skillEvidence=analyzeJobSkills(job,document);
 const results=job.requirements.map((r,i)=>{
  const requirement=typeof r?.text==='string'?r.text:'',id=r?.id??'req-'+i;
  const terms=requirementTerms(requirement).filter(t=>!GENERIC.has(t));
  const tokenTerms=terms.map(t=>({t,st:stems(t)[0]})).filter(x=>x.st);
  const relatedSkills=skillEvidence.items.filter(x=>String(x.requirementId)===String(id));
  const requiredSkillDefs=relatedSkills.map(x=>SKILL_TAXONOMY.find(d=>d.id===x.id)).filter(Boolean);
  const scopes=extractScopeRequirements(requirement).map(x=>numericEvidence(x,units,requiredSkillDefs));
  if(!tokenTerms.length)return {requirementId:id,requirement,priority:r.priority||'unknown',
   status:'not-assessable',coverage:0,citations:[],matchedTerms:[],missingTerms:[],
   scopes,skillEvidence:relatedSkills,reason:'No distinctive requirement terms; review this manually.',
   note:'No distinctive terms to match. Read this requirement yourself.'};
  const cites=[],anyHit=new Set();
  for(const unit of units){
   const matched=tokenTerms.filter(t=>unit.stems.has(t.st)).map(x=>x.t);
   if(!matched.length)continue;
   matched.forEach(t=>anyHit.add(t));
   cites.push({path:unit.path,excerpt:unit.text.slice(0,200),matched,
    overlap:matched.length/tokenTerms.length});
  }
  cites.sort((a,b)=>b.overlap-a.overlap||b.matched.length-a.matched.length);
  const coverage=anyHit.size/tokenTerms.length;
  const maxCoLocated=cites[0]?.overlap||0;
  const skillsDescribed=relatedSkills.every(x=>x.status==='described');
  const unresolvedScopes=scopes.filter(x=>x.status!=='text-supported');
  const hasText=coverage>0;
  // "Evidenced" is kept for old consumers, but means text evidence, NEVER proven competence.
  const status=!hasText?'no-evidence':
   maxCoLocated>=0.6&&skillsDescribed&&!unresolvedScopes.length?'evidenced':'partial';
  const missingTerms=terms.filter(t=>!anyHit.has(t));
  const note=status==='no-evidence'?'No supporting text found in your CV. This does not mean you lack it; add it only if it is true and you can evidence it.':
   status==='partial'?
    'Only partial, scattered or unverified text evidence was found. '+
      (unresolvedScopes.length?unresolvedScopes.map(x=>x.note).join(' '):
      relatedSkills.some(x=>x.status!=='described')?'A skill mention alone is not a work example.':
      'Review requirement context, not just keyword overlap.'):
    'Related terms appear together in a CV work/project example; confirm the full requirement and truth of the claim.';
  return {requirementId:id,requirement,priority:r.priority||'unknown',
   status,coverage:Math.round(coverage*100)/100,coLocatedCoverage:Math.round(maxCoLocated*100)/100,
   matchedTerms:[...anyHit],missingTerms,scopes,skillEvidence:relatedSkills,
   citations:cites.slice(0,4),note,evidenceMeaning:'CV wording only; not independently verified.',
   requiresHumanReview:true};
 });
 const by=s=>results.filter(r=>r.status===s).length;
 return {results,skillEvidence,summary:{evidenced:by('evidenced'),partial:by('partial'),
  noEvidence:by('no-evidence'),notAssessable:by('not-assessable'),total:results.length},
  score:null,validated:false,
  disclaimer:'Local keyword/phrase evidence only. This is not a prediction of ATS processing, hiring or job fit, and not a validated score. Numeric and competency requirements require human review.'};
}
