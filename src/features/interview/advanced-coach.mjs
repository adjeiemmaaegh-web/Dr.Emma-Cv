/**
 * Advanced career coaching: source-bound local questions, STAR analysis,
 * manual/opt-in AI review, user-reviewed company research and workbook export.
 * No network access, automatic AI provider, scraping or factual verification is claimed.
 */
import {contractError,cloneData} from '../../contracts/platform.mjs';
import {documentUnits,plainText,stems} from '../intelligence/text.mjs';
import {detectUnsupportedClaims} from '../intelligence/claims.mjs';
import {buildQuestions,storyCompleteness,REFLECTION_PROMPTS,practiceSummary} from './interview.mjs';
import {renderBlocksArtifact} from '../export/block-export.mjs';

const str=v=>typeof v==='string'?v.trim():'';
const checkText=(label,value,max)=>{
 if(typeof value!=='string'||value.length>max)throw contractError('INVALID',label+' is too long or invalid');
 return value.trim();
};
const next=(session,expectedRevision)=>{
 if(!session||session.revision!==expectedRevision)throw contractError('CONFLICT','Interview session changed; reload before saving');
 return {...cloneData(session),revision:session.revision+1};
};
const uid=prefix=>prefix+globalThis.crypto.randomUUID().replace(/-/g,'');
const wordCount=text=>(str(text).match(/\S+/g)||[]).length;
const significant=text=>new Set(stems(str(text)).filter(w=>w.length>3));
const overlap=(a,b)=>{
 const words=significant(a),matches=[...significant(b)].filter(x=>words.has(x));
 return matches.length;
};
const assertJob=job=>{if(!job||typeof job.role!=='string')throw contractError('INVALID','A job target is required');};

/** Stable questions with labelled provenance and optional, *matched* CV excerpts. */
export function buildInterviewPlan({job,document,limit=16}={}){
 assertJob(job);
 const units=documentUnits(document||{});
 const questions=buildQuestions({job,document}).slice(0,Math.max(1,Math.min(30,limit)));
 return questions.map((question,index)=>{
  const sources=units.map(unit=>({...unit,matches:overlap(question.text,unit.text)}))
   .filter(u=>u.matches>=2).sort((a,b)=>b.matches-a.matches).slice(0,2)
   .map(u=>({path:u.path,excerpt:u.text.slice(0,240)}));
  return {
   id:'question-'+index+'-'+str(question.source).replace(/[^a-z-]/g,''),
   text:question.text,source:question.source,competency:question.competency||null,
   requirementId:question.requirementId||null,rolePath:question.rolePath||null,
   evidence:sources,
   coachingHint:question.source==='job-requirement'
    ?'Answer with a specific true example. Show your actions and the result; do not assume the requirement is already proven.'
    :question.source==='your-role'
     ?'Explain what you personally did and which achievement you can substantiate.'
     :'Use a genuine personal example. This is a generic practice prompt, not a statement about your career.'
  };
 });
}

/** Review is rule-based, not a model-produced score or a hiring prediction. */
export function coachInterviewAnswer({answer,question,story={},document={},job={}}={}){
 const text=checkText('Practice answer',answer||'',8000);
 if(!text)throw contractError('INVALID','Write a practice answer before requesting feedback');
 const wc=wordCount(text),seconds=Math.round(wc/2.2),notes=[],completeness=storyCompleteness(story);
 const add=(kind,message)=>notes.push({kind,message});
 if(wc<45)add('structure','Your answer is brief. Add specific context, your action and a verified outcome.');
 if(wc>320)add('clarity','Your answer may be long for an interview; consider shortening it.');
 if(!/\b(I|my|me)\b/i.test(text))add('ownership','Explain what you personally contributed, not only what the team did.');
 if(!/\b(result|outcome|improved|changed|resolved|delivered|learned|achieved|because|so that)\b/i.test(text))
  add('result','State the outcome in words, or a number only when it is true.');
 for(const key of completeness.missing)add('star','The '+({context:'Situation',task:'Task',actions:'Action',results:'Result'}[key])+' part of the linked STAR story has not been provided.');
 for(const note of completeness.notes)add('star',note);
 const source=[plainText(document||{}),str(job?.originalText),str(question?.text),
  ...['context','task','actions','results'].map(k=>str(story[k]))].join('\n');
 const flagged=detectUnsupportedClaims(text,source);
 if(flagged.length)add('factual-review',flagged.length+' claim(s) are absent from the supplied CV, vacancy or STAR notes. They may still be true; check before using them.');
 if(!notes.length)add('practice','The basic structure checks found no obvious issue. This is not a quality score; seek human feedback.');
 return {kind:'local-rule-based-coaching',wordCount:wc,estimatedSeconds:seconds,
  starCompleteness:completeness,notes,flaggedClaims:flagged,
  disclaimer:'Automated wording checks cannot confirm truth, confidence, relevance, interview performance or hiring chances.'};
}

