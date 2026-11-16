/**
 * Group D Stage 14: offline application tracker over Group A's `ApplicationRecord`.
 * Pure, immutable commands. Persistence is the host's job through LocalRepositoryPort (expectedRevision on the whole book).
 * Linked CV/letter revisions are recorded exactly and verified, so the wrong version is flagged rather than assumed.
 */
import {contractError,isSafeId,cloneData,LEDGER_APPLICATION_STATUSES} from '../../contracts/platform.mjs';
import {validateLegacyApplications} from '../../domain/storage/application-shape.mjs';
const s=v=>typeof v==='string'?v.trim():'';
const idDefault=()=>'app'+globalThis.crypto.randomUUID().replace(/-/g,'');
const MAX_APPS=300,MAX_TASKS=40,MAX_CONTACTS=10;
const lim=(label,v,max)=>{if(typeof v!=='string'||v.length>max)throw contractError('INVALID','Invalid '+label);return v.trim();};
export const emptyBook=()=>({schema:'ledger-applications-v1',revision:0,applications:[]});
const next=(book,expectedRevision)=>{
 if(book.revision!==expectedRevision)throw contractError('CONFLICT','Applications changed elsewhere. Reload before editing.');
 return {...book,applications:cloneData(book.applications),revision:book.revision+1};
};
const find=(b,id)=>{const a=b.applications.find(x=>x.id===id);if(!a)throw contractError('INVALID','Unknown application');return a;};
const isoDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
export function addApplication(book,{company,role,status='Saved',location='',url='',notes='',jobText='',jobTargetId,date,expectedRevision,now=new Date().toISOString(),idFactory=idDefault}={}){
 const b=next(book,expectedRevision);
 if(b.applications.length>=MAX_APPS)throw contractError('INVALID','Application limit reached');
 if(!LEDGER_APPLICATION_STATUSES.includes(status))throw contractError('INVALID','Invalid status');
 if(url&&!/^https?:\/\//i.test(url))throw contractError('INVALID','Link must start with http:// or https://');
 if(date&&!isoDate(date))throw contractError('INVALID','Date must be YYYY-MM-DD');
 const app={id:idFactory(),status,company:lim('company',company||'',200),role:lim('role',role||'',200),location:lim('location',location,200),
  url:lim('url',url,1000),notes:lim('notes',notes,3000),jobText:lim('job text',jobText,60000),date:date||now.slice(0,10),
  contacts:[],tasks:[],history:[{at:now,from:null,to:status}],createdAt:now,updatedAt:now};
 if(!isSafeId(app.id))throw contractError('INVALID','Invalid id');
 if(!app.company&&!app.role)throw contractError('INVALID','Company or role required');
 if(jobTargetId)app.jobTargetId=jobTargetId;
 if(b.applications.some(x=>x.id===app.id))throw contractError('INVALID','Duplicate id');
 b.applications.push(app);return b;
}
export function updateApplication(book,id,patch,{expectedRevision,now=new Date().toISOString()}={}){
 const b=next(book,expectedRevision),a=find(b,id);
 for(const [k,v] of Object.entries(patch||{})){
  if(k==='company'||k==='role'||k==='location')a[k]=lim(k,v,200);
  else if(k==='notes')a.notes=lim(k,v,3000);
  else if(k==='jobText')a.jobText=lim(k,v,60000);
  else if(k==='url'){if(v&&!/^https?:\/\//i.test(v))throw contractError('INVALID','Link must start with http:// or https://');a.url=lim(k,v,1000);}
  else if(k==='date'){if(v&&!isoDate(v))throw contractError('INVALID','Date must be YYYY-MM-DD');a.date=v;}
  else throw contractError('INVALID','Field not editable here: '+k);
 }
 a.updatedAt=now;return b;
}
export function setStatus(book,id,status,{expectedRevision,now=new Date().toISOString()}={}){
 if(!LEDGER_APPLICATION_STATUSES.includes(status))throw contractError('INVALID','Invalid status');
 const b=next(book,expectedRevision),a=find(b,id);
 if(a.status!==status){a.history.push({at:now,from:a.status,to:status});a.status=status;a.updatedAt=now;}
 return b;
}
export function removeApplication(book,id,{expectedRevision,confirmed=false}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Deleting an application needs confirmation');
 const b=next(book,expectedRevision);find(b,id);b.applications=b.applications.filter(x=>x.id!==id);return b;
}
export function addTask(book,id,{title,due,expectedRevision,now=new Date().toISOString(),idFactory=()=> 'task'+globalThis.crypto.randomUUID().replace(/-/g,'')}={}){
 const b=next(book,expectedRevision),a=find(b,id);
 if(a.tasks.length>=MAX_TASKS)throw contractError('INVALID','Task limit reached');
 if(due&&!isoDate(due))throw contractError('INVALID','Due date must be YYYY-MM-DD');
 const t=lim('task',title||'',200);if(!t)throw contractError('INVALID','Task title required');
 a.tasks.push({id:idFactory(),title:t,due:due||'',done:false});a.updatedAt=now;return b;
}
export function toggleTask(book,id,taskId,{expectedRevision,now=new Date().toISOString()}={}){
 const b=next(book,expectedRevision),a=find(b,id),t=a.tasks.find(x=>x.id===taskId);
 if(!t)throw contractError('INVALID','Unknown task');t.done=!t.done;a.updatedAt=now;return b;
}
export function addContact(book,id,{name,email='',phone='',role='',expectedRevision,now=new Date().toISOString()}={}){
 const b=next(book,expectedRevision),a=find(b,id);
 if(a.contacts.length>=MAX_CONTACTS)throw contractError('INVALID','Contact limit reached');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))throw contractError('INVALID','Invalid email');
 a.contacts.push({name:lim('name',name||'',200),email:lim('email',email,200),phone:lim('phone',phone,60),role:lim('role',role,120)});a.updatedAt=now;return b;
}
/** Record the exact CV variant revision and letter revision that were sent. */
export function linkDocuments(book,id,{cvVariantId,cvRevision,coverLetterId,coverLetterRevision,expectedRevision,now=new Date().toISOString()}={}){
 const b=next(book,expectedRevision),a=find(b,id);
 if(cvVariantId!==undefined){if(!isSafeId(cvVariantId)||!Number.isSafeInteger(cvRevision)||cvRevision<0)throw contractError('INVALID','CV variant id and exact revision required');a.cvVariantId=cvVariantId;a.cvRevision=cvRevision;}
 if(coverLetterId!==undefined){if(!isSafeId(coverLetterId)||!Number.isSafeInteger(coverLetterRevision)||coverLetterRevision<0)throw contractError('INVALID','Letter id and exact revision required');a.coverLetterId=coverLetterId;a.coverLetterRevision=coverLetterRevision;}
 a.updatedAt=now;return b;
}
/**
 * Flags links that no longer point at what was sent. profile: CareerProfile; letters: CoverLetterDocument[].
 * 'stale' = the document has changed since it was linked; 'missing' = it no longer exists; 'mismatch' = letter targets another CV/job.
 */
export function verifyLinks(app,{profile,letters=[]}={}){
 const out=[];
 if(app.cvVariantId){
  const v=profile&&[profile.master,...profile.variants].find(x=>x.id===app.cvVariantId);
  if(!v)out.push({kind:'missing',target:'cv',message:'The linked CV variant no longer exists.'});
  else if(v.revision!==app.cvRevision)out.push({kind:'stale',target:'cv',message:'The CV changed after you linked it (linked revision '+app.cvRevision+', now '+v.revision+'). What you sent may differ from what you see now.'});
 }
 if(app.coverLetterId){
  const l=letters.find(x=>x.id===app.coverLetterId);
  if(!l)out.push({kind:'missing',target:'letter',message:'The linked cover letter no longer exists.'});
  else{
   if(l.revision!==app.coverLetterRevision)out.push({kind:'stale',target:'letter',message:'The cover letter changed after you linked it.'});
   if(app.cvVariantId&&l.cvVariantId&&l.cvVariantId!==app.cvVariantId)out.push({kind:'mismatch',target:'letter',message:'The letter was written for a different CV variant than the one linked here.'});
   if(app.jobTargetId&&l.jobTargetId&&l.jobTargetId!==app.jobTargetId)out.push({kind:'mismatch',target:'letter',message:'The letter targets a different job than this application.'});
  }
 }
 return out;
}
/* ---------- views ---------- */
export const kanban=book=>Object.fromEntries(LEDGER_APPLICATION_STATUSES.map(st=>[st,book.applications.filter(a=>a.status===st)]));
export function listApplications(book,{status,query,sort='date-desc'}={}){
 let r=book.applications.filter(a=>!status||a.status===status);
 if(query){const q=query.toLowerCase();r=r.filter(a=>[a.company,a.role,a.location,a.notes].some(x=>String(x).toLowerCase().includes(q)));}
 const cmp={'date-desc':(a,b)=>b.date.localeCompare(a.date),'date-asc':(a,b)=>a.date.localeCompare(b.date),'company':(a,b)=>a.company.localeCompare(b.company)}[sort];
 if(!cmp)throw contractError('INVALID','Unknown sort');
 return [...r].sort(cmp);
}
/** today: 'YYYY-MM-DD' (injected for determinism). */
export function dueTasks(book,today,{withinDays=7}={}){
 const end=new Date(Date.parse(today)+withinDays*864e5).toISOString().slice(0,10),out=[];
 for(const a of book.applications)for(const t of a.tasks)if(!t.done&&t.due)out.push({applicationId:a.id,company:a.company,role:a.role,task:t,state:t.due<today?'overdue':t.due<=end?'upcoming':'later'});
 return out.filter(x=>x.state!=='later').sort((x,y)=>x.task.due.localeCompare(y.task.due));
}
/** Honest reminder capability: never claims background delivery while the browser is closed. */
export function reminderCapability({notification}={}){
 const perm=notification&&notification.permission;
 return {inAppList:true,browserNotifications:perm==='granted',needsPermission:perm==='default',blocked:perm==='denied',
  limitation:'Reminders appear only while this app is open (or if your browser delivers notifications). Nothing is sent when the browser is closed.'};
}
