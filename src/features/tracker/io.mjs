/** Group D Stage 14: backup/restore, legacy import and CSV export for the tracker. Imports are review-first. */
import {contractError,cloneData,isSafeId,isPlainObject,LEDGER_APPLICATION_STATUSES} from '../../contracts/platform.mjs';
import {validateLegacyApplications} from '../../domain/storage/application-shape.mjs';
import {emptyBook} from './tracker.mjs';
export function exportBook(book){return JSON.stringify({kind:'ledger-applications',version:1,book},null,1);}
const csvCell=v=>{let t=String(v??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return /[",\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}; // neutralise spreadsheet formulas
export function exportCsv(book){
 const head=['Company','Role','Status','Date','Location','Link','Notes'];
 return [head,...book.applications.map(a=>[a.company,a.role,a.status,a.date,a.location,a.url,a.notes])].map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
const validDate=v=>typeof v==='string'&&(/^\d{4}-\d{2}-\d{2}$/.test(v))&&
 !Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
function recordProblem(a){
 if(!isPlainObject(a)||!isSafeId(a.id))return 'Invalid application identity';
 if(!LEDGER_APPLICATION_STATUSES.includes(a.status))return 'Unknown application status';
 for(const [field,max] of [['company',200],['role',200],['location',200],['url',1000],['notes',3000],['jobText',60000],['date',10],['createdAt',40],['updatedAt',40]]){
  if(a[field]!==undefined&&(typeof a[field]!=='string'||a[field].length>max))return 'Invalid '+field;
 }
 if(!String(a.company||'').trim()&&!String(a.role||'').trim())return 'Company or role is required';
 if(a.date&&!validDate(a.date))return 'Invalid application date';
 if(a.url&&!new RegExp('^https?://','i').test(a.url))return 'Unsafe application URL';
 for(const key of ['tasks','contacts','history'])if(a[key]!==undefined&&!Array.isArray(a[key]))return 'Invalid '+key;
 if((a.tasks||[]).length>40||(a.contacts||[]).length>10||(a.history||[]).length>500)return 'Application entries exceed limits';
 for(const x of a.tasks||[]){
  if(!isPlainObject(x)||!isSafeId(x.id)||typeof x.title!=='string'||!x.title.trim()||
   x.title.length>200||typeof x.done!=='boolean'||typeof x.due!=='string'||x.due&&!validDate(x.due))return 'Invalid task';
 }
 for(const x of a.contacts||[]){
  if(!isPlainObject(x)||typeof x.name!=='string'||x.name.length>200||
   ['email','phone','role'].some(k=>x[k]!==undefined&&typeof x[k]!=='string'))return 'Invalid contact';
 }
 for(const x of a.history||[]){
  if(!isPlainObject(x)||typeof x.at!=='string'||(x.from!==null&&!LEDGER_APPLICATION_STATUSES.includes(x.from))||
   !LEDGER_APPLICATION_STATUSES.includes(x.to))return 'Invalid status history';
 }
 if(a.cvVariantId!==undefined&&(!isSafeId(a.cvVariantId)||!Number.isSafeInteger(a.cvRevision)||a.cvRevision<0))return 'Invalid linked CV revision';
 if(a.coverLetterId!==undefined&&(!isSafeId(a.coverLetterId)||!Number.isSafeInteger(a.coverLetterRevision)||a.coverLetterRevision<0))return 'Invalid linked letter revision';
 if(a.jobTargetId!==undefined&&!isSafeId(a.jobTargetId))return 'Invalid job target';
 return null;
}
function normalise(a){
 const o={id:a.id,status:a.status,company:a.company??'',role:a.role??'',location:a.location??'',url:a.url??'',notes:a.notes??'',jobText:a.jobText??'',date:a.date||'',
  contacts:Array.isArray(a.contacts)?a.contacts:[],tasks:Array.isArray(a.tasks)?a.tasks:[],history:Array.isArray(a.history)?a.history:[],
  createdAt:a.createdAt||'',updatedAt:a.updatedAt||''};
 for(const k of ['cvVariantId','cvRevision','coverLetterId','coverLetterRevision','jobTargetId'])if(a[k]!==undefined)o[k]=a[k];
 return o;
}
/** Returns an ImportReview-style object: nothing changes until approveBookImport is called with confirmed:true. */
export function reviewBookImport(text,currentBook){
 let data;try{data=JSON.parse(text);}catch{return {status:'blocked',warnings:['The file is not valid JSON.'],requiresUserConfirmation:true,incoming:[],conflicts:[]};}
 const list=Array.isArray(data)?data:data?.book?.applications;
 const legacy=Array.isArray(data);
 if(!Array.isArray(list))return {status:'blocked',warnings:['No applications found in this file.'],requiresUserConfirmation:true,incoming:[],conflicts:[]};
 if(legacy&&!validateLegacyApplications(list))return {status:'blocked',warnings:['The legacy application list is invalid (field types, ids, statuses or links).'],requiresUserConfirmation:true,incoming:[],conflicts:[]};
 if(!legacy&&(data.kind!=='ledger-applications'||data.version!==1))return {status:'blocked',warnings:['Unrecognised backup type or version.'],requiresUserConfirmation:true,incoming:[],conflicts:[]};
 if(list.length>300)return {status:'blocked',warnings:['More than 300 applications; refusing to import.'],requiresUserConfirmation:true,incoming:[],conflicts:[]};
 const ids=new Set(currentBook.applications.map(a=>a.id)),seen=new Set(),warnings=[],incoming=[],conflicts=[];
 for(const a of list){
  if(!a||typeof a.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{5,79}$/.test(a.id)||seen.has(a.id)){warnings.push('An entry with a missing, unsafe or duplicate id was skipped.');continue;}
  seen.add(a.id);const n=normalise(a);
  if(n.url&&!/^https?:\/\//i.test(n.url)){n.url='';warnings.push('A non-web link was removed from "'+n.company+'".');}
  const issue=recordProblem(n);
  if(issue){warnings.push('Entry '+n.id+' skipped: '+issue+'.');continue;}
  incoming.push(n);if(ids.has(n.id))conflicts.push(n.id);
 }
 if(legacy)warnings.push('Legacy list: tasks, contacts and document links start empty.');
 if(currentBook.applications.length+incoming.length-conflicts.length>300)return {status:'blocked',warnings:['Importing would exceed 300 applications.'],requiresUserConfirmation:true,incoming:[],conflicts:[]};
 return {status:incoming.length?'review-required':'blocked',warnings,requiresUserConfirmation:true,incoming,conflicts};
}
/** conflictPolicy: 'keep-existing' (default) | 'replace'. Never merges silently. */
export function approveBookImport(book,review,{confirmed=false,conflictPolicy='keep-existing',expectedRevision}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Explicit confirmation required');
 if(review.status!=='review-required')throw contractError('INVALID','Nothing to import');
 if(!['keep-existing','replace'].includes(conflictPolicy))
  throw contractError('INVALID','Unknown import conflict policy');
 if(!Array.isArray(review.incoming)||review.incoming.some(a=>recordProblem(a)!==null))
  throw contractError('INVALID','Reviewed application entries changed or became invalid');
 if(book.revision!==expectedRevision)throw contractError('CONFLICT','Applications changed elsewhere.');
 const b={...book,applications:cloneData(book.applications),revision:book.revision+1};
 for(const a of review.incoming){
  const i=b.applications.findIndex(x=>x.id===a.id);
  if(i<0)b.applications.push(cloneData(a));else if(conflictPolicy==='replace')b.applications[i]=cloneData(a);
 }
 return b;
}
export {emptyBook};
