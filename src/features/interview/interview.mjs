/**
 * Group D Stage 15: interview preparation. Local only: no webcam, microphone or hosted service.
 * Question sources are labelled: 'job-requirement' and 'your-role' come from the user's own data;
 * 'example' questions are generic prompts and are NEVER presented as the user's facts.
 */
import {contractError,isSafeId,cloneData} from '../../contracts/platform.mjs';
import {renderBlocksArtifact} from '../export/block-export.mjs';
const s=v=>typeof v==='string'?v.trim():'';
export const COMPETENCIES=Object.freeze({
 teamwork:['Tell me about a time you worked closely with a team to get something done.','Describe a disagreement within a team and how it was resolved.'],
 leadership:['Describe a time you led or guided other people.','Tell me about a time you had to motivate someone.'],
 problem:['Tell me about a difficult problem you solved at work.','Describe a time something went wrong and what you did next.'],
 customer:['Describe a time you handled a difficult customer or stakeholder.','Tell me about going beyond what was expected for someone you served.'],
 organisation:['How do you prioritise when everything seems urgent? Give an example.','Describe a time you managed several tasks with competing deadlines.'],
 learning:['Tell me about something new you had to learn quickly.','Describe feedback you received and what you changed.']});
const KEYS=[['teamwork',/\b(team|collaborat|cooperat)/i],['leadership',/\b(lead|manag|supervis|mentor|coach)/i],['problem',/\b(problem|troubleshoot|resolve|analy)/i],
 ['customer',/\b(customer|client|stakeholder|service)/i],['organisation',/\b(priorit|deadline|organis|organiz|schedul|plan)/i],['learning',/\b(learn|train|develop|adapt)/i]];
