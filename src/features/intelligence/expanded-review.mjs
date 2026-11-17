/**
 * Transparent, local CV review layered on the existing 32-rule ATS engine.
 * The Enhancv checklist is used as a public comparison taxonomy, not a reproduction
 * of Enhancv's proprietary ATS scoring, language model, peer data or verification.
 * No applicant ranking, discrimination inference, ATS score or hiring likelihood.
 */
import {runAtsChecks} from '../ats/engine.mjs';
import {descriptionLines,parseDate} from './text.mjs';
import {analyzeWriting} from '../writing/checks.mjs';
import {analyzeJobSkills} from '../job-match/skill-evidence.mjs';

const CATEGORIES=['ATS essentials','Resume sections','Content','Job tailoring','Recruiter red flags','Bias & discrimination','Seniority & impact'];
// [stable id, category index, exact published check name, available evidence, related local rule IDs]
const CHECKS=[
 ['file-format',0,'File format and size','file',''],
 ['ats-design',0,'ATS-friendly design','artifact','layout.columns,layout.pages'],
 ['email',0,'Professional email address','local','contact.email'],
 ['header-links',0,'Header links compliance','local','links.safe'],
 ['file-name',0,'Resume file name','file',''],
 ['dates-links',0,'Dates and links consistency','local','dates.valid,dates.format,links.safe'],
 ['sections',1,'Essential sections','local','experience.present,skills.present,education.present'],
 ['contact',1,'Contact information','local','contact.name,contact.email,contact.phone'],
 ['section-order',1,'Section order','partial','chronology.order,headings.standard'],
 ['parse-rate',2,'ATS parse rate','external','export.text,export.order,export.encoding'],
 ['impact',2,'Quantifying impact with AI rewrite suggestions','partial','bullets.numbers'],
 ['repetition',2,'Repetition of words and phrases','local','text.repetition'],
 ['grammar',2,'Spelling and grammar','partial',''],
 ['bullets',2,'Bullet length and consistency','local','bullets.length,bullets.count'],
 ['hard-skills',3,'Hard skills match','job',''],
 ['soft-skills',3,'Soft skills match','job',''],
 ['action-verbs',3,'Action verbs','local','bullets.verbs'],
 ['job-title',3,'Tailored job title','job','contact.title'],
 ['credibility',4,'Resume credibility','partial',''],
 ['interview-risk',4,'Interview risk signals','partial',''],
 ['peer-benchmark',4,'Peer benchmarking','external',''],
 ['linkedin-match',4,'LinkedIn profile match','external',''],
 ['age-bias',5,'Age and date bias','partial','contact.photo'],
 ['gaps',5,'Employment gaps','partial','chronology.gaps'],
 ['progression',6,'Career progression','partial','chronology.order'],
 ['skills-evidence',6,'Skills evidence','partial','skills.present'],
 ['leadership',6,'Leadership signals','partial','']
];
export const ENHANCV_27_COVERAGE=Object.freeze(CHECKS.map(([id,c,label,mode,ruleIds])=>Object.freeze({
 id,category:CATEGORIES[c],label,mode,legacyRuleIds:Object.freeze(ruleIds?ruleIds.split(','):[])
})));
const PRIORITY={critical:0,high:1,medium:2,low:3};
const tidy=v=>typeof v==='string'?v.trim():'';
const pathOf=(e,i)=>'experience['+(e.id??i)+']';
const finding=(id,priority,message,explanation,correction,path)=>({id,priority,message,explanation,correction,path,
 source:'local heuristic',requiresHumanReview:true});
const asMonth=d=>d.y*12+(d.m?d.m-1:0);
const firstMonth=d=>asMonth(d);
const lastMonth=d=>d.y*12+(d.m?d.m-1:11);
const safeDate=v=>{const d=parseDate(tidy(v));return d&&d!=='present'?d:null;};
const dateLabel=d=>d?String(d.y)+(d.m?'-'+String(d.m).padStart(2,'0'):''):'unknown';

