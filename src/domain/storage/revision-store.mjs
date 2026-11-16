/**
 * Stage A2: separate profile-only repository. Never touches legacy CV keys.
 * IndexedDB read+compare+write share ONE readwrite transaction, so concurrent
 * tabs cannot both commit the same expected revision.
 */
import {cloneData,contractError,isSafeId,LEDGER_STORAGE_DATABASE} from '../../contracts/platform.mjs';
import {validateCareerProfile} from '../profile/career-profile.mjs';
const STORE='career_profiles';
function verifySave(id,value,expected){
 if(!isSafeId(id)||!value||value.id!==id)throw contractError('INVALID','Record identity mismatch');
 validateCareerProfile(value);
 if(expected!==null&&(!Number.isSafeInteger(expected)||expected<0))throw contractError('INVALID','Expected revision invalid');
 if(value.revision!==(expected===null?0:expected+1))throw contractError('CONFLICT','Profile mutation revision does not match saved revision');
}
function verifyExisting(existing,expected,id){
 // A corrupt stored row cannot be overwritten using a nominal expected revision.
 if(existing!==null)copyRecord(existing,id);
 if(expected===null){
  if(existing!==null)throw contractError('CONFLICT','Record already exists');
 }else if(existing===null||existing.revision!==expected){
  throw contractError('CONFLICT','Record changed or was removed');
 }
}
function copyRecord(row,id){
 if(!row)return null;
 try{
  if(row.id!==id||!Number.isSafeInteger(row.revision)||row.revision<0||
     row.value?.id!==id||row.value?.revision!==row.revision)
   throw Error('Row and payload revision disagree');
  validateCareerProfile(row.value);
  return {revision:row.revision,value:cloneData(row.value)};
 }catch{
  throw contractError('CORRUPT','Saved career profile is unreadable; no changes were made');
 }
}
export function createMemoryRevisionStore({beforeCommit}={}){
 const records=new Map();
 return Object.freeze({
  async load(id){if(!isSafeId(id))throw contractError('INVALID','Invalid record identifier');return copyRecord(records.get(id)||null,id);},
  async save(id,value,expectedRevision){
   verifySave(id,value,expectedRevision);
   const current=records.get(id)||null;verifyExisting(current,expectedRevision,id);
   if(beforeCommit)await beforeCommit({id,expectedRevision});
   // Check again after await: this is an in-memory test adapter, not multi-process storage.
   verifyExisting(records.get(id)||null,expectedRevision,id);
   const next={revision:value.revision,value:cloneData(value)};
   records.set(id,next);return copyRecord(next,id);
  },
  async listIds(){return [...records.keys()].sort()}
 });
}
function asStorageError(error){
 if(error?.code&&typeof error.code==='string')return error;
 const code=error?.name==='QuotaExceededError'?'QUOTA':'UNAVAILABLE';
 return contractError(code,'Profile storage could not complete safely');
}
export function createIndexedDBRevisionStore({indexedDBFactory=globalThis.indexedDB,databaseName=LEDGER_STORAGE_DATABASE}={}){
 if(!indexedDBFactory||typeof indexedDBFactory.open!=='function')
  throw contractError('UNAVAILABLE','IndexedDB is unavailable');
 if(typeof databaseName!=='string'||!/^ledger_cv_[a-z0-9_]{2,80}$/.test(databaseName))
  throw contractError('INVALID','Invalid database name');
 let opening;
 function db(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   let done=false;
   const request=indexedDBFactory.open(databaseName,1);
   request.onupgradeneeded=()=>{
    const database=request.result;
    if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:'id'});
   };
   request.onsuccess=()=>{
    const database=request.result;
    database.onversionchange=()=>{database.close();opening=null};
    if(done)database.close();else{done=true;resolve(database)}
   };
   request.onerror=()=>{if(!done){done=true;reject(asStorageError(request.error))}};
   request.onblocked=()=>{if(!done){done=true;reject(contractError('UNAVAILABLE','Profile database upgrade blocked by another tab'))}};
  }).catch(error=>{opening=null;throw error});
  return opening;
 }
 async function load(id){
  if(!isSafeId(id))throw contractError('INVALID','Invalid record identifier');
  const database=await db();
  return new Promise((resolve,reject)=>{
   let done=false,found=null;
   const tx=database.transaction(STORE,'readonly');
   tx.objectStore(STORE).get(id).onsuccess=event=>{found=event.target.result||null};
   tx.oncomplete=()=>{done=true;try{resolve(copyRecord(found,id))}catch(e){reject(e)}};
   tx.onerror=tx.onabort=()=>{if(!done){done=true;reject(asStorageError(tx.error))}};
  });
 }
 async function save(id,value,expectedRevision){
  verifySave(id,value,expectedRevision);
  const database=await db();
  const immutable=cloneData(value);
  return new Promise((resolve,reject)=>{
   let settled=false,accepted=false;
   const tx=database.transaction(STORE,'readwrite');
   const store=tx.objectStore(STORE);
   const get=store.get(id);
   get.onsuccess=()=>{
    try{
     const existing=get.result||null;
     verifyExisting(existing,expectedRevision,id);
     store.put({id,revision:immutable.revision,value:immutable});
     accepted=true;
    }catch(error){
     if(!settled){settled=true;reject(error)}
     try{tx.abort()}catch{}
    }
   };
   tx.oncomplete=()=>{
    if(settled)return;
    settled=true;
    if(!accepted){reject(contractError('UNAVAILABLE','Transaction completed without a write'));return}
    resolve({revision:immutable.revision,value:cloneData(immutable)});
   };
   tx.onabort=tx.onerror=()=>{
    if(settled)return;
    settled=true;reject(asStorageError(tx.error));
   };
  });
 }
 async function listIds(){
  const database=await db();
  return new Promise((resolve,reject)=>{
   let done=false,keys=[];
   const tx=database.transaction(STORE,'readonly');
   const request=tx.objectStore(STORE).getAllKeys();
   request.onsuccess=()=>{keys=request.result};
   tx.oncomplete=()=>{
    if(done)return;done=true;
    if(!Array.isArray(keys)||keys.some(id=>!isSafeId(id)))
     reject(contractError('CORRUPT','Profile index contains an invalid identifier'));
    else resolve(keys.sort());
   };
   tx.onerror=tx.onabort=()=>{
    if(!done){done=true;reject(asStorageError(tx.error))}
   };
  });
 }
 function close(){
  if(opening)void opening.then(database=>database.close()).catch(()=>{});
  opening=null;
 }
 return Object.freeze({load,save,listIds,close});
}