/** Structured answer using *only* the user's own four STAR fields. */
export function assembleSTARAnswer(story={}){
 return [['Situation','context'],['Task','task'],['My actions','actions'],['Result','results']]
  .map(([label,key])=>str(story[key])?label+': '+str(story[key]):label+': [write a true example]')
  .join('\n\n');
}

/** Human-mediated AI use: prompt may be copied into a service by the user, never transmitted by this app. */
export function prepareOptionalAIPrompt({job,question,answer,story,document}={}){
 checkText('Answer',answer||'',8000);
 const excerpts=documentUnits(document||{}).slice(0,16).map(u=>u.path+': '+u.text.slice(0,250)).join('\n');
 return [
 'OPTIONAL EXTERNAL AI REVIEW PROMPT — CONTAINS PRIVATE CAREER DATA',
 'This app does not send the prompt to a provider. Only share it with a service if you separately consent.',
 'Task: Give constructive interview answer feedback and a draft improvement. Do not invent accomplishments, numbers, degrees, employers, skills or company facts.',
 'Label uncertainty, ask a question for missing evidence, keep all proposed changes subject to human approval.',
 'Role: '+str(job?.role),'Employer named in job posting: '+str(job?.employer),
 'Practice question: '+str(question?.text),
 'Applicant answer:\n'+str(answer),
 'Applicant STAR notes:\n'+assembleSTARAnswer(story),
 'Relevant CV excerpt (applicant-supplied; not independently verified):\n'+excerpts,
 'Return: (1) structure feedback; (2) credible improvements; (3) any claim requiring verification; (4) optional rewritten answer. Do not assert facts beyond the supplied material.'
 ].join('\n\n');
}

/** Never silently accept a pasted rewrite; each numeric/proper-name claim is scrutinised. */
export function reviewAIDraft({draft,originalAnswer,story={},job={},document={}}={}){
 const text=checkText('AI-assisted draft',draft,8000);
 if(!text)throw contractError('INVALID','Paste a proposed answer first');
 const source=[str(originalAnswer),plainText(document||{}),str(job?.originalText),str(job?.role),
  str(job?.employer),...['context','task','actions','results'].map(k=>str(story[k]))].join('\n');
 return {flaggedClaims:detectUnsupportedClaims(text,source),requiresHumanApproval:true,
  notice:'This draft was supplied externally or written by you. Ledger has not verified its claims. Review every sentence; flagged claims need extra checking.'};
}

export function saveCoachingReview(session,{questionId,questionText,answer,feedback,expectedRevision,now=new Date().toISOString(),idFactory=()=>uid('review')}={}){
 const n=next(session,expectedRevision);
 if(!Array.isArray(n.reviews))n.reviews=[];
 if(n.reviews.length>=30)throw contractError('INVALID','Maximum 30 answer reviews; export a workbook first');
 const record={id:idFactory(),questionId:checkText('Question id',questionId||'',120),
  questionText:checkText('Question',questionText||'',1200),answer:checkText('Answer',answer||'',8000),
  feedback:cloneData(feedback),createdAt:now};
 if(!/^review[a-zA-Z0-9_-]{3,100}$/.test(record.id)||!record.questionText||!record.answer)
  throw contractError('INVALID','Practice answer details missing');
 n.reviews.push(record);return n;
}

/** URLs are clickable user-supplied references; never fetched or independently authenticated. */
export function safeResearchUrl(raw){
 const value=checkText('Source URL',raw,2048);
 let u;try{u=new URL(value)}catch{throw contractError('INVALID','Use a complete HTTPS source URL')}
 const host=u?.hostname?.toLowerCase()||'';
 if(u.protocol!=='https:'||u.username||u.password||!host||host==='localhost'||
  host.endsWith('.local')||host.endsWith('.internal')||
  /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)||host.includes(':'))
  throw contractError('INVALID','Use a public HTTPS article or official company website');
 u.hash='';return u.href;
}

/** Attestation means *user reviewed*; never labelled independently verified. */
export function addReviewedResearchSource(session,{title,url,excerpt,insight='',sourceType='other',userReviewed,expectedRevision,now=new Date().toISOString(),idFactory=()=>uid('source')}={}){
 const n=next(session,expectedRevision);
 if(userReviewed!==true)throw contractError('UNCONFIRMED','Open and review the source before saving its claims');
 if(!['company-official','job-advert','independent','other'].includes(sourceType))throw contractError('INVALID','Unknown source category');
 const entry={id:idFactory(),title:checkText('Source title',title||'',200),url:safeResearchUrl(url),
  excerpt:checkText('Source excerpt',excerpt||'',1400),
  insight:checkText('Research note',insight||'',600),
  sourceType,reviewedByUser:true,reviewedAt:now};
 if(!/^source[a-zA-Z0-9_-]{3,100}$/.test(entry.id)||!entry.title||!entry.excerpt)
  throw contractError('INVALID','Source title and excerpt are required');
 if(!Array.isArray(n.researchSources))n.researchSources=[];
 if(n.researchSources.length>=15)throw contractError('INVALID','Maximum 15 sources per interview pack');
 n.researchSources.push(entry);return n;
}

