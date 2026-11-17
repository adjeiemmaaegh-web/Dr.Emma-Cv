/**
 * Group A: independent, revisioned application-book repository.
 * A distinct IndexedDB avoids upgrading the established profile database and
 * never writes the historical localStorage application key.
 * Book/profile writes are separate transactions; backup UX must disclose this.
 */
import {cloneData,contractError} from '../../contracts/platform.mjs';
import {emptyBook} from '../../features/tracker/tracker.mjs';
import {exportBook,reviewBookImport} from '../../features/tracker/io.mjs';
export const APPLICATION_DB='ledger_cv_workspace_applications_v1';
const OBJECT='application_books',KEY='default';
const fail=(code,message)=>contractError(code,message);
function validate(book){
 if(!book||book.schema!=='ledger-applications-v1'||!Number.isSafeInteger(book.revision)||book.revision<0||
  !Array.isArray(book.applications)||book.applications.length>300)
  throw fail('INVALID','Invalid application book');
 if(book.applications.length){
  const r=reviewBookImport(exportBook(book),emptyBook());
  if(r.status!=='review-required'||r.warnings.length||r.incoming.length!==book.applications.length)
   throw fail('INVALID','Application book contains invalid records');
 }
 return cloneData(book);
}
function checked(row){
 if(!row)return null;
 try{if(row.id!==KEY||row.revision!==row.book?.revision)throw Error('Revision mismatch');
  return validate(row.book);
 }catch{throw fail('CORRUPT','Saved application book is unreadable; no write attempted')}
}
const typed=e=>e?.code?e:fail(e?.name==='QuotaExceededError'?'QUOTA':'UNAVAILABLE','Application storage unavailable');
export function createMemoryApplicationStore(){
 let row=null;
 return Object.freeze({
  async load(){return row?checked(row):null},
  async save(book,expectedRevision){
   const value=validate(book),current=checked(row);
   if(expectedRevision===null?current!==null:current===null||current.revision!==expectedRevision)
    throw fail('CONFLICT','Applications changed in another tab');
   if(value.revision!==(expectedRevision===null?0:expectedRevision+1))
    throw fail('CONFLICT','Application revision mismatch');
   row={id:KEY,revision:value.revision,book:cloneData(value)};
   return cloneData(value);
  },
  close(){}
 });
}
export function createIndexedDBApplicationStore({indexedDBFactory=globalThis.indexedDB,databaseName=APPLICATION_DB}={}){
 if(!indexedDBFactory?.open)throw fail('UNAVAILABLE','IndexedDB is unavailable');
 if(typeof databaseName!=='string'||!/^ledger_cv_[a-z0-9_]{2,80}$/.test(databaseName))
  throw fail('INVALID','Unsafe database name');
 let opening;
 function db(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   let request,settled=false;
   try{request=indexedDBFactory.open(databaseName,1)}catch(e){reject(typed(e));return}
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(OBJECT))
    request.result.createObjectStore(OBJECT,{keyPath:'id'})};
   request.onsuccess=()=>{if(settled){request.result.close();return}
    settled=true;const database=request.result;database.onversionchange=()=>{database.close();opening=null};resolve(database)};
   request.onerror=()=>{if(!settled){settled=true;reject(typed(request.error))}};
   request.onblocked=()=>{if(!settled){settled=true;reject(fail('UNAVAILABLE','Application DB upgrade blocked'))}};
  }).catch(e=>{opening=null;throw e});
  return opening;
 }
 async function load(){
  const database=await db();
  return new Promise((resolve,reject)=>{
   let tx,request,done=false,row=null;
   try{tx=database.transaction(OBJECT,'readonly');request=tx.objectStore(OBJECT).get(KEY)}
   catch(e){reject(typed(e));try{tx?.abort()}catch{}return}
   request.onsuccess=()=>{row=request.result||null};
   tx.oncomplete=()=>{done=true;try{resolve(checked(row))}catch(e){reject(e)}};
   tx.onabort=tx.onerror=()=>{if(!done){done=true;reject(typed(tx.error))}};
  });
 }
 async function save(book,expectedRevision){
  const value=validate(book);
  if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0))
   throw fail('INVALID','Invalid expected revision');
  if(value.revision!==(expectedRevision===null?0:expectedRevision+1))
   throw fail('CONFLICT','Application revision mismatch');
  const database=await db();
  return new Promise((resolve,reject)=>{
   let tx,req,settled=false,accepted=false;
   try{tx=database.transaction(OBJECT,'readwrite');req=tx.objectStore(OBJECT).get(KEY)}
   catch(e){reject(typed(e));try{tx?.abort()}catch{}return}
   req.onsuccess=()=>{
    try{
     const current=checked(req.result||null);
     if(expectedRevision===null?current!==null:current===null||current.revision!==expectedRevision)
      throw fail('CONFLICT','Applications changed in another tab');
     tx.objectStore(OBJECT).put({id:KEY,revision:value.revision,book:cloneData(value)});
     accepted=true;
    }catch(e){if(!settled){settled=true;reject(typed(e))}
     try{tx.abort()}catch{}}
   };
   tx.oncomplete=()=>{if(settled)return;settled=true;
    accepted?resolve(cloneData(value)):reject(fail('UNAVAILABLE','Application write not committed'))};
   tx.onabort=tx.onerror=()=>{if(!settled){settled=true;reject(typed(tx.error))}};
  });
 }
 return Object.freeze({load,save,close(){if(opening)void opening.then(db=>db.close()).catch(()=>{});opening=null}});
}
