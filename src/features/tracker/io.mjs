/** Group D Stage 14: backup/restore, legacy import and CSV export for the tracker. Imports are review-first. */
import {contractError,cloneData,isSafeId,LEDGER_APPLICATION_STATUSES} from '../../contracts/platform.mjs';
import {validateLegacyApplications} from '../../domain/storage/application-shape.mjs';
import {emptyBook} from './tracker.mjs';
export function exportBook(book){return JSON.stringify({kind:'ledger-applications',version:1,book},null,1);}
const csvCell=v=>{let t=String(v??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return /[",\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}; // neutralise spreadsheet formulas
export function exportCsv(book){
 const head=['Company','Role','Status','Date','Location','Link','Notes'];
 return [head,...book.applications.map(a=>[a.company,a.role,a.status,a.date,a.location,a.url,a.notes])].map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function normalise(a){
 const o={id:a.id,status:a.status,company:a.company??'',role:a.role??'',location:a.location??'',url:a.url??'',notes:a.notes??'',jobText:a.jobText??'',date:a.date||'',
  contacts:Array.isArray(a.contacts)?a.contacts:[],tasks:Array.isArray(a.tasks)?a.tasks:[],history:Array.isArray(a.history)?a.history:[],
  createdAt:a.createdAt||'',updatedAt:a.updatedAt||''};
 for(const k of ['cvVariantId','cvRevision','coverLetterId','coverLetterRevision','jobTargetId'])if(a[k]!==undefined)o[k]=a[k];
 return o;
}
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const field=(o,k,max)=>o[k]===undefined||(typeof o[k]==='string'&&o[k].length<=max);
const dateOK=v=>!v||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
const statusOK=v=>LEDGER_APPLICATION_STATUSES.includes(v);
function validImported(a){
 if(!record(a)||!isSafeId(a.id)||!statusOK(a.status))return false;
 for(const [k,max] of [['company',200],['role',200],['location',200],['url',1000],['notes',3000],
  ['jobText',60000],['createdAt',64],['updatedAt',64]])if(!field(a,k,max))return false;
 if(!dateOK(a.date)||!Array.isArray(a.contacts)||a.contacts.length>10||
    !Array.isArray(a.tasks)||a.tasks.length>40||!Array.isArray(a.history)||a.history.length>2000)return false;
 if(!a.contacts.every(c=>record(c)&&[['name',200],['email',200],['phone',60],['role',120]].every(([k,max])=>field(c,k,max))))return false;
 if(!a.tasks.every(t=>record(t)&&isSafeId(t.id)&&typeof t.title==='string'&&t.title.length>0&&t.title.length<=200&&
   field(t,'due',10)&&dateOK(t.due)&&typeof t.done==='boolean'))return false;
 if(!a.history.every(h=>record(h)&&field(h,'at',64)&&statusOK(h.to)&&
   (h.from===null||statusOK(h.from))))return false;
 if(a.jobTargetId!==undefined&&!isSafeId(a.jobTargetId))return false;
 for(const [id,rev] of [['cvVariantId','cvRevision'],['coverLetterId','coverLetterRevision']]){
  if(a[id]!==undefined&&(!isSafeId(a[id])||!Number.isSafeInteger(a[rev])||a[rev]<0))return false;
  if(a[rev]!==undefined&&a[id]===undefined)return false;
 }
 return true;
}
/** Returns an ImportReview-style object: nothing changes until approveBookImport is called with confirmed:true. */
export function reviewBookImport(text,currentBook){
 if(typeof text!=='string'||text.length>8000000)return {status:'blocked',warnings:['The backup is missing or too large to review.'],requiresUserConfirmation:true,incoming:[],conflicts:[]};
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
  if(a.url!==undefined&&typeof a.url!=='string'){warnings.push('An entry with invalid field types was skipped.');continue;}
  if(n.url&&!/^https?:\/\//i.test(n.url)){n.url='';warnings.push('A non-web link was removed from "'+n.company+'".');}
  if(!validImported(n)){warnings.push('An entry with invalid status, fields, tasks, contacts or document links was skipped.');continue;}
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
 if(book.revision!==expectedRevision)throw contractError('CONFLICT','Applications changed elsewhere.');
 if(!['keep-existing','replace'].includes(conflictPolicy))throw contractError('INVALID','Unknown import conflict policy');
 if(!Array.isArray(review.incoming)||review.incoming.some(a=>!validImported(a)))throw contractError('INVALID','Import review contains invalid applications');
 const b={...book,applications:cloneData(book.applications),revision:book.revision+1};
 for(const a of review.incoming){
  const i=b.applications.findIndex(x=>x.id===a.id);
  if(i<0)b.applications.push(cloneData(a));else if(conflictPolicy==='replace')b.applications[i]=cloneData(a);
 }
 return b;
}
export {emptyBook};
