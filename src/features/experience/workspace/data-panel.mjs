/**
 * Group A/E user-confirmed local migration & backup controls.
 * No source is read until the user requests a review. No legacy key is written.
 * Import is always an independent new profile record; never silent overwrite.
 */
import {el,download} from './ui.mjs';
import {createCareerProfile,planLegacyProfileImport,approveLegacyProfileImport} from '../../../domain/profile/career-profile.mjs';
import {validLegacyDocument} from '../../../domain/storage/legacy-shape.mjs';
import {createCareerProfileBackup,previewCareerProfileBackup,approveCareerProfileBackup,prepareCareerProfileImportAsNewRecord} from '../../../domain/storage/profile-backup.mjs';
import {createLegacyRawBackup,previewLegacyRawBackup} from '../../../domain/storage/legacy-backup.mjs';
import {exportBook,reviewBookImport,approveBookImport} from '../../tracker/io.mjs';
import {createUpdateManager} from '../../pwa-ui/update-manager.mjs';
const MAX_FILE=32*1024*1024+8192;
const toDownload=(raw,name)=>download(raw,name,'application/json;charset=utf-8');
export function createWorkspaceDataPanel(ctx){
 const {store}=ctx,root=el('section',{class:'lw-card ledger-a11y','aria-labelledby':'data-panel-h'});
 const title=el('h2',{id:'data-panel-h'},'Data, versions and recovery');
 const about=el('p',{class:'lw-help'},'Your CV uses the new local IndexedDB profile. Original CVs and preview files are never changed automatically. Downloads are unencrypted private files: keep them safe.');
 const status=el('p',{role:'status','aria-live':'polite',class:'lw-help'},'You can export your saved work or review an import.');
 const control=el('div',{class:'lw-row',style:'margin:var(--s-3) 0'});
 const review=el('div',{class:'lw-help','aria-live':'polite'});
 let pending=null,sourceRaw=null,sourceKind=null,backedProfile=false,backedApps=false,legacyBacked=false;
 const message=t=>{status.textContent=t};
 const run=fn=>async()=>{try{await fn()}catch(e){message('Not completed: '+(e.message||e.code||'unknown error'))}};
 const btn=(label,fn)=>el('button',{type:'button',class:'lw-btn sm',on:{click:run(fn)}},label);
 const select=el('select',{'aria-label':'Saved CV version'});
 const updateVersions=()=>{
  const p=store.profile;select.replaceChildren();
  for(const v of [p.master,...p.variants])select.append(el('option',{value:v.id,selected:v.id===store.selectedCV.id||undefined},v.name+' (revision '+v.revision+')'));
 };
 updateVersions();
 const variantName=el('input',{type:'text','aria-label':'Name for a new tailored CV',placeholder:'e.g. Finance role',maxlength:'120'});
 const revision=el('select',{'aria-label':'Previous revision to restore'});
 const updateRevisions=()=>{revision.replaceChildren();
  for(const h of store.selectedCV.history||[])revision.append(el('option',{value:h.revision},'Revision '+h.revision));
  revision.disabled=!revision.options.length;
 };
 updateRevisions();
 root.append(title,about,
  el('div',{class:'lw-row'},
   el('label',{},'Choose CV version ',select),
   btn('Open version',async()=>{await store.switchCV(select.value);location.hash='#/editor';location.reload()}),
   el('label',{},'New tailored version ',variantName),
   btn('Create separate version',async()=>{const v=variantName.value.trim();if(!v)throw Error('Name the new version first');
    await store.createVariant(v);location.hash='#/editor';location.reload()})),
  el('div',{class:'lw-row'},el('label',{},'Earlier saved revision ',revision),
   btn('Restore as a new revision',async()=>{
    if(!revision.value)throw Error('Choose an earlier revision');
    if(!confirm('Restore this CV revision? The current saved revision will remain in history (up to 12 prior snapshots).'))return;
    await store.restoreRevision(Number(revision.value),{confirmed:true});location.reload();
   })),
  el('p',{class:'lw-help'},'CV history keeps at most 12 earlier complete document snapshots per version. Use downloaded backups for longer-term retention.'));
 control.append(
  btn('Download saved CV backup',async()=>{await store.saveNow();
   toDownload(await createCareerProfileBackup(await store.getSavedProfile()),'ledger-career-profile-backup.json');
   backedProfile=true;message('Profile backup downloaded. Keep it somewhere safe.')}),
  btn('Download application backup',async()=>{await store.saveNow();
   toDownload(exportBook(store.applications),'ledger-applications-backup.json');
   backedApps=true;message('Application backup downloaded. This is separate from the profile backup.')}),
  btn('Download unsaved draft',async()=>{toDownload(store.exportDraft(),'ledger-unsaved-draft.json');
   message('Draft downloaded; it is not a verified/restorable profile backup.')}),
  btn('Reopen saved versions',async()=>{if(!confirm('Discard all unsaved CV and application changes and reopen the last committed versions? Export a draft first if necessary.'))return;
   await store.reopenSaved({confirmed:true});location.reload()}));
 root.append(control);
 const updateSlot=el('section',{class:'lw-help','aria-label':'Offline update management'},el('p',{},'Checking for an existing installed offline app…'));
 let updateManager=null;
 if(globalThis.navigator?.serviceWorker?.getRegistration){
  void navigator.serviceWorker.getRegistration().then(reg=>{
   if(!updateSlot.isConnected)return;
   if(!reg){updateSlot.replaceChildren(el('p',{},'No service-worker update is waiting for this preview origin.'));return}
   updateManager=createUpdateManager({registration:reg,serviceWorker:navigator.serviceWorker,
    hasUnsavedWork:()=>store.hasUnsavedWork(),onChange:()=>drawUpdate()});
   drawUpdate();
   function drawUpdate(){
    if(!updateSlot.isConnected)return;
    const state=updateManager.getState();
    updateSlot.replaceChildren(el('p',{},state.status==='available'||state.status==='deferred'?
      'An offline update is waiting. It will only activate when you approve it.':
      state.status==='applying'?'Applying your approved update…':'No offline update is waiting.'));
    if(state.status==='available'||state.status==='deferred'){
     updateSlot.append(btn('Update now',()=>{
      const outcome=updateManager.apply();
      if(!outcome.ok)message(outcome.reason==='unsaved'?'Save all changes before activating an update.':'Update is not available.');
     }));
    }
   }
  }).catch(()=>{updateSlot.replaceChildren(el('p',{},'Update status could not be read. No update was triggered.'))});
 }else updateSlot.replaceChildren(el('p',{},'Service-worker updates are not supported in this browser context.'));
 root.append(updateSlot);
 const legacyControls=el('div',{class:'lw-row'});
 legacyControls.append(btn('Download exact legacy data backup',async()=>{
  const raw=await createLegacyRawBackup(key=>localStorage.getItem(key));
  toDownload(raw,'ledger-legacy-raw-backup.json');
  legacyBacked=true;message('Raw legacy backup exported. Includes original CV, recovery and application keys; no key was modified.')}),
 btn('Review this browser’s legacy CV',async()=>{
  // This is the first read of any legacy CV key. Deliberate, explicit action.
  const raw=localStorage.getItem('ledger_cv_state_v2');
  if(!raw)throw Error('No legacy CV found under this browser origin. Use a downloaded file from your original origin.');
  const data=JSON.parse(raw),p=planLegacyProfileImport(data);
  setPending(p,'legacy-local',raw);
 }));
 const file=el('input',{type:'file',accept:'.json,application/json','aria-label':'Select a local backup to review'});
 const reviewButton=btn('Review selected file',async()=>{
  const f=file.files?.[0];if(!f)throw Error('Choose a backup file first');
  if(f.size>MAX_FILE)throw Error('File exceeds the supported review size');
  const raw=await f.text(),src=JSON.parse(raw);
  if(src?.kind==='ledger-applications'||Array.isArray(src)||src?.book?.applications){
   const p=reviewBookImport(raw,store.applications);setPending(p,'applications',raw);return;
  }
  if(src?.format==='ledger-career-profile-backup'){
   const p=await previewCareerProfileBackup(raw);setPending(p,'profile-backup',raw);return;
  }
  if(src?.format==='ledger-legacy-raw-backup'){
   const rawReview=await previewLegacyRawBackup(raw);
   if(rawReview.status!=='review-required'){setPending(rawReview,'blocked',raw);return}
   const legacy=rawReview.proposed.entries.ledger_cv_state_v2;
   if(!legacy)throw Error('This raw backup has no legacy primary CV; restore it separately using its manual recovery plan');
   const p=planLegacyProfileImport(JSON.parse(legacy));
   p.warnings=[...(p.warnings||[]),...rawReview.warnings,'Other raw recovery/application keys stay in your download; they are not written to this browser.'];
   setPending(p,'legacy-file',raw);return;
  }
  if(src?.document&&validLegacyDocument(src.document)&&src?.appearance!==undefined&&!Array.isArray(src?.versions)){
   // Explicit import from the old independent preview workspace format.
   const p={status:'review-required',warnings:['Old preview CV only; its application board is NOT imported with this profile. Export applications separately.'],
    proposed:createCareerProfile({document:src.document,appearance:src.appearance||{}})};
   setPending(p,'preview-file',raw);return;
  }
  const p=planLegacyProfileImport(src);setPending(p,'legacy-file-direct',raw);
 });
 function setPending(p,kind,raw){
  pending=p;sourceKind=kind;sourceRaw=raw;
  if(p.status==='review-required'){
   const v=p.proposed;
   review.replaceChildren(el('p',{},kind==='applications'?p.incoming.length+' reviewed job entries; '+p.conflicts.length+' existing IDs would be kept.':
    'Reviewed "'+v.name+'" with '+(v.variants.length+1)+' CV versions, '+v.master.document.experience.length+' job entries and '+v.evidence.length+' evidence items.'),
    el('ul',{},(p.warnings||[]).map(w=>el('li',{},w))),
    el('p',{},'No import has been performed. Approval creates a separate profile, or imports only reviewed job entries.'));
  }else review.replaceChildren(el('p',{},'Review blocked: '+(p.warnings||[]).join('; ')));
  message(p.status==='review-required'?'Review ready. Download current profile and application backups before approving.':'Import blocked. Nothing changed.');
 }
 const approve=btn('Approve reviewed import',async()=>{
  if(pending?.status!=='review-required')throw Error('Review a valid source first');
  if(!backedProfile||!backedApps)throw Error('Download both current profile and application backups first');
  if(sourceKind==='legacy-local'&&localStorage.getItem('ledger_cv_state_v2')!==sourceRaw)
   throw Error('Legacy CV changed since review; review it again');
  if(sourceKind==='applications'){
   const f=file.files?.[0];if(!f||(await f.text())!==sourceRaw)throw Error('File changed; review again');
   if(!confirm('Import these reviewed applications? Existing record IDs will be kept unchanged.'))return;
   const next=approveBookImport(store.applications,pending,{confirmed:true,expectedRevision:store.applications.revision,conflictPolicy:'keep-existing'});
   store.setApplications(next);await store.saveNow();message('Application entries saved with revision protection.');review.replaceChildren();pending=null;return;
  }
  if(sourceKind!=='legacy-local'){
   const f=file.files?.[0];if(!f||(await f.text())!==sourceRaw)throw Error('File changed; review again');
  }
  if(sourceKind==='legacy-local'&&!legacyBacked)throw Error('Download a complete raw legacy backup first');
  if(!confirm('Create this reviewed CV as a new separate IndexedDB profile? Old data will not be deleted.'))return;
  const approved=sourceKind==='profile-backup'?approveCareerProfileBackup(pending,{confirmed:true}):
   sourceKind==='preview-file'?pending.proposed:approveLegacyProfileImport(pending,{confirmed:true});
  const imported=prepareCareerProfileImportAsNewRecord(approved);
  await store.importProfile(imported,{confirmed:true});pending=null;message('Separate reviewed profile saved. Original data remains unchanged.');
  location.hash='#/editor';location.reload();
 });
 root.append(el('h3',{},'Review an existing CV or backup'),el('p',{class:'lw-help'},'Moving from a different browser, file path or website requires a downloaded JSON backup. No cross-origin storage access is possible. Legacy raw backups do not automatically restore other keys.'),legacyControls,
  el('div',{class:'lw-row'},el('label',{},'Backup file ',file),reviewButton,approve),review,status);
 return {node:root,destroy(){}};
}
