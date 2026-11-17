/**
 * Group A-owned local persistence for career journey drafts.
 * Job targets, letters and interview sessions are tied to one profile. One
 * IndexedDB readwrite transaction provides per-profile compare-and-swap.
 * No old CV keys or remote services are touched.
 */
import {cloneData,contractError,isSafeId,isPlainObject} from '../../contracts/platform.mjs';
export const CAREER_JOURNEY_DATABASE='ledger_cv_career_journey_v1';
const OBJECT='journeys';
const fail=(code,message)=>contractError(code,message);
export const emptyCareerJourney=profileId=>({profileId,job:null,letter:null,session:null});
function validate(value,id){
 if(!isPlainObject(value)||!isSafeId(id)||value.profileId!==id)throw fail('INVALID','Wrong career journey identity');
 const {job,letter,session}=value;
 if(job!==null){
  if(!isPlainObject(job)||!isSafeId(job.id)||typeof job.role!=='string'||job.role.length>240||
   typeof job.originalText!=='string'||job.originalText.length>60000||
   !Array.isArray(job.requirements)||job.requirements.length>200)throw fail('INVALID','Invalid job target');
  for(const r of job.requirements)if(!isPlainObject(r)||typeof r.text!=='string'||r.text.length>3000||
   !['required','preferred','unknown'].includes(r.priority))throw fail('INVALID','Invalid job requirement');
 }
 if(letter!==null){
  if(!isPlainObject(letter)||!isSafeId(letter.id)||!Number.isSafeInteger(letter.revision)||letter.revision<0||
   typeof letter.content!=='string'||letter.content.length>70000||!isPlainObject(letter.structure)||
   !Array.isArray(letter.structure.body)||letter.structure.body.length>12)throw fail('INVALID','Invalid cover letter');
 }
 if(session!==null){
  if(!isPlainObject(session)||!isSafeId(session.id)||!Number.isSafeInteger(session.revision)||session.revision<0||
   !Array.isArray(session.stories)||session.stories.length>30||
   !Array.isArray(session.practice)||session.practice.length>500)throw fail('INVALID','Invalid interview session');
 }
 const result=cloneData(value);
 if(JSON.stringify(result).length>350000)throw fail('INVALID','Career journey is too large');
 return result;
}
function checked(row,id){
 if(!row)return null;
 try{
  if(row.id!==id||!Number.isSafeInteger(row.revision)||row.revision<0)throw Error('Wrong revision');
  return {revision:row.revision,value:validate(row.value,id)};
 }catch{throw fail('CORRUPT','Saved career journey cannot be read safely');}
}
function checkWrite(id,value,expected){
 const v=validate(value,id);
 if(expected!==null&&(!Number.isSafeInteger(expected)||expected<0))throw fail('INVALID','Invalid expected revision');
 return v;
}
function conflict(old,expected){
 if(expected===null?old!==null:!old||old.revision!==expected)
  throw fail('CONFLICT','Career drafts changed in another tab. Reopen the page and review before saving.');
}
const typed=e=>e?.code?e:fail(e?.name==='QuotaExceededError'?'QUOTA':'UNAVAILABLE','Career journey storage is unavailable');
export function createMemoryCareerJourneyStore(){
 const rows=new Map();
 return Object.freeze({
  async load(id){if(!isSafeId(id))throw fail('INVALID','Invalid profile id');return checked(rows.get(id)||null,id)},
  async save(id,value,expectedRevision){
   const v=checkWrite(id,value,expectedRevision),prior=checked(rows.get(id)||null,id);
   conflict(prior,expectedRevision);
   const row={id,revision:expectedRevision===null?0:expectedRevision+1,value:v};rows.set(id,row);
   return checked(row,id);
  },
  close(){}
 });
}
export function createIndexedDBCareerJourneyStore({indexedDBFactory=globalThis.indexedDB,databaseName=CAREER_JOURNEY_DATABASE}={}){
 if(!indexedDBFactory?.open)throw fail('UNAVAILABLE','IndexedDB is unavailable for career drafts');
 if(typeof databaseName!=='string'||!/^ledger_cv_[a-z0-9_]{2,80}$/.test(databaseName))
  throw fail('INVALID','Unsafe database name');
 let opening=null;
 function db(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   let req,done=false;
   try{req=indexedDBFactory.open(databaseName,1)}catch(e){reject(typed(e));return}
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(OBJECT))req.result.createObjectStore(OBJECT,{keyPath:'id'});};
   req.onsuccess=()=>{if(done){req.result.close();return}done=true;const value=req.result;
    value.onversionchange=()=>{value.close();opening=null};resolve(value);};
   req.onerror=()=>{if(!done){done=true;reject(typed(req.error))}};
   req.onblocked=()=>{if(!done){done=true;reject(fail('UNAVAILABLE','Career database upgrade blocked by another tab'))}};
  }).catch(e=>{opening=null;throw e});
  return opening;
 }
 async function load(id){
  if(!isSafeId(id))throw fail('INVALID','Invalid profile identity');
  const database=await db();return new Promise((resolve,reject)=>{
   let tx,req,done=false,row=null;
   try{tx=database.transaction(OBJECT,'readonly');req=tx.objectStore(OBJECT).get(id)}
   catch(e){reject(typed(e));try{tx?.abort()}catch{}return}
   req.onsuccess=()=>{row=req.result||null};
   tx.oncomplete=()=>{if(done)return;done=true;try{resolve(checked(row,id))}catch(e){reject(e)}};
   tx.onerror=tx.onabort=()=>{if(!done){done=true;reject(typed(tx.error))}};
  });
 }
 async function save(id,value,expectedRevision){
  const v=checkWrite(id,value,expectedRevision),database=await db();
  return new Promise((resolve,reject)=>{
   let tx,req,done=false,accepted=false,revision=expectedRevision===null?0:expectedRevision+1;
   try{tx=database.transaction(OBJECT,'readwrite');req=tx.objectStore(OBJECT).get(id)}
   catch(e){reject(typed(e));try{tx?.abort()}catch{}return}
   req.onsuccess=()=>{
    try{
     const prior=checked(req.result||null,id);conflict(prior,expectedRevision);
     tx.objectStore(OBJECT).put({id,revision,value:v});accepted=true;
    }catch(e){if(!done){done=true;reject(typed(e))}try{tx.abort()}catch{}}
   };
   tx.oncomplete=()=>{if(done)return;done=true;
    accepted?resolve({revision,value:cloneData(v)}):reject(fail('UNAVAILABLE','Career journey write was not committed'))};
   tx.onerror=tx.onabort=()=>{if(!done){done=true;reject(typed(tx.error))}};
  });
 }
 return Object.freeze({load,save,close(){if(opening)void opening.then(x=>x.close()).catch(()=>{});opening=null}});
}
