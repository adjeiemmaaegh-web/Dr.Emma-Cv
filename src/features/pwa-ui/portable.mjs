/**
 * Group E Stage 18: portable review package and local feedback bundle.
 * A package is one JSON file the user downloads and later imports. It is verified (per-section SHA-256) and import is review-first.
 * Nothing here writes storage, sends data, or includes credentials.
 */
import {contractError,cloneData} from '../../contracts/platform.mjs';
import {validateCareerProfile} from '../../domain/profile/career-profile.mjs';
import {reviewBookImport} from '../tracker/io.mjs';
const KIND='ledger-portable-package',MAX_BYTES=16*1024*1024,SECTIONS=['profile','applications','letters','interview','settings'];
const enc=new TextEncoder();
async function sha256(text){
 const subtle=globalThis.crypto?.subtle;if(!subtle)throw contractError('UNAVAILABLE','Secure checksum API unavailable on this origin');
 return [...new Uint8Array(await subtle.digest('SHA-256',enc.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const SECRET_KEY=/(api[-_ ]?key|secret|token|password|passwd|authorization|bearer)/i;
/** Paths of any key that looks like a credential. Packages containing one are refused, not silently scrubbed. */
export function findSecretPaths(value,path='$',out=[]){
 if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){const p=path+'.'+k;if(SECRET_KEY.test(k)&&v)out.push(p);findSecretPaths(v,p,out);}
 return out;
}
export async function createPortablePackage(sections,{now=new Date().toISOString(),appVersion='unknown'}={}){
 if(!sections||typeof sections!=='object')throw contractError('INVALID','Sections required');
 const names=Object.keys(sections).filter(k=>sections[k]!==undefined);
 if(!names.length)throw contractError('INVALID','Nothing to export');
 for(const n of names)if(!SECTIONS.includes(n))throw contractError('INVALID','Unknown section '+n);
 const secrets=findSecretPaths(sections);
 if(secrets.length)throw contractError('INVALID','Refusing to export credentials: '+secrets.slice(0,3).join(', '));
 if(sections.profile)validateCareerProfile(sections.profile);
 const payload={},manifest={};
 for(const n of names){const text=JSON.stringify(cloneData(sections[n]));payload[n]=text;manifest[n]={sha256:await sha256(text),bytes:enc.encode(text).length};}
 const out=JSON.stringify({kind:KIND,version:1,createdAt:now,appVersion,manifest,payload});
 if(enc.encode(out).length>MAX_BYTES)throw contractError('INVALID','Package is larger than 16 MB');
 return out;
}
const blocked=(w)=>({status:'blocked',warnings:[w],requiresUserConfirmation:true,summary:{},proposed:null,conflicts:[]});
export async function reviewPortablePackage(text,{current={}}={}){
 if(typeof text!=='string'||enc.encode(text).length>MAX_BYTES+8192)return blocked('The file is too large to be a package.');
 let d;try{d=JSON.parse(text);}catch{return blocked('The file is not a valid package.');}
 if(d?.kind!==KIND||d.version!==1||!d.manifest||!d.payload||!Number.isFinite(Date.parse(d.createdAt)))return blocked('Unrecognised package type or version.');
 const warnings=[],proposed={},summary={},conflicts=[];
 for(const [n,text2] of Object.entries(d.payload)){
  if(!SECTIONS.includes(n)||typeof text2!=='string'){warnings.push('Skipped unknown section "'+n+'".');continue;}
  const m=d.manifest[n];
  if(!m||(await sha256(text2))!==m.sha256)return blocked('Section "'+n+'" failed its integrity check. The file is damaged or has been edited.');
  let v;try{v=JSON.parse(text2);}catch{return blocked('Section "'+n+'" is not readable.');}
  if(findSecretPaths(v).length)return blocked('Section "'+n+'" contains credentials and will not be imported.');
  try{
   if(n==='profile'){validateCareerProfile(v);summary.profile={name:v.name,variants:v.variants.length,evidence:v.evidence.length};
    if(current.profile&&current.profile.id===v.id)conflicts.push({section:'profile',message:'A profile with the same id exists here (revision '+current.profile.revision+' vs '+v.revision+').'});
    else if(current.profile)conflicts.push({section:'profile',message:'You already have a different profile; importing would replace it.'});}
   else if(n==='applications'){const rv=reviewBookImport(JSON.stringify({kind:'ledger-applications',version:1,book:v}),current.applications||{schema:'ledger-applications-v1',revision:0,applications:[]});
    if(rv.status==='blocked')throw new Error(rv.warnings[0]);summary.applications={count:rv.incoming.length,conflicts:rv.conflicts.length};warnings.push(...rv.warnings);
    if(rv.conflicts.length)conflicts.push({section:'applications',message:rv.conflicts.length+' application(s) already exist here.'});}
   else if(n==='letters'){if(!Array.isArray(v)||v.length>200||!v.every(l=>l&&typeof l.id==='string'&&Number.isSafeInteger(l.revision)&&l.structure&&typeof l.content==='string'))throw new Error('Invalid letters');summary.letters={count:v.length};}
   else if(n==='interview'){if(!v||!Array.isArray(v.stories)||!Array.isArray(v.practice)||typeof v.id!=='string')throw new Error('Invalid interview data');summary.interview={stories:v.stories.length,practice:v.practice.length};}
   else{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid settings');summary.settings={keys:Object.keys(v).length};}
  }catch(e){return blocked('Section "'+n+'" is invalid: '+e.message);}
  proposed[n]=v;
 }
 if(!Object.keys(proposed).length)return blocked('The package has no usable sections.');
 return {status:'review-required',warnings,summary,conflicts,proposed,createdAt:d.createdAt,appVersion:d.appVersion,requiresUserConfirmation:true};
}
/** Returns detached data for the host to write through its storage ports. Conflicting sections need an explicit decision. */
export function approvePortablePackage(review,{confirmed=false,sections,replaceConflicts=false}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Explicit confirmation required');
 if(review?.status!=='review-required')throw contractError('INVALID','Nothing to import');
 const pick=(sections||Object.keys(review.proposed)).filter(n=>n in review.proposed);
 if(!pick.length)throw contractError('INVALID','No sections selected');
 for(const c of review.conflicts)if(pick.includes(c.section)&&!replaceConflicts)throw contractError('UNCONFIRMED','"'+c.section+'" conflicts with existing data; choose to replace it or leave it out');
 return Object.fromEntries(pick.map(n=>[n,cloneData(review.proposed[n])]));
}
/* ---------- local feedback bundle: nothing is sent; the user reads, copies or downloads it ---------- */
const ALLOWED=['appVersion','browser','os','viewport','origin','installMode','serviceWorker','storageLevel','locale'];
const PII=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/;
export function createFeedbackBundle({message,includeDiagnostics=false,diagnostics={},now=new Date().toISOString()}={}){
 if(typeof message!=='string'||!message.trim())throw contractError('INVALID','Please describe the problem or idea.');
 if(message.length>4000)throw contractError('INVALID','Feedback is too long (4000 characters maximum).');
 const lines=['Ledger CV Studio feedback','Created: '+now,'','Message:',message.trim()];
 const used=[];
 if(includeDiagnostics){lines.push('','Diagnostics (no CV content):');for(const k of ALLOWED)if(diagnostics[k]!==undefined&&typeof diagnostics[k]!=='object'){lines.push(k+': '+String(diagnostics[k]).slice(0,200));used.push(k);}}
 return {text:lines.join('\n'),filename:'ledger-feedback-'+now.slice(0,10)+'.txt',includedDiagnostics:used,
  warnings:PII.test(message)?['Your message seems to contain an email address or phone number. Remove personal details before sharing it.']:[],
  notice:'This has not been sent anywhere. Read it, then copy or download it and share it yourself if you want to.'};
}
