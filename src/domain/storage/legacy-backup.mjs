/**
 * Legacy data portability without opening or altering any browser storage.
 * This is an exact raw-string snapshot of the four known user-data keys.
 * The returned approval is a manual recovery plan, NOT a storage writer:
 * localStorage has no atomic multi-key transaction or compare-and-swap.
 */
import {LEGACY_KEYS} from './legacy-inspection.mjs';
import {contractError} from '../../contracts/platform.mjs';
const FORMAT='ledger-legacy-raw-backup';
const KEYS=Object.freeze([LEGACY_KEYS.cv,LEGACY_KEYS.recovery,LEGACY_KEYS.applications,LEGACY_KEYS.damaged]);
const MAX_ENTRY=8*1024*1024,MAX_TOTAL=32*1024*1024;
const bytes=value=>new TextEncoder().encode(value).byteLength;
async function checksum(text){
 if(!globalThis.crypto?.subtle)throw contractError('UNAVAILABLE','Secure checksum unavailable');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function validateEntries(entries){
 if(!entries||typeof entries!=='object'||Array.isArray(entries)||
    Object.keys(entries).sort().join('|')!==[...KEYS].sort().join('|'))
  throw contractError('INVALID','Legacy snapshot key set is incorrect');
 let total=0;
 for(const key of KEYS){
  const raw=entries[key];
  if(raw!==null&&typeof raw!=='string')
   throw contractError('INVALID','Legacy snapshot entry type is invalid');
  if(raw!==null){
   const size=bytes(raw);
   if(size>MAX_ENTRY)throw contractError('INVALID','One legacy entry exceeds the size limit');
   total+=size;
  }
 }
 if(total>MAX_TOTAL)throw contractError('INVALID','Legacy snapshot exceeds the total size limit');
 return true;
}
export async function createLegacyRawBackup(read,{now=new Date().toISOString()}={}){
 if(typeof read!=='function')throw contractError('INVALID','Legacy reader is required');
 if(typeof now!=='string'||!Number.isFinite(Date.parse(now)))
  throw contractError('INVALID','Invalid backup timestamp');
 const entries=Object.create(null);
 for(const key of KEYS){
  // Include absent keys explicitly; do not parse or normalize damaged JSON.
  try{entries[key]=read(key)}
  catch{throw contractError('UNAVAILABLE','Legacy storage access denied; no partial backup created')}
 }
 validateEntries(entries);
 // A second read catches some cross-tab changes during the snapshot window.
 // This is best-effort detection only; localStorage offers no atomic multi-key read.
 for(const key of KEYS){
  let latest;
  try{latest=read(key)}
  catch{throw contractError('UNAVAILABLE','Legacy storage became unavailable while backing up')}
  if(latest!==entries[key])
   throw contractError('CONFLICT','Legacy data changed during backup; no mixed snapshot was exported');
 }
 const payload=JSON.stringify({schemaVersion:1,entries});
 if(bytes(payload)>MAX_TOTAL+4096)throw contractError('INVALID','Snapshot payload exceeds limit');
 return JSON.stringify({format:FORMAT,schemaVersion:1,createdAt:now,
  checksumAlgorithm:'SHA-256',checksum:await checksum(payload),payload});
}
export async function previewLegacyRawBackup(raw){
 const blocked=warning=>({status:'blocked',warnings:[warning],proposed:null,requiresUserConfirmation:true});
 if(typeof raw!=='string'||bytes(raw)>MAX_TOTAL+8192)
  return blocked('Legacy backup is too large or not text');
 try{
  const wrapper=JSON.parse(raw);
  if(!wrapper||wrapper.format!==FORMAT||wrapper.schemaVersion!==1||
     wrapper.checksumAlgorithm!=='SHA-256'||!/^[0-9a-f]{64}$/.test(wrapper.checksum)||
     typeof wrapper.payload!=='string'||!Number.isFinite(Date.parse(wrapper.createdAt)))
   return blocked('Unknown legacy backup format');
  if(await checksum(wrapper.payload)!==wrapper.checksum)
   return blocked('Legacy backup integrity check failed');
  const source=JSON.parse(wrapper.payload);
  if(source.schemaVersion!==1)throw Error('Unrecognized schema');
  validateEntries(source.entries);
  const present=KEYS.filter(key=>source.entries[key]!==null).length;
  return {status:'review-required',
   warnings:['Contains unencrypted private CV/application data: store offline, do not upload to public repositories',
    'Raw fields, including damaged JSON, are preserved exactly; manual review is required before restoring',
    'Restore on a separate clean origin before considering changes to existing browser data'],
   proposed:{format:FORMAT,schemaVersion:1,entries:{...source.entries},
    presentKeys:present},requiresUserConfirmation:true};
 }catch{return blocked('Legacy backup is invalid, damaged or incompatible')}
}
/** Pure approval output; caller receives exact strings and no storage mutations. */
export function approveLegacyRawBackup(preview,{confirmed=false}={}){
 if(confirmed!==true||preview?.status!=='review-required'||!preview.proposed)
  throw contractError('UNCONFIRMED','Legacy restore plan requires explicit review and approval');
 const entries=preview.proposed.entries;
 validateEntries(entries);
 return Object.freeze({format:FORMAT,schemaVersion:1,
  entries:Object.freeze(Object.fromEntries(KEYS.map(key=>[key,entries[key]]))),
  manualRestoreOnly:true});
}