function investigateChronology(document,now){
 const items=(document.experience||[]).map((e,i)=>{
  const start=safeDate(e.start),end=e.current?null:safeDate(e.end);
  return {e,i,start,end,from:start?firstMonth(start):null,
   // Current roles end at the current month; year-only past ends use December (conservative).
   to:e.current?now.getFullYear()*12+now.getMonth():end?lastMonth(end):null};
 });
 const issues=[];
 for(const x of items)if(x.start&&x.end&&firstMonth(x.start)>lastMonth(x.end))
  issues.push(finding('invalid-period','high','A role ends before it starts ('+tidy(x.e.title)+').',
   'This interval is chronologically impossible at the supplied precision.',
   'Correct the original dates; do not guess a period.',pathOf(x.e,x.i)+'.start'));
 // Merge overlapping employment intervals before looking for gaps; don't confuse overlapping roles with gaps.
 const ordered=items.filter(x=>x.from!==null&&x.to!==null&&x.from<=x.to)
  .sort((a,b)=>a.from-b.from||a.to-b.to);
 let end=null,previous=null;
 for(const current of ordered){
  if(end!==null){
   const possibleGap=current.from-end-1;
   if(possibleGap>12){
    issues.push(finding('employment-gap','low','A gap of at least '+possibleGap+' whole months may be worth explaining.',
     'Based on readable job dates; study, caring, health, travel and personal choices are legitimate. This does not imply a weakness.',
     'If relevant, explain the interval truthfully in one short line; no reason needs to be disclosed if you prefer.',
     pathOf(current.e,current.i)+'.start'));
   }
  }
  if(end===null||current.to>end){end=current.to;previous=current;}
 }
 // Surface same-employer advancement as a positive opportunity, not a penalty for unconventional career paths.
 const byEmployer=new Map();
 for(const x of items){
  const org=tidy(x.e.employer).toLowerCase();
  if(org)(byEmployer.get(org)||byEmployer.set(org,[]).get(org)).push(x);
 }
 const levels=[[/\b(intern|trainee|apprentice)\b/i,0],[/\b(junior|assistant|graduate)\b/i,1],
  [/\b(coordinator|specialist|analyst|associate)\b/i,2],[/\b(senior|supervisor|lead)\b/i,3],
  [/\b(manager|head of|principal)\b/i,4],[/\b(director|vice president|vp)\b/i,5],
  [/\b(chief|ceo|coo|cfo|cto)\b/i,6]];
 const rank=t=>{for(const [rx,n] of levels)if(rx.test(t))return n;return null;};
 let advancement=0;
 for(const history of byEmployer.values()){
  history.sort((a,b)=>(a.from??0)-(b.from??0));
  for(let i=1;i<history.length;i++){
   const a=rank(tidy(history[i-1].e.title)),b=rank(tidy(history[i].e.title));
   if(a!==null&&b!==null&&b>a)advancement++;
  }
 }
 if(advancement)issues.push(finding('progression','low','Possible progression across '+advancement+' same-employer role transition(s).',
  'A title sequence suggests increased seniority but is not proof of promotion or scope.',
  'If these were promotions, describe the actual responsibilities and expanded scope; otherwise leave the chronology as is.'));
 return {issues,advancement,datedRoles:ordered.length,precision:'Year-only dates are treated conservatively; ongoing and overlapping employment is merged.'};
}
function investigateText(doc){
 const out=[],lines=[];
 (doc.experience||[]).forEach((e,i)=>descriptionLines(e.description).forEach((l,j)=>
  lines.push({path:pathOf(e,i)+'.description['+j+']',text:l.text,bullet:l.bullet})));
 if(tidy(doc.summary))lines.push({path:'summary',text:doc.summary,bullet:false});
 const typos=[
  [/\b(?:the|and|to|of|in|for|with|a|an)\s+\1\b/gi,'A word is repeated.'],
  [/\bresponsible of\b/gi,'Use “responsible for” when that is the intended meaning.'],
  [/\btheir is\b/gi,'Check whether “there is” was intended.'],
  [/\b(?:very\s+){2,}/gi,'Repeated intensifier weakens clarity.']
 ];
 for(const {path,text} of lines){
  const repeated=/\b([a-z]{2,})\s+\1\b/gi;
  if(repeated.test(text))out.push(finding('grammar-repeat','medium','Repeated word in “'+text.slice(0,90)+'”.',
   'Repeated adjacent words are usually a proofreading error.','Remove the accidental repetition after checking the sentence.',path));
  for(const [rx,message] of typos.slice(1))if(rx.test(text))
   out.push(finding('grammar-pattern','medium',message,'A limited English pattern check, not a full grammar or spell checker.',
    'Proofread the entire sentence and correct only if this pattern is unintended.',path));
  if(/[!?]{2,}|,,/.test(text))out.push(finding('punctuation','low','Repeated punctuation in a CV line.',
   'Atypical punctuation can distract readers.','Keep punctuation consistent and simple.',path));
  if(/\b(?:guaranteed success|world'?s best|unmatched expertise|expert in everything)\b/i.test(text))
   out.push(finding('credibility','medium','Absolute wording needs credible context: “'+text.slice(0,85)+'”.',
    'This is a possible recruiter question, not a claim that the statement is false.',
    'Replace the superlative with a specific, defensible achievement or remove it.',path));
 }
 const bullets=lines.filter(x=>x.bullet&&x.text.length>5);
 if(bullets.length>=3){
  const withStop=bullets.filter(x=>/[.!?]$/.test(x.text)).length;
  if(withStop>0&&withStop<bullets.length)out.push(finding('bullet-style','low','Bullet punctuation is inconsistent.',
   'Some bullets end in punctuation while others do not.',
   'Choose one bullet punctuation style for similar sections.',bullets[0].path));
 }
 return out;
}
function investigateLeadership(doc,jobSkills){
 const examples=(doc.experience||[]).flatMap((e,i)=>descriptionLines(e.description).map((l,j)=>({
  text:l.text,path:pathOf(e,i)+'.description['+j+']'
 })));
 const leaders=examples.filter(x=>/\b(?:led|managed|supervised|mentored|coached|directed|trained)\b.{0,75}\b(?:team|staff|people|colleagues|employees)\b/i.test(x.text));
 const leadRole=jobSkills?.items?.some(x=>x.id==='leadership'&&x.priority==='required')||false;
 const issues=[];
 if(leadRole&&!leaders.length)issues.push(finding('leadership-evidence','high','The vacancy requests leadership, but no specific team example was located.',
  'A title or a generic skills-list claim does not establish the scope of leadership.',
  'If accurate, describe whom you led, how you contributed and the outcome; do not invent team size.',
  'experience'));
 else if(leaders.length&&!leaders.some(x=>/\d/.test(x.text)))
  issues.push(finding('leadership-scope','low','Leadership is described without a measurable scope.',
   'Team size, responsibility and outcomes can help clarify impact where they are known.',
   'Consider adding the real team size, responsibility or outcome; do not invent metrics.',leaders[0].path));
 return {issues,examples:leaders};
}
function extraContactChecks(doc,job,options){
 const p=doc.personalInfo||{},out=[];
 if(/\b(?:19\d{2}|20\d{2})\b/.test(tidy(p.dateOfBirth))||tidy(p.age))
  out.push(finding('age-bias','low','Personal age or birth information appears in the CV fields.',
   'Age details are not normally needed for initial recruitment in many markets. Requirements vary by location.',
   'Consider omitting optional birth-date or age details unless required locally.'));
 const email=tidy(p.email);
 if(email&&/^(?:cool|sexy|baby|bossman|funny|party)[\w.-]*@/i.test(email))
  out.push(finding('email-tone','medium','Your email username may read as informal.',
   'This is subjective; an ordinary personal address is not inherently unprofessional.',
   'Consider an easy-to-read name-based address, if you have one.','personalInfo.email'));
 if(job?.role&&tidy(p.title)&&!/^(?:\s*)$/i.test(job.role)){
  const title=tidy(p.title).toLowerCase(),role=tidy(job.role).toLowerCase();
  if(title!==role&&!title.includes(role)&&!role.includes(title))
   out.push(finding('target-title','low','The CV headline does not use the exact target job title.',
    'A different title is normal for career changers; the literal wording alone does not show lack of fit.',
    'If truthful, clarify the target role in a headline or summary. Never claim to have held an unearned title.','personalInfo.title'));
 }
 const file=tidy(options.fileName);
 if(file){
  if(!/\.(pdf|docx)$/i.test(file))out.push(finding('file-type','medium','The submitted filename does not end in .pdf or .docx.',
   'Some job portals accept other formats; check the employer instructions.',
   'Export in the requested accepted file format and verify its text.'));
  if(/(?:final[-_ ]?final|copy\s*\(\d+\)|untitled|document\d*)/i.test(file))
   out.push(finding('file-name','low','The file name may be unclear to a recruiter.',
    'Filenames are a small usability detail, not an ATS ranking feature.',
    'Use a clear name and target role without disclosing sensitive data.'));
 }
 const art=options.artifact;
 if(art&&typeof art.sizeBytes==='number'&&art.sizeBytes>2*1024*1024)
  out.push(finding('file-size','low','The file exceeds 2 MB (the example tool limit, not a universal ATS limit).',
   'Employer and checker upload limits differ.','Check the destination portal limit and compress only if needed.'));
 return out;
}
const fixes={
 'contact.name':'Add your name in the header.',
 'contact.email':'Correct or add an email address that can receive replies.',
 'contact.phone':'Add a phone number if appropriate for this application.',
 'experience.fields':'Supply accurate title, employer and employment dates.',
 'dates.valid':'Correct the period or use a readable month-and-year style.',
 'layout.columns':'Review the exported reading order rather than automatically removing columns.',
 'export.text':'Open the actual exported file and verify all required text is recoverable.',
 'export.order':'Check the document reading order and choose a safer layout if necessary.',
 'skills.present':'Add only skills you possess and can substantiate.',
 'headings.standard':'Use a conventional heading for sections recruiters need to identify.',
 'bullets.count':'Add the actual responsibilities or outcomes from the role.',
 'bullets.numbers':'Add measurable outcomes only if they are accurate and can be supported.'
};
const legacyPriority={error:'critical',warning:'high',info:'low'};
function legacyRecommendations(base){
 return base.findings.filter(x=>x.ruleId!=='chronology.gaps').map((x,i)=>({
  id:'legacy-'+x.ruleId+'-'+i,priority:legacyPriority[x.severity]||'low',
  message:x.message,explanation:x.explanation,
  correction:fixes[x.ruleId]||'Review the flagged content and update it only where accurate.',
  path:x.path,source:'existing ATS rule',requiresHumanReview:true
 }));
}
function publishedStatus(check,{artifact,fileName,job,linkedinProfile}){
 if(check.mode==='external')return {status:'not-verified',reason:check.id==='parse-rate'?
  'An internal export text check is not an independent ATS parser benchmark.':
  check.id==='peer-benchmark'?'No representative peer corpus or benchmark exists.':
  'A LinkedIn URL alone cannot verify profile contents; no LinkedIn data was fetched.'};
 if(check.mode==='file'&&!fileName)return {status:'needs-input',reason:'Supply the actual export filename and file metadata; no upload was examined.'};
 if(check.mode==='artifact'&&!artifact)return {status:'needs-input',reason:'Render an actual export before checking layout warnings.'};
 if(check.mode==='job'&&!job)return {status:'needs-input',reason:'Paste a specific vacancy before assessing alignment.'};
 return {status:check.mode==='local'?'local-check':'limited-check',
  reason:check.mode==='local'?'Rule-based inspection only; employer ATS behavior has not been tested.':
   'Heuristic or incomplete evidence. Human review is needed.'};
}
/** Pure. Returns both actual findings and a 27-row scope/limitations register. */
export function analyzeResumeReadiness(ctx){
 if(!ctx||!ctx.document)throw Object.assign(new Error('document required'),{code:'INVALID'});
 const now=ctx.now instanceof Date&&!Number.isNaN(+ctx.now)?ctx.now:new Date();
 const baseline=runAtsChecks(ctx);
 const skills=ctx.job?analyzeJobSkills(ctx.job,ctx.document):null;
 const chronology=investigateChronology(ctx.document,now);
 const leadership=investigateLeadership(ctx.document,skills);
 const extras=[
  ...investigateText(ctx.document),...chronology.issues,...leadership.issues,
  ...extraContactChecks(ctx.document,ctx.job,ctx),
  ...(skills?.items||[]).filter(x=>x.status!=='described').map(x=>finding(
   'skill-'+x.id,x.priority==='required'?'high':'medium',
   x.skill+' ('+x.kind+' skill): '+(x.status==='not-found'?'no positive CV mention found':'mentioned without a work example')+'.',
   x.explanation,x.correction,x.evidence[0]?.path
  ))
 ];
 const findings=[...legacyRecommendations(baseline),...extras].sort((a,b)=>PRIORITY[a.priority]-PRIORITY[b.priority]||
  a.id.localeCompare(b.id));
 const coverage=ENHANCV_27_COVERAGE.map(c=>{
  const result=publishedStatus(c,ctx);
  return {...c,...result,relatedFindings:findings.filter(f=>c.legacyRuleIds.some(r=>f.id.startsWith('legacy-'+r+'-'))).length};
 });
 return {findings,prioritizedCorrections:findings,coverage,byCategory:CATEGORIES.map(c=>({
  name:c,checks:coverage.filter(x=>x.category===c)})),
  baseline,skills,signals:{careerProgression:chronology.advancement,leadershipExamples:leadership.examples,
   chronologyPrecision:chronology.precision},score:null,scoreValidated:false,
  disclaimer:'Local, English-focused writing and evidence heuristics; the 27-row mapping is not 27 independently validated checks. No ATS score, match score, hiring likelihood, peer benchmark or LinkedIn verification is claimed.'};
}