const REFLECTION=['What went well in that answer?','Which fact or number would make it more convincing (only if true)?','Did you explain your own part, not just the team\'s?','What would you cut to stay under two minutes?'];
export const REFLECTION_PROMPTS=Object.freeze(REFLECTION);
let q=0;
const qid=()=>'q'+(++q);
/** @returns questions [{id,text,source,competency?,requirementId?,rolePath?}] */
export function buildQuestions({job,document}={}){
 const out=[];
 for(const r of job?.requirements||[]){
  if(r.priority==='preferred')continue;
  out.push({id:qid(),text:'The role asks for: "'+r.text+'". Tell me about a time you showed this.',source:'job-requirement',requirementId:r.id});
 }
 (document?.experience||[]).slice(0,3).forEach((e,i)=>{
  if(s(e.title))out.push({id:qid(),text:'Walk me through your role as '+s(e.title)+(s(e.employer)?' at '+s(e.employer):'')+' and what you are proudest of.',source:'your-role',rolePath:`experience[${e.id??i}]`});
 });
 const text=[job?.originalText,job?.role].filter(Boolean).join(' ');
 const comps=KEYS.filter(([,rx])=>rx.test(text)).map(([k])=>k);
 for(const k of (comps.length?comps:['teamwork','problem']).slice(0,4))
  out.push({id:qid(),text:COMPETENCIES[k][0],source:'example',competency:k,note:'Generic practice question; answer with your own real example.'});
 out.push({id:qid(),text:'Why do you want this role'+(job?.employer?' at '+job.employer:'')+'?',source:'example',competency:'motivation',note:'Generic practice question.'});
 return out;
}
/* ---------- STAR stories (Group A InterviewSession.stories, plus `task`) ---------- */
const idDefault=p=>p+globalThis.crypto.randomUUID().replace(/-/g,'');
export const emptySession=({id=idDefault('session'),jobTargetId}={})=>({id,...(jobTargetId?{jobTargetId}:{}),notes:'',stories:[],practice:[],revision:0});
const nextS=(se,rev)=>{if(se.revision!==rev)throw contractError('CONFLICT','Session changed. Reload before editing.');return {...cloneData(se),revision:se.revision+1};};
const field=(l,v,max=3000)=>{if(typeof v!=='string'||v.length>max)throw contractError('INVALID','Invalid '+l);return v;};
export function addStory(se,{title='',context='',task='',actions='',results='',evidencePaths=[],expectedRevision,idFactory=()=>idDefault('story')}={}){
 const n=nextS(se,expectedRevision);if(n.stories.length>=30)throw contractError('INVALID','Story limit reached');
 const story={id:idFactory(),title:field('title',title,200),context:field('context',context),task:field('task',task),actions:field('actions',actions),results:field('results',results),evidencePaths:cloneData(evidencePaths)};
 if(!isSafeId(story.id))throw contractError('INVALID','Invalid id');
 n.stories.push(story);return n;
}
export function updateStory(se,id,patch,{expectedRevision}={}){
 const n=nextS(se,expectedRevision),st=n.stories.find(x=>x.id===id);if(!st)throw contractError('INVALID','Unknown story');
 for(const [k,v] of Object.entries(patch||{})){if(!['title','context','task','actions','results'].includes(k))throw contractError('INVALID','Field not editable: '+k);st[k]=field(k,v,k==='title'?200:3000);}
 return n;
}
export function storyCompleteness(story){
 const missing=['context','task','actions','results'].filter(k=>!s(story[k]));
 const notes=[];
 if(s(story.results)&&!/\d/.test(story.results))notes.push('Your result has no figure. Add one only if it is real; otherwise describe the outcome in words.');
 if(/\bwe\b/i.test(story.actions)&&!/\bI\b/.test(story.actions))notes.push('Actions say "we" but not "I": make clear what you personally did.');
 return {complete:missing.length===0,missing,notes};
}
/* ---------- practice ---------- */
export function startPractice(se,{questionId,questionText,limitSeconds=120,now=Date.now(),expectedRevision}={}){
 const n=nextS(se,expectedRevision);if(!s(questionText))throw contractError('INVALID','Question required');
 if(!(limitSeconds>=30&&limitSeconds<=600))throw contractError('INVALID','Limit must be 30-600 seconds');
 const open=n.practice.find(p=>p.endedAt===undefined);if(open)throw contractError('INVALID','Finish the current practice answer first');
 n.practice.push({id:idDefault('prac'),questionId,questionText,limitSeconds,startedAt:now});return n;
}
/** scores: {structure,evidence,clarity,concision} each 1-5 (self-assessed). */
export function finishPractice(se,practiceId,{now=Date.now(),scores={},notes='',expectedRevision}={}){
 const n=nextS(se,expectedRevision),p=n.practice.find(x=>x.id===practiceId);
 if(!p||p.endedAt!==undefined)throw contractError('INVALID','No such open practice');
 for(const [k,v] of Object.entries(scores))if(!['structure','evidence','clarity','concision'].includes(k)||!(Number.isInteger(v)&&v>=1&&v<=5))throw contractError('INVALID','Scores are 1-5 for structure, evidence, clarity, concision');
 p.endedAt=now;p.elapsedSeconds=Math.max(0,Math.round((now-p.startedAt)/1000));p.overTime=p.elapsedSeconds>p.limitSeconds;p.scores=scores;p.notes=field('notes',notes);
 return n;
}
export function practiceSummary(se){
 const done=se.practice.filter(p=>p.endedAt!==undefined),avg=k=>{const v=done.map(p=>p.scores?.[k]).filter(Number.isFinite);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:null;};
 return {answers:done.length,overTime:done.filter(p=>p.overTime).length,averages:{structure:avg('structure'),evidence:avg('evidence'),clarity:avg('clarity'),concision:avg('concision')},selfAssessed:true};
}
/* ---------- export / clear ---------- */
export const exportSession=se=>JSON.stringify({kind:'ledger-interview-session',version:1,session:se},null,1);
export function importSession(text){
 let d;try{d=JSON.parse(text);}catch{throw contractError('INVALID','Not valid JSON');}
 if(d?.kind!=='ledger-interview-session'||d.version!==1||!d.session||!Array.isArray(d.session.stories)||!Array.isArray(d.session.practice)||!isSafeId(d.session.id))throw contractError('INVALID','Unrecognised interview backup');
 if(d.session.stories.length>30||d.session.practice.length>500)throw contractError('INVALID','Backup is too large');
 return {...cloneData(d.session)};
}
export function clearSession(se,{confirmed=false,expectedRevision}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Clearing practice data needs confirmation');
 if(se.revision!==expectedRevision)throw contractError('CONFLICT','Session changed.');
 return {...emptySession({id:se.id,jobTargetId:se.jobTargetId}),revision:se.revision+1};
}
/** Printable preparation pack (PDF/DOCX via Group B renderer). Examples are labelled as examples. */
export function preparationPackBlocks({session,questions,candidateName='',role=''}){
 const B=[{kind:'name',text:'Interview preparation'+(role?': '+role:'')}];if(candidateName)B.push({kind:'contact',text:candidateName});
 B.push({kind:'section-title',text:'Questions to practise',keepWithNext:true});
 for(const x of questions)B.push({kind:'bullet',text:x.text+(x.source==='example'?' (generic example)':'')});
 B.push({kind:'section-title',text:'My STAR stories',keepWithNext:true});
 if(!session.stories.length)B.push({kind:'line',text:'No stories written yet.'});
 for(const st of session.stories){
  B.push({kind:'entry-head',text:st.title||'Untitled story',keepWithNext:true});
  for(const [l,k] of [['Situation','context'],['Task','task'],['Action','actions'],['Result','results']])if(s(st[k]))B.push({kind:'line',text:l+': '+st[k]});
 }
 B.push({kind:'section-title',text:'After each practice answer',keepWithNext:true});
 for(const r of REFLECTION)B.push({kind:'bullet',text:r});
 return B;
}
export const exportPreparationPack=(args,format='pdf')=>renderBlocksArtifact({blocks:preparationPackBlocks(args),title:'Interview preparation',sourceId:args.session.id,sourceRevision:args.session.revision},format);