/** Brief contains exactly the user's vacancy information and attributed excerpts. */
export function buildCompanyRoleBrief({job,session}={}){
 assertJob(job);
 const sources=(session?.researchSources||[]).filter(x=>x?.reviewedByUser===true&&x?.url&&x?.excerpt);
 return {
  employer:str(job.employer)||'Employer not named',
  role:str(job.role)||'Role not specified',
  requirements:(job.requirements||[]).slice(0,20).map(r=>({text:r.text,priority:r.priority,provenance:'user-pasted job advert'})),
  facts:sources.map((x,i)=>({citation:'['+(i+1)+']',text:str(x.excerpt),insight:str(x.insight),
   title:str(x.title),url:x.url,sourceType:x.sourceType,verification:'reviewed by user, not independently authenticated'})),
  sourceCount:sources.length,
  limitation:sources.length?
   'Company research is limited to the excerpts you reviewed. Ledger did not fetch or independently verify these websites.'
   :'No company facts are included. Add reviewed primary-source excerpts before treating this as company research.'
 };
}

export function interviewWorkbookBlocks({session,questions,job,candidateName=''}={}){
 const brief=buildCompanyRoleBrief({job,session});
 const blocks=[{kind:'name',text:'Interview preparation workbook'},
  {kind:'contact',text:str(candidateName)||'Candidate'},
  {kind:'line',text:'Role: '+brief.role+' | Company: '+brief.employer},
  {kind:'line',text:'Source note: job information and CV details are applicant-supplied.'},
  {kind:'section-title',text:'1. Job requirements (from pasted vacancy)',keepWithNext:true}];
 for(const r of brief.requirements)blocks.push({kind:'bullet',text:'['+r.priority+'] '+r.text});
 if(!brief.requirements.length)blocks.push({kind:'line',text:'No parsed requirements supplied.'});
 blocks.push({kind:'section-title',text:'2. Tailored practice questions',keepWithNext:true});
 for(const q of questions||[]){
  blocks.push({kind:'entry-head',text:q.text+' ['+q.source+']',keepWithNext:true});
  for(const e of q.evidence||[])blocks.push({kind:'line',text:'Possible CV evidence ('+e.path+'): '+e.excerpt});
  if(q.coachingHint)blocks.push({kind:'line',text:'Practice tip: '+q.coachingHint});
 }
 blocks.push({kind:'section-title',text:'3. My STAR stories',keepWithNext:true});
 for(const st of session?.stories||[]){
  blocks.push({kind:'entry-head',text:str(st.title)||'Untitled story',keepWithNext:true});
  for(const [label,key] of [['Situation','context'],['Task','task'],['Action','actions'],['Result','results']])
   if(str(st[key]))blocks.push({kind:'line',text:label+': '+str(st[key])});
 }
 if(!session?.stories?.length)blocks.push({kind:'line',text:'No STAR stories saved.'});
 blocks.push({kind:'section-title',text:'4. Saved practice answers and coaching notes',keepWithNext:true});
 for(const entry of session?.reviews||[]){
  blocks.push({kind:'entry-head',text:entry.questionText,keepWithNext:true});
  blocks.push({kind:'line',text:'Answer: '+entry.answer});
  for(const note of entry.feedback?.notes||[])blocks.push({kind:'bullet',text:'Coaching ('+note.kind+'): '+note.message});
  for(const flag of entry.feedback?.flaggedClaims||[])blocks.push({kind:'bullet',text:'Verify claim: '+flag.message});
 }
 if(!session?.reviews?.length)blocks.push({kind:'line',text:'No practice reviews saved.'});
 blocks.push({kind:'section-title',text:'5. Company and role research with citations',keepWithNext:true});
 for(const f of brief.facts){
  blocks.push({kind:'entry-head',text:f.citation+' '+f.title+' ('+f.sourceType+')',keepWithNext:true});
  blocks.push({kind:'line',text:'Source URL: '+f.url});
  blocks.push({kind:'line',text:'Excerpt supplied: '+f.text});
  if(f.insight)blocks.push({kind:'line',text:'My note: '+f.insight});
 }
 blocks.push({kind:'line',text:brief.limitation});
 blocks.push({kind:'section-title',text:'6. Final practice checklist',keepWithNext:true});
 for(const note of REFLECTION_PROMPTS)blocks.push({kind:'bullet',text:note});
 const sum=practiceSummary(session||{practice:[]});
 blocks.push({kind:'line',text:'Self-assessed timed answers: '+sum.answers+'. Automated checks are not hiring predictions.'});
 return blocks;
}
export function exportInterviewWorkbook(args,format='pdf'){
 if(!['pdf','docx'].includes(format))throw contractError('INVALID','Workbook export must be PDF or DOCX');
 return renderBlocksArtifact({
  blocks:interviewWorkbookBlocks(args),appearance:args.appearance||{},title:'Interview preparation workbook',
  sourceId:args.session?.id||'session',sourceRevision:args.session?.revision||0
 },format);
}
