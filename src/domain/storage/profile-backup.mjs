/**
 * Stage A2 explicit, checksum-verified profile backup. No automatic imports,
 * cloud uploads, storage mutation or exposure of plaintext data to diagnostics.
 */
import {cloneData,contractError} from '../../contracts/platform.mjs';
import {validateCareerProfile} from '../profile/career-profile.mjs';
const FORMAT='ledger-career-profile-backup',MAX_BYTES=8*1024*1024;
const encoder=new TextEncoder();
async function digest(value){
 const subtle=globalThis.crypto?.subtle;
 if(!subtle)throw contractError('UNAVAILABLE','Secure checksum API unavailable on this origin');
 const bytes=await subtle.digest('SHA-256',encoder.encode(value));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createCareerProfileBackup(profile,{now=new Date().toISOString()}={}){
 validateCareerProfile(profile);
 if(!Number.isFinite(Date.parse(now)))throw contractError('INVALID','Invalid backup timestamp');
 const payload=JSON.stringify(cloneData(profile));
 if(encoder.encode(payload).length>MAX_BYTES)throw contractError('INVALID','Profile exceeds safe backup size');
 const checksum=await digest(payload);
 return JSON.stringify({format:FORMAT,schemaVersion:1,createdAt:now,
  checksumAlgorithm:'SHA-256',checksum,payload});
}
export async function previewCareerProfileBackup(raw){
 if(typeof raw!=='string'||encoder.encode(raw).length>MAX_BYTES+4096)
  return {status:'blocked',warnings:['Backup exceeds size limit'],proposed:null,requiresUserConfirmation:true};
 try{
  const source=JSON.parse(raw);
  if(!source||source.format!==FORMAT||source.schemaVersion!==1||source.checksumAlgorithm!=='SHA-256'||
   !/^[a-f0-9]{64}$/.test(source.checksum)||typeof source.payload!=='string'||
   !Number.isFinite(Date.parse(source.createdAt)))
   throw contractError('INVALID','Unknown backup format');
  if((await digest(source.payload))!==source.checksum)throw contractError('CORRUPT','Backup checksum mismatch');
  const proposed=JSON.parse(source.payload);
  validateCareerProfile(proposed);
  return {status:'review-required',warnings:['Review profile and existing saved data before importing'],proposed,
   requiresUserConfirmation:true};
 }catch{
  return {status:'blocked',warnings:['Backup is invalid, corrupted or incompatible'],proposed:null,requiresUserConfirmation:true};
 }
}
/** Returns a detached proposal for explicit UI approval; never writes storage. */
export function approveCareerProfileBackup(preview,{confirmed=false}={}){
 if(confirmed!==true||preview?.status!=='review-required'||!preview.proposed)
  throw contractError('UNCONFIRMED','Backup restore requires explicit review and approval');
 validateCareerProfile(preview.proposed);
 return cloneData(preview.proposed);
}

/**
 * Explicitly approved backup import into an EMPTY repository record.
 * Aggregate revision numbers are local CAS counters: a new origin starts at
 * 0 while CV document revision/history and all applicant facts stay intact.
 * Caller MUST separately check that the identity does not already exist.
 */
export function prepareCareerProfileImportAsNewRecord(approved){
 validateCareerProfile(approved);
 const copy=cloneData(approved);
 copy.revision=0;
 validateCareerProfile(copy);
 return copy;
}
