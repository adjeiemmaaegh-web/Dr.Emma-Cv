/**
 * Group E Stage 4: beginner-first guided journeys (Create / Import / Improve / Tailor).
 * Pure state machine over Group A's ResumeDocument shape: no schema of its own, no storage, no network.
 * Examples are shown as hints ("Example only") and are NEVER written into the document as values.
 * Other workstreams are consumed only through their public APIs (B import/export, C diagnostics/tailoring).
 */
import {contractError} from '../../contracts/platform.mjs';
import {validLegacyDocument} from '../../domain/storage/legacy-shape.mjs';
import {parseResumeText,createImportReview,approveImportReview} from '../import/text-import.mjs';
import {runAtsChecks,parseJobText,compareToDocument,buildTailoringSuggestions,analyzeResumeReadiness} from '../intelligence/index.mjs';
export const JOURNEY_SCHEMA=1;
const s=v=>typeof v==='string'?v.trim():'';
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE=/^((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}$/i;
const F=(id,label,o={})=>({id,label,type:'text',required:false,max:200,...o});
const STEPS={
 create:[
  {id:'basics',kind:'form',title:'About you',description:'Employers need to be able to reach you. Nothing leaves your device.',
   fields:[F('firstName','First name',{required:true,autocomplete:'given-name'}),F('lastName','Last name',{required:true,autocomplete:'family-name'}),
    F('email','Email address',{required:true,type:'email',autocomplete:'email',example:'name@example.com'}),F('phone','Phone (optional)',{type:'tel',autocomplete:'tel'}),F('city','City (optional)',{autocomplete:'address-level2'})]},
  {id:'target',kind:'form',title:'The job you want',description:'This becomes the title under your name. You can change it later.',
   fields:[F('title','Job title you are aiming for',{required:true,example:'Retail Supervisor'})]},
  {id:'experience',kind:'form',title:'Your most recent job',description:'Start with the latest one. Add more after your first CV is ready. If you have no work history yet, choose "Skip this step".',optional:true,
   fields:[F('jobTitle','Job title',{required:true}),F('employer','Employer',{required:true}),F('start','Start date',{required:true,example:'Jan 2020',pattern:'date'}),
    F('current','I still work here',{type:'checkbox'}),F('end','End date',{example:'Dec 2023',pattern:'date'}),
    F('achievements','What you did (one point per line)',{type:'textarea',max:3000,help:'Write things that are true. Add numbers only if you can back them up.',example:'Trained 4 new colleagues'})]},
  {id:'education',kind:'form',title:'Education and training',description:'Optional. Add your highest qualification.',optional:true,
   fields:[F('degree','Qualification',{required:true}),F('school','School or college',{required:true}),F('start','Start year',{pattern:'date'}),F('end','End year',{pattern:'date'})]},
  {id:'skills',kind:'form',title:'Your skills',description:'List the skills you really have, separated by commas.',optional:true,
   fields:[F('skills','Skills',{type:'textarea',max:1000,example:'Customer service, Stock control, Scheduling'})]},
  {id:'summary',kind:'form',title:'A short summary',description:'Optional: two sentences about you. Leave blank if unsure; you can add it later.',optional:true,
   fields:[F('summary','Summary',{type:'textarea',max:800,example:'Reliable retail supervisor who enjoys training new staff.'})]},
  {id:'finish',kind:'finish',title:'Your CV is ready to review'}],
 import:[
  {id:'source',kind:'form',title:'Paste your old CV',description:'Paste the text of your existing CV. We read it on your device and show you what we found before anything is saved.',
   fields:[F('text','CV text',{type:'textarea',required:true,max:200000})]},
  {id:'review',kind:'review',title:'Check what we found',description:'Tick what is correct. Anything you do not tick is left out.'},
  {id:'finish',kind:'finish',title:'Imported'}],
 improve:[
  {id:'findings',kind:'report',title:'Ways to improve your CV',description:'Checked on your device. These are suggestions, not a score.'},
  {id:'finish',kind:'finish',title:'All set'}],
 tailor:[
  {id:'job',kind:'form',title:'Paste the job advert',description:'Paste the requirements section for best results, one requirement per line.',
   fields:[F('jobText','Job advert text',{type:'textarea',required:true,max:60000}),F('jobRole','Job title',{max:120}),F('jobEmployer','Employer',{max:120})]},
  {id:'results',kind:'report',title:'How your CV matches this job',description:'Based on words in your CV. "No evidence found" does not mean you lack the skill; add it only if it is true.'},
  {id:'finish',kind:'finish',title:'Suggestions ready'}]
};
export const JOURNEYS=Object.freeze({
 create:{label:'Create a CV',blurb:'Answer a few simple questions and get a ready-to-send CV.',needsDocument:false},
 import:{label:'Import my old CV',blurb:'Paste your current CV and check what we find.',needsDocument:false},
 improve:{label:'Improve my CV',blurb:'Get clear, specific suggestions for the CV you already have.',needsDocument:true},
 tailor:{label:'Tailor to a job',blurb:'Compare your CV with a job advert and see what to highlight.',needsDocument:true}});
export const stepsFor=kind=>{if(!STEPS[kind])throw contractError('INVALID','Unknown journey');return STEPS[kind].map(({id,title,kind:k,optional})=>({id,title,kind:k,optional:!!optional}));};
const def=(kind,id)=>STEPS[kind].find(x=>x.id===id);
export function availability(kind,{hasDocument}={}){
 const j=JOURNEYS[kind];if(!j)throw contractError('INVALID','Unknown journey');
 return j.needsDocument&&!hasDocument?{available:false,reason:'You need a CV first. Choose "Create a CV" or "Import my old CV", then come back.'}:{available:true,reason:''};
}
export function startJourney(kind,{hasDocument=false}={}){
 const a=availability(kind,{hasDocument});if(!a.available)throw contractError('UNAVAILABLE',a.reason);
 return {schema:JOURNEY_SCHEMA,kind,step:STEPS[kind][0].id,answers:{},skipped:[],revision:0};
}
export function progress(state){
 const list=STEPS[state.kind],i=list.findIndex(x=>x.id===state.step);
 return {current:i+1,total:list.length,percent:Math.round(i/(list.length-1)*100),label:'Step '+(i+1)+' of '+list.length+': '+list[i].title};
}
function validate(step,values){
 const errors=[];
 for(const f of step.fields||[]){
  const raw=values[f.id],v=f.type==='checkbox'?!!raw:s(raw);
  if(f.type!=='checkbox'&&typeof raw!=='undefined'&&typeof raw!=='string')errors.push({field:f.id,message:f.label+' must be text.'});
  else if(f.required&&!v)errors.push({field:f.id,message:'Please enter '+f.label.toLowerCase().replace(/ \(optional\)/,'')+'.'});
  else if(typeof v==='string'&&v.length>f.max)errors.push({field:f.id,message:f.label+' is too long (maximum '+f.max+' characters).'});
  else if(f.type==='email'&&v&&!EMAIL.test(v))errors.push({field:f.id,message:'This email address does not look right. Check for a missing @ or dot.'});
  else if(f.pattern==='date'&&v&&!DATE.test(v))errors.push({field:f.id,message:'Use a year like 2020, or a month and year like "Jan 2020".'});
 }
 if(step.id==='experience'||step.id==='education'){
  const a=s(values.start).match(/(19|20)\d{2}/),b=s(values.end).match(/(19|20)\d{2}/);
  if(a&&b&&+b[0]<+a[0]&&!values.current)errors.push({field:'end',message:'The end date is before the start date.'});
  if(step.id==='experience'&&!values.current&&!s(values.end)&&s(values.start))errors.push({field:'end',message:'Add an end date, or tick "I still work here".'});
 }
 return errors;
}
const clean=(step,values)=>Object.fromEntries((step.fields||[]).map(f=>[f.id,f.type==='checkbox'?!!values[f.id]:s(values[f.id])]));
const at=(state,patch)=>({...state,...patch,revision:state.revision+1});
export function nextStepId(kind,id){const l=STEPS[kind],i=l.findIndex(x=>x.id===id);return l[Math.min(i+1,l.length-1)].id;}
/** Submit a step. Returns {state,errors}; on errors the state is unchanged. */
export function submit(state,values={},ctx={}){
 const step=def(state.kind,state.step);
 if(!step||step.kind==='finish')return {state,errors:[]};
 if(step.kind==='form'){
  const errors=validate(step,values);if(errors.length)return {state,errors};
  const answers={...state.answers,[step.id]:clean(step,values)};
  let next=at(state,{answers,step:nextStepId(state.kind,step.id)});
  if(state.kind==='import'){ // parse immediately so the next step can show the review
   const parsed=parseResumeText(answers.source.text),review=createImportReview(parsed,{sourceName:'pasted CV'});
   if(review.status==='blocked')return {state,errors:[{field:'text',message:'We could not find anything we recognise. Check that you pasted the CV text, with headings like Experience and Education.'}]};
   next={...next,review:{items:review.items.map(({path,value,sourceLine,uncertain})=>({path,value,sourceLine,uncertain})),warnings:review.warnings}};
  }
  return {state:next,errors:[]};
 }
 if(step.kind==='review'){
  const accepted=Array.isArray(values.accepted)?values.accepted.filter(p=>state.review.items.some(i=>i.path===p)):[];
  if(!accepted.length)return {state,errors:[{field:'accepted',message:'Tick at least one item to import, or go back and paste a different CV.'}]};
  return {state:at(state,{answers:{...state.answers,review:{accepted}},step:nextStepId(state.kind,step.id)}),errors:[]};
 }
 return {state:at(state,{step:nextStepId(state.kind,step.id)}),errors:[]};
}
export function skip(state){
 const step=def(state.kind,state.step);
 if(!step?.optional)throw contractError('INVALID','This step is needed.');
 return at(state,{skipped:[...state.skipped,step.id],step:nextStepId(state.kind,step.id)});
}
export function back(state){
 const l=STEPS[state.kind],i=l.findIndex(x=>x.id===state.step);
 return i<=0?state:at(state,{step:l[i-1].id});
}
/** ResumeDocument from the create journey. Only what the user typed. */
export function buildDocument(answers){
 const b=answers.basics||{},e=answers.experience,ed=answers.education;
 const doc={personalInfo:{firstName:s(b.firstName),lastName:s(b.lastName),title:s(answers.target?.title),email:s(b.email),phone:s(b.phone),city:s(b.city),postcode:'',linkedin:'',website:'',photo:''},
  summary:s(answers.summary?.summary),hobbies:'',references:'',experience:[],education:[],skills:[],languages:[],certifications:[],projects:[],accomplishments:[],customSections:[]};
 if(e&&s(e.jobTitle)){
  const lines=s(e.achievements).split(/\r?\n/).map(x=>x.replace(/^[\s•*-]+/,'').trim()).filter(Boolean);
  doc.experience.push({id:'exp1',title:e.jobTitle,employer:e.employer,location:'',start:e.start,end:e.current?'':e.end,current:!!e.current,
   description:lines.length?'<ul>'+lines.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>':''});
 }
 if(ed&&s(ed.degree))doc.education.push({id:'edu1',degree:ed.degree,school:ed.school,start:ed.start,end:ed.end,description:''});
 const skills=s(answers.skills?.skills).split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
 doc.skills=[...new Set(skills)].slice(0,40).map(name=>({name,level:3}));
 if(!validLegacyDocument(doc))throw contractError('INVALID','Could not build a valid CV from the answers');
 return doc;
}
/** What to show on the current step. ctx.document is the user's existing CV (for improve/tailor). */
export function getView(state,ctx={}){
 const step=def(state.kind,state.step);
 const base={id:step.id,kind:step.kind,title:step.title,description:step.description||'',optional:!!step.optional,progress:progress(state),canGoBack:state.step!==STEPS[state.kind][0].id};
 if(step.kind==='form')return {...base,fields:step.fields.map(f=>({...f,value:state.answers[step.id]?.[f.id]??(f.type==='checkbox'?false:'')}))};
 if(step.kind==='review')return {...base,warnings:state.review?.warnings||[],items:(state.review?.items||[]).map(i=>({path:i.path,label:describeItem(i),uncertain:i.uncertain,line:i.sourceLine,checked:state.answers.review?.accepted?.includes(i.path)??!i.uncertain}))};
 if(step.kind==='report'){
  if(!ctx.document)throw contractError('UNAVAILABLE','Your CV is not available');
  if(state.kind==='improve'){
   const r=runAtsChecks({document:ctx.document,appearance:ctx.appearance||{},now:ctx.now});
   const rows=analyzeResumeReadiness({document:ctx.document,appearance:ctx.appearance||{},now:ctx.now}).prioritizedCorrections.slice(0,12).map(f=>({severity:f.priority==='critical'?'error':f.priority==='high'?'warning':'info',text:f.message,why:f.explanation+' Next: '+f.correction}));
   return {...base,rows,empty:rows.length?'':'No problems found. Well done.',disclaimer:r.disclaimer};
  }
  const {job}=parseJobText(state.answers.job.jobText,{role:s(state.answers.job.jobRole)||undefined,employer:s(state.answers.job.jobEmployer)||undefined});
  const c=compareToDocument(job,ctx.document);
  const rows=c.results.map(r=>({status:r.status,priority:r.priority,text:r.requirement,why:r.note||(r.citations[0]?'Found in your CV: "'+r.citations[0].excerpt+'"':'')}));
  return {...base,rows,skillEvidence:c.skillEvidence,summary:c.summary,disclaimer:c.disclaimer,empty:rows.length?'':'We could not find requirement lines. Go back and paste the requirements, one per line.'};
 }
 return base;
}
function describeItem(i){
 if(i.path==='personalInfo.name')return 'Name: '+i.value;
 if(i.path.startsWith('personalInfo.'))return i.path.split('.')[1]+': '+i.value;
 if(/^experience\[/.test(i.path))return 'Job: '+[i.value.title,i.value.employer].filter(Boolean).join(' at ')+' ('+(i.value.start||'date missing')+')';
 if(/^education\[/.test(i.path))return 'Education: '+[i.value.degree,i.value.school].filter(Boolean).join(', ');
 if(i.path==='skills')return 'Skills: '+i.value.map(x=>x.name).join(', ');
 return i.path+': '+(typeof i.value==='string'?i.value.slice(0,120):'found');
}
/** Final output: create -> {document}; import -> {document}; improve -> {}; tailor -> {job,suggestions,prompts} (apply via Group C). */
export function finish(state,ctx={}){
 if(state.step!=='finish')throw contractError('INVALID','Journey is not finished');
 if(state.kind==='create')return {document:buildDocument(state.answers)};
 if(state.kind==='import'){
  const parsed=parseResumeText(state.answers.source.text),review=createImportReview(parsed,{sourceName:'pasted CV'});
  const profile=approveImportReview(review,{confirmed:true,accepted:state.answers.review.accepted});
  return {document:profile.master.document,evidence:profile.evidence};
 }
 if(state.kind==='tailor'){
  const {job}=parseJobText(state.answers.job.jobText,{role:s(state.answers.job.jobRole)||undefined,employer:s(state.answers.job.jobEmployer)||undefined});
  const comparison=compareToDocument(job,ctx.document);
  return {job,comparison,...buildTailoringSuggestions({document:ctx.document,job,comparison})};
 }
 return {};
}
/* ---------- resume later ---------- */
const KIND='ledger-onboarding-draft';
export function serializeDraft(state){return JSON.stringify({kind:KIND,version:1,state});}
export function restoreDraft(text){
 let d;try{d=JSON.parse(text);}catch{throw contractError('INVALID','Draft is not valid');}
 const st=d?.state;
 if(d?.kind!==KIND||d.version!==1||!st||st.schema!==JOURNEY_SCHEMA||!STEPS[st.kind]||!def(st.kind,st.step)||typeof st.answers!=='object'||st.answers===null||!Array.isArray(st.skipped))throw contractError('INVALID','Draft is not recognised');
 for(const [sid,vals] of Object.entries(st.answers)){
  const step=def(st.kind,sid);if(!step)throw contractError('INVALID','Draft has an unknown step');
  if(step.kind==='form')for(const [k,v] of Object.entries(vals)){const f=step.fields.find(x=>x.id===k);if(!f||(typeof v!=='string'&&typeof v!=='boolean')||(typeof v==='string'&&v.length>f.max))throw contractError('INVALID','Draft has invalid data');}
 }
 const out={schema:JOURNEY_SCHEMA,kind:st.kind,step:st.step,answers:st.answers,skipped:st.skipped.filter(x=>typeof x==='string'&&def(st.kind,x)),revision:Number.isSafeInteger(st.revision)?st.revision:0};
 if(st.kind==='import'&&typeof st.answers.source?.text==='string'){ // never trust a stored review: recompute from the pasted text
  const r=createImportReview(parseResumeText(st.answers.source.text),{sourceName:'pasted CV'});
  if(r.status==='review-required')out.review={items:r.items.map(({path,value,sourceLine,uncertain})=>({path,value,sourceLine,uncertain})),warnings:r.warnings};
 }
 if(def(st.kind,st.step).kind==='review'&&!out.review)throw contractError('INVALID','Draft is incomplete');
 return out;
}
