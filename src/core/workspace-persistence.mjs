/**
 * A-owned persisted workspace adapter. All CV writes use Group A profile CAS,
 * application writes use a separate IndexedDB CAS store. Legacy localStorage
 * CV/application keys are never accessed or mutated by ordinary editing.
 *
 * Deliberately separate from the Group E preview adapter. User data is never
 * silently copied between origins, records or preview keys.
 */
import {createEditor} from '../features/editor/editor-state.mjs';
import {createIndexedDBRevisionStore} from '../domain/storage/revision-store.mjs';
import {createIndexedDBApplicationStore} from '../domain/storage/application-revision-store.mjs';
import {createCareerProfile,createCVVariant,updateCVVariant,replaceMasterDocument,restoreCVRevision,validateCareerProfile} from '../domain/profile/career-profile.mjs';
import {emptyBook} from '../features/tracker/tracker.mjs';
import {cloneData,contractError} from '../contracts/platform.mjs';
const ACTIVE='ledger_workspace_active_profile_v1',ACTIVE_CV='ledger_workspace_active_cv_v1',THEME='ledger_workspace_theme_v1';
const err=(code,message)=>contractError(code,message);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const cvOf=(p,id)=>[p.master,...p.variants].find(v=>v.id===id)||p.master;
const dataOf=v=>({document:v.document,appearance:v.appearance});
export async function createPersistentWorkspaceStore({
 profileRepository=createIndexedDBRevisionStore(),applicationRepository=createIndexedDBApplicationStore(),
 storage=globalThis.localStorage,saveDelay=280
}={}){
 const localGet=k=>{try{return storage?.getItem(k)}catch{return null}};
 const localSet=(k,v)=>{try{storage?.setItem(k,v)}catch{}};
 let ids=await profileRepository.listIds();
 let id=localGet(ACTIVE);
 if(!id||!ids.includes(id))id=ids[0];
 let record=id?await profileRepository.load(id):null;
 if(!record){
  const newProfile=createCareerProfile();
  try{record=await profileRepository.save(newProfile.id,newProfile,null)}
  catch(e){if(e.code!=='CONFLICT')throw e;record=await profileRepository.load(newProfile.id);if(!record)throw e;}
  id=record.value.id;
 }
 let profile=record.value,cvId=localGet(ACTIVE_CV);
 if(![profile.master,...profile.variants].some(v=>v.id===cvId))cvId=profile.master.id;
 localSet(ACTIVE,id);localSet(ACTIVE_CV,cvId);
 let apps=await applicationRepository.load();
 if(!apps){
  try{apps=await applicationRepository.save(emptyBook(),null)}
  catch(e){if(e.code!=='CONFLICT')throw e;apps=await applicationRepository.load();if(!apps)throw e;}
 }
 let appRevision=apps.revision,applications=apps,theme=['dark','light'].includes(localGet(THEME))?localGet(THEME):null;
 let status={state:'saved',at:Date.now(),error:null,detail:null};
 let appStatus={state:'saved',at:Date.now(),error:null};
 let blocked=null,appBlocked=null,confirmMaster=false,acknowledging=false,closed=false;
 let editSerial=Promise.resolve(),appSerial=Promise.resolve(),timer=null,changeSeq=0,appSeq=0;
 const listeners=new Set();
 const notify=()=>{for(const fn of listeners)fn()};
 const setStatus=(state,error=null,detail=null)=>{status={state,at:state==='saved'?Date.now():null,error,detail};notify()};
 const onEditorChange=snap=>{
  if(acknowledging||closed||!snap.dirty)return;
  changeSeq++;setStatus('saving');
  if(timer!==null)clearTimeout(timer);
  timer=setTimeout(()=>{timer=null;void flushEditor().catch(()=>{})},saveDelay);
 };
 let editor=createEditor({...dataOf(cvOf(profile,cvId)),onChange:onEditorChange});
 const selected=()=>cvOf(profile,cvId);
 const installEditor=()=>{
  const v=selected();acknowledging=true;
  editor=createEditor({...dataOf(v),onChange:onEditorChange});
  acknowledging=false;notify();
 };
 const blockedError=()=>blocked&&err(blocked,'Save is blocked. Export your unsaved draft or explicitly reopen the last saved revision.');
 function flushEditor(){
  if(timer!==null){clearTimeout(timer);timer=null}
  if(closed)return Promise.reject(err('UNAVAILABLE','Workspace is closed'));
  if(blocked)return Promise.reject(blockedError());
  // Serial snapshot capture takes place inside the queue, after earlier commits.
  editSerial=editSerial.catch(()=>{}).then(async()=>{
   if(blocked)throw blockedError();
   const snap=editor.snapshot();
   if(!snap.dirty)return;
   if(cvId===profile.master.id&&!confirmMaster){
    blocked='UNCONFIRMED';setStatus('error','UNCONFIRMED','Confirm editing the master CV before saving.');
    throw blockedError();
   }
   const captured=dataOf(snap),profileBefore=profile,cvBefore=cvId;
   const current=selected();
   if(same(captured,dataOf(current))){
    acknowledging=true;try{editor.markSaved(captured)}finally{acknowledging=false}
    setStatus(editor.snapshot().dirty?'saving':'saved');
    return;
   }
   const next=cvBefore===profileBefore.master.id?
    replaceMasterDocument(profileBefore,{...captured,expectedRevision:profileBefore.revision,confirmed:true}):
    updateCVVariant(profileBefore,{variantId:cvBefore,...captured,expectedRevision:profileBefore.revision});
   let saved;
   try{saved=await profileRepository.save(profileBefore.id,next,profileBefore.revision)}
   catch(e){
    blocked=e.code||'UNAVAILABLE';
    setStatus('error',blocked,e.message||'The save was not committed.');
    throw e;
   }
   profile=saved.value;
   // Another action cannot switch versions while saving. Never acknowledge
   // edits made after capture, even when the IndexedDB transaction succeeded.
   acknowledging=true;try{editor.markSaved(captured)}finally{acknowledging=false}
   setStatus(editor.snapshot().dirty?'saving':'saved');
   if(editor.snapshot().dirty&&timer===null)
    timer=setTimeout(()=>{timer=null;void flushEditor().catch(()=>{})},saveDelay);
  });
  return editSerial;
 }
 function setApplications(next){
  if(appBlocked)throw err(appBlocked,'Application saving is blocked: export your draft and reload intentionally.');
  if(!next||next.revision!==applications.revision+1)
   throw err('CONFLICT','Application edit was based on an old revision.');
  applications=cloneData(next);appSeq++;const currentSeq=appSeq;
  appStatus={state:'saving',at:null,error:null};notify();
  const snapshot=cloneData(next);
  appSerial=appSerial.catch(()=>{}).then(async()=>{
   if(appBlocked)return;
   try{const saved=await applicationRepository.save(snapshot,appRevision);
    appRevision=saved.revision;
    if(appSeq===currentSeq)appStatus={state:'saved',at:Date.now(),error:null};
    notify();
   }catch(e){appBlocked=e.code||'UNAVAILABLE';appStatus={state:'error',at:null,error:appBlocked};notify();throw e;}
  });
 }
 async function settle(){
  if(blocked)throw blockedError();
  await flushEditor();
  await appSerial;
  if(blocked||appBlocked)throw err(blocked||appBlocked,'Not all changes were saved. Export the unsaved draft.');
  if(editor.snapshot().dirty){await flushEditor();}
  if(editor.snapshot().dirty||appStatus.state!=='saved')throw err('UNAVAILABLE','Changes are still pending');
 }
 async function switchCV(nextId){
  await settle();
  if(![profile.master,...profile.variants].some(v=>v.id===nextId))throw err('INVALID','Unknown CV version');
  cvId=nextId;confirmMaster=false;localSet(ACTIVE_CV,cvId);installEditor();
 }
 async function createVariant(name='Tailored CV'){
  await settle();
  const next=createCVVariant(profile,{name,expectedRevision:profile.revision});
  const saved=await profileRepository.save(profile.id,next,profile.revision);
  profile=saved.value;cvId=profile.variants[profile.variants.length-1].id;confirmMaster=false;
  localSet(ACTIVE_CV,cvId);installEditor();return cvId;
 }
 async function restoreRevision(revision,{confirmed=false}={}){
  if(confirmed!==true)throw err('UNCONFIRMED','Restoration requires explicit confirmation');
  await settle();
  const next=restoreCVRevision(profile,{variantId:cvId,snapshotRevision:revision,expectedRevision:profile.revision,confirmed:true});
  const saved=await profileRepository.save(profile.id,next,profile.revision);
  profile=saved.value;installEditor();
 }
 async function importProfile(approved,{confirmed=false}={}){
  if(confirmed!==true)throw err('UNCONFIRMED','Import requires explicit confirmation');
  await settle();
  const proposal=cloneData(approved);
  validateCareerProfile(proposal);
  if(proposal.revision!==0)throw err('INVALID','Import must be rebased into a new empty local record');
  const existing=await profileRepository.load(proposal.id);
  if(existing)throw err('CONFLICT','A saved profile already uses this identity. Nothing was overwritten.');
  const saved=await profileRepository.save(proposal.id,proposal,null);
  profile=saved.value;cvId=profile.master.id;confirmMaster=false;
  localSet(ACTIVE,profile.id);localSet(ACTIVE_CV,cvId);installEditor();
  return cloneData(profile);
 }
 async function replaceDocument(doc,{appearance}={}){
  await settle();
  if(cvId===profile.master.id&&!confirmMaster)throw err('UNCONFIRMED','Confirm master editing first');
  const data={document:cloneData(doc),appearance:appearance??editor.snapshot().appearance};
  const next=cvId===profile.master.id?
    replaceMasterDocument(profile,{...data,expectedRevision:profile.revision,confirmed:true}):
    updateCVVariant(profile,{variantId:cvId,...data,expectedRevision:profile.revision});
  const saved=await profileRepository.save(profile.id,next,profile.revision);
  profile=saved.value;installEditor();
 }
 const api={
  mode:'persistent',get editor(){return editor},get profile(){return cloneData(profile)},get selectedCV(){return cloneData(selected())},
  get applications(){return applications},get theme(){return theme},get status(){return status},get applicationStatus(){return appStatus},
  get masterEditConfirmed(){return confirmMaster},
  hasContent(){const d=editor.snapshot().document;return Boolean(d.personalInfo.firstName||d.summary||d.experience.length||d.education.length||d.skills.length)},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
  setTheme(t){theme=t;localSet(THEME,t);notify()},
  setApplications,saveNow:settle,flushEditor,
  hasUnsavedWork(){return editor.snapshot().dirty||status.state!=='saved'||appStatus.state!=='saved'||!!blocked||!!appBlocked||timer!==null},
  confirmMasterEditing(confirmed){if(confirmed===true){confirmMaster=true;if(blocked==='UNCONFIRMED'){blocked=null;setStatus('saving');void flushEditor().catch(()=>{})}notify();return true}return false},
  switchCV,createVariant,restoreRevision,importProfile,replaceDocument,
  async reopenSaved({confirmed=false}={}){
   if(confirmed!==true)throw err('UNCONFIRMED','Reopening discards the unsaved draft and needs confirmation');
   if(timer!==null){clearTimeout(timer);timer=null}
   await editSerial.catch(()=>{});await appSerial.catch(()=>{});
   const current=await profileRepository.load(profile.id),book=await applicationRepository.load();
   if(!current||!book)throw err('CORRUPT','Saved data is missing; no discard occurred');
   profile=current.value;applications=book;appRevision=book.revision;blocked=null;appBlocked=null;
   appStatus={state:'saved',at:Date.now(),error:null};confirmMaster=false;installEditor();setStatus('saved');
  },
  exportDraft(){return JSON.stringify({format:'ledger-workspace-recovery-draft',version:1,at:new Date().toISOString(),
   profileId:profile.id,cvId,document:editor.snapshot().document,appearance:editor.snapshot().appearance,
   applications,warning:'This is an unencrypted manual recovery draft, not an automatic replacement or verified backup.'},null,2)},
  getProfileForBackup(){return cloneData(profile)},
  async getSavedProfile(){const saved=await profileRepository.load(profile.id);if(!saved)throw err('CORRUPT','Profile missing');return saved.value},
  async listProfiles(){return profileRepository.listIds()},
  close(){closed=true;if(timer!==null)clearTimeout(timer);
   profileRepository.close?.();applicationRepository.close?.();listeners.clear()},
  reset(){throw err('UNCONFIRMED','Automatic deletion or reset of saved profiles is prohibited')}
 };
 return api;
}
