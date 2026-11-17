/**
 * Isolated Group A workbench: manual profile creation and explicitly approved
 * import/export. Not mounted into the legacy CV app until integration acceptance.
 * All user-visible data goes through textContent/value; no HTML injection.
 */
import {createFeatureRegistry} from './feature-registry.mjs';
import {createCareerProfile,createCVVariant,updateCVVariant,replaceMasterDocument,
 restoreCVRevision,addCareerEvidence,planLegacyProfileImport,
 approveLegacyProfileImport} from '../domain/profile/career-profile.mjs';
import {cloneData} from '../contracts/platform.mjs';
import {createIndexedDBRevisionStore} from '../domain/storage/revision-store.mjs';
import {createCareerProfileBackup,previewCareerProfileBackup,approveCareerProfileBackup
} from '../domain/storage/profile-backup.mjs';

function control(document,tag,{text='',type,id,placeholder}={}){
 const element=document.createElement(tag);
 if(text)element.textContent=text;
 if(type)element.type=type;
 if(id)element.id=id;
 if(placeholder)element.placeholder=placeholder;
 return element;
}
function downloadText(document,text,name){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
 const anchor=control(document,'a');anchor.href=url;anchor.download=name;
 anchor.style.display='none';document.body.append(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function registerCareerProfileWorkbench(registry,{repository}={}){
 registry.register({id:'career-profile-workbench',mount:({host})=>{
  const document=host.ownerDocument;
  const store=repository??createIndexedDBRevisionStore();
  const root=control(document,'section');
  root.className='ledger-panel';
  const heading=control(document,'h2',{text:'Master career profile — engineering preview'});
  const note=control(document,'p',{text:'New profiles use separate local IndexedDB. The existing CV application and its saved data are not modified.'});
  const status=control(document,'p',{text:'Create or import a synthetic profile to begin.'});status.setAttribute('role','status');
  const overview=control(document,'pre');overview.style.whiteSpace='pre-wrap';overview.style.overflowWrap='anywhere';
  const displayName=control(document,'input',{type:'text',placeholder:'Career profile name'});displayName.maxLength=120;
  const evidence=control(document,'input',{type:'text',placeholder:'Evidence-backed achievement or responsibility'});evidence.maxLength=3000;
  const variants=control(document,'input',{type:'text',placeholder:'Tailored CV version name'});variants.maxLength=120;
  const nameLabel=control(document,'label',{text:'Career profile name'});nameLabel.append(displayName);
  const evidenceLabel=control(document,'label',{text:'Owner-confirmed evidence or responsibility'});evidenceLabel.append(evidence);
  const variantLabel=control(document,'label',{text:'Tailored CV version name'});variantLabel.append(variants);
  const cvPicker=control(document,'select');cvPicker.setAttribute('aria-label','CV version to edit');
  const cvLabel=control(document,'label',{text:'CV version to edit or restore'});cvLabel.append(cvPicker);
  const summaryEdit=control(document,'textarea',{placeholder:'Applicant-written CV summary'});summaryEdit.rows=4;
  summaryEdit.maxLength=20000;
  const summaryLabel=control(document,'label',{text:'Edit selected CV summary (applicant-written facts only)'});summaryLabel.append(summaryEdit);
  const draftWarning=control(document,'p');draftWarning.setAttribute('aria-live','polite');
  const historyPicker=control(document,'select');historyPicker.setAttribute('aria-label','Previous CV revision');
  const historyLabel=control(document,'label',{text:'Previous CV revision to restore'});historyLabel.append(historyPicker);
  const importInput=control(document,'textarea',{placeholder:'Paste a previously exported Ledger profile backup or legacy CV JSON'});importInput.rows=5;
  const importReview=control(document,'pre');importReview.style.whiteSpace='pre-wrap';
  const savedPicker=control(document,'select');savedPicker.setAttribute('aria-label','Saved local profiles');
  const savedLabel=control(document,'label',{text:'Open an existing profile on this device'});
  savedLabel.append(savedPicker);
  const actions=control(document,'div');actions.style.display='flex';actions.style.flexWrap='wrap';actions.style.gap='0.5rem';
  const makeButton=(label,action)=>{const button=control(document,'button',{text:label,type:'button'});
    button.addEventListener('click',()=>void action().catch(e=>{
     status.textContent=e?.code==='CONFLICT'?
      'Not saved (conflict): Another tab changed this profile. Your draft is still on screen; copy it before reloading.':
      e?.code==='QUOTA'||e?.code==='UNAVAILABLE'?
      'Not saved (storage unavailable): '+e.message+'. Your draft is still on screen; copy it before leaving.':
      'Not saved: '+e.message;
    }));
    actions.append(button);return button};
  let profile=null,savedRevision=null,pending=null,pendingRaw=null,busy=false;
  let displayedCvId=null,displayedSummary='';
  const hasUnsavedSummary=()=>Boolean(profile&&displayedCvId&&summaryEdit.value!==displayedSummary);
  function updateDraftWarning(){
   draftWarning.textContent=hasUnsavedSummary()?
    'Unsaved CV summary draft. Save before leaving or switching CVs, or copy this text elsewhere.':'';
  }
  function confirmDiscardSummary(reason){
   return !hasUnsavedSummary()||document.defaultView.confirm(
    'You have unsaved CV summary edits. '+reason+' will discard them. Continue?');
  }
  summaryEdit.addEventListener('input',updateDraftWarning);
  const warnOnUnload=event=>{
   if(hasUnsavedSummary()){event.preventDefault();event.returnValue='';}
  };
  document.defaultView.addEventListener('beforeunload',warnOnUnload);
  async function refreshSavedProfiles(){
   const ids=await store.listIds();
   savedPicker.replaceChildren();
   if(!ids.length){
    const empty=control(document,'option',{text:'No saved profiles yet'});empty.value='';
    savedPicker.append(empty);return;
   }
   for(const id of ids){
    const option=control(document,'option',{text:id});option.value=id;
    try{
     const saved=await store.load(id);
     option.textContent=saved?saved.value.name+' — '+id.slice(-8):'Missing record — '+id.slice(-8);
    }catch{option.textContent='Unreadable record — '+id.slice(-8)}
    savedPicker.append(option);
   }
   if(profile&&ids.includes(profile.id))savedPicker.value=profile.id;
  }
  function renderCVSelection({preserveDraft=false}={}){
   const selected=cvPicker.value,priorText=summaryEdit.value;
   const retain=preserveDraft&&hasUnsavedSummary()&&selected===displayedCvId;
   cvPicker.replaceChildren();historyPicker.replaceChildren();
   if(!profile){
    summaryEdit.value='';displayedCvId=null;displayedSummary='';updateDraftWarning();return;
   }
   for(const item of [profile.master,...profile.variants]){
    const option=control(document,'option',{text:item.name+' (revision '+item.revision+')'});
    option.value=item.id;cvPicker.append(option);
   }
   if([...cvPicker.options].some(option=>option.value===selected))cvPicker.value=selected;
   const active=[profile.master,...profile.variants].find(item=>item.id===cvPicker.value);
   displayedCvId=active.id;displayedSummary=active.document.summary;
   summaryEdit.value=retain?priorText:displayedSummary;
   for(const old of [...(active.history||[])].reverse()){
    const option=control(document,'option',{text:'Revision '+old.revision+' (previously saved)'});
    option.value=String(old.revision);historyPicker.append(option);
   }
   historyPicker.disabled=!active.history?.length;
   updateDraftWarning();
  }
  cvPicker.addEventListener('change',()=>{
   if(!confirmDiscardSummary('Switching CV versions')){
    cvPicker.value=displayedCvId;return;
   }
   renderCVSelection();
  });
  function render({preserveDraft=false}={}){
   renderCVSelection({preserveDraft});
   overview.textContent=profile?[
    'Name: '+profile.name,'Profile revision: '+profile.revision,
    'Master: '+profile.master.name,
    'Variants: '+profile.variants.map(v=>v.name).join(', '),
    'Evidence entries: '+profile.evidence.length,
    'Recoverable CV document snapshots: '+[profile.master,...profile.variants]
     .reduce((sum,entry)=>sum+(entry.history?.length||0),0),
    ...profile.evidence.slice(-10).map(item=>
     (item.verifiedByUser?'Owner-confirmed':'Not independently verified')+' ['+item.source+']: '+item.claim)
   ].join('\n'):'No profile in this preview.';
  }
  async function persist(next,{preserveDraft=true}={}){
   if(busy)throw Error('Operation already running');
   busy=true;
   try{
    const result=await store.save(next.id,next,savedRevision);
    profile=result.value;savedRevision=result.revision;
    status.textContent='Saved locally at revision '+savedRevision;
    render({preserveDraft});
    try{await refreshSavedProfiles()}catch{status.textContent+='; profile list unavailable'}
   }finally{busy=false}
  }
  makeButton('Create new profile',async()=>{
   if(!confirmDiscardSummary('Creating a new profile'))return;
   if(profile&&!document.defaultView.confirm('Replace the previewed profile? Your earlier saved profile is not deleted.'))return;
   const created=createCareerProfile({displayName:displayName.value.trim()||'My career profile'});
   const previous=profile,previousRevision=savedRevision;
   profile=null;savedRevision=null;
   try{await persist(created,{preserveDraft:false})}catch(error){
    profile=previous;savedRevision=previousRevision;render({preserveDraft:true});throw error;
   }
  });
  makeButton('Open selected saved profile',async()=>{
   if(busy)throw Error('Operation already running');
   if(!savedPicker.value)throw Error('Choose an existing profile');
   if(!confirmDiscardSummary('Opening a saved profile'))return;
   if(profile&&profile.id!==savedPicker.value&&
      !document.defaultView.confirm('Open a different saved profile?'))return;
   busy=true;
   try{
    const found=await store.load(savedPicker.value);
    if(!found)throw Error('Profile was not found; refresh the list');
    profile=found.value;savedRevision=found.revision;
    status.textContent='Loaded saved profile at revision '+savedRevision;
    render();
   }finally{busy=false}
  });
  makeButton('Add verified-by-me evidence',async()=>{
   if(!profile)throw Error('Create or import a profile first');
   const claim=evidence.value.trim();
   if(!claim)throw Error('Enter the achievement or responsibility');
   const next=addCareerEvidence(profile,claim,{source:'verified-by-user',verifiedByUser:true,expectedRevision:profile.revision});
   await persist(next);evidence.value='';
  });
  makeButton('Create tailored copy',async()=>{
   if(!profile)throw Error('Create or import a profile first');
   const next=createCVVariant(profile,{name:variants.value.trim()||'Tailored CV',expectedRevision:profile.revision});
   await persist(next);variants.value='';
  });
  makeButton('Save selected CV summary',async()=>{
   if(!profile)throw Error('Create or open a profile first');
   const current=[profile.master,...profile.variants].find(item=>item.id===cvPicker.value);
   if(!current)throw Error('Choose a CV first');
   if(current.document.summary===summaryEdit.value){status.textContent='Summary unchanged; no save was needed.';return}
   const doc=cloneData(current.document);doc.summary=summaryEdit.value;
   let next;
   if(current.id===profile.master.id){
    if(!document.defaultView.confirm('Edit the master CV summary? Existing tailored copies will stay separate.'))return;
    next=replaceMasterDocument(profile,{document:doc,expectedRevision:profile.revision,confirmed:true});
   }else{
    next=updateCVVariant(profile,{variantId:current.id,document:doc,expectedRevision:profile.revision});
   }
   await persist(next);
  });
  makeButton('Restore selected previous CV revision',async()=>{
   if(!profile)throw Error('Create or open a profile first');
   const selected=cvPicker.value,revision=Number(historyPicker.value);
   const item=[profile.master,...profile.variants].find(entry=>entry.id===selected);
   if(!item||!historyPicker.value||!item.history?.some(old=>old.revision===revision))
    throw Error('Choose an available previous CV revision');
   if(!document.defaultView.confirm('Restore the selected previous CV content as a new revision? Current content will be retained in history.'))return;
   const next=restoreCVRevision(profile,{variantId:selected,snapshotRevision:revision,
    expectedRevision:profile.revision,confirmed:true});
   await persist(next,{preserveDraft:false});
  });
  makeButton('Export checksum backup',async()=>{
   if(!profile)throw Error('No career profile to export');
   if(hasUnsavedSummary()&&!document.defaultView.confirm(
    'The current summary draft is unsaved and will NOT be in this backup. Export saved data only?'))return;
   const backup=await createCareerProfileBackup(profile);
   downloadText(document,backup,'ledger-career-profile-backup.json');
   status.textContent='Backup exported; preserve it somewhere safe.';
  });
  makeButton('Review pasted import',async()=>{
   pending=null;pendingRaw=null;importReview.textContent='';
   let input;try{input=JSON.parse(importInput.value)}catch{throw Error('Import is not valid JSON')}
   pendingRaw=importInput.value;
   pending=typeof input?.format==='string'&&input.format==='ledger-career-profile-backup'
    ?await previewCareerProfileBackup(importInput.value)
    :planLegacyProfileImport(input);
   importReview.textContent=[pending.status,...pending.warnings,
    ...(pending.proposed?[
     'Profile: '+pending.proposed.name,
     'Master CV: '+pending.proposed.master.name,
     'Career variants: '+pending.proposed.variants.length,
     'Evidence entries requiring factual review: '+pending.proposed.evidence.length,
     'Work history entries: '+pending.proposed.master.document.experience.length,
     'Education entries: '+pending.proposed.master.document.education.length
    ]:[])].join('\n');
   status.textContent=pending.status==='review-required'?
    'Preview only. No import or overwrite has occurred.':'Import blocked. Nothing was changed.';
  });
  makeButton('Approve reviewed import',async()=>{
   if(!pending||pending.status!=='review-required')throw Error('Review a valid import first');
   if(pendingRaw!==importInput.value)throw Error('Import content changed; review it again before approval');
   if(!document.defaultView.confirm('Save the reviewed profile as a new separate local record? Existing legacy CV data will remain unchanged.'))return;
   const next=pending.sourceKey?approveLegacyProfileImport(pending,{confirmed:true}):
    approveCareerProfileBackup(pending,{confirmed:true});
   if(profile?.id===next.id)throw Error('An existing profile with this identity is already open. Export it first; overwrite is not permitted here.');
   const exists=await store.load(next.id);
   if(exists)throw Error('A local profile with this ID exists; automatic overwrite is blocked.');
   if(!confirmDiscardSummary('Opening an imported profile'))return;
   const previous=profile,previousRevision=savedRevision;
   profile=null;savedRevision=null;
   try{await persist(next,{preserveDraft:false})}catch(error){
    profile=previous;savedRevision=previousRevision;render({preserveDraft:true});throw error;
   }
   pending=null;pendingRaw=null;
   importReview.textContent='Approved and saved. Imported claims require factual review.';
  });
  root.append(heading,note,nameLabel,savedLabel,evidenceLabel,variantLabel,
   cvLabel,summaryLabel,draftWarning,historyLabel,actions,status,overview,
   control(document,'h3',{text:'Manual, review-only import'}),importInput,importReview);
  host.append(root);render();
  void refreshSavedProfiles().catch(()=>{status.textContent='Profile list unavailable; local storage may be blocked.'});
  return ()=>{document.defaultView.removeEventListener('beforeunload',warnOnUnload);
   root.remove();profile=null;pending=null;pendingRaw=null;
   if(repository===undefined&&typeof store.close==='function')store.close();
  };
 }});
}
export function createCareerProfileWorkbenchRegistry(options){
 const registry=createFeatureRegistry();
 registerCareerProfileWorkbench(registry,options);
 return registry;
}
