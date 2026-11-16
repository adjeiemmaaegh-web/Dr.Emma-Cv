/**
 * Isolated Group A workbench: manual profile creation and explicitly approved
 * import/export. Not mounted into the legacy CV app until integration acceptance.
 * All user-visible data goes through textContent/value; no HTML injection.
 */
import {createFeatureRegistry} from './feature-registry.mjs';
import {createCareerProfile,createCVVariant,addCareerEvidence,planLegacyProfileImport,
 approveLegacyProfileImport} from '../domain/profile/career-profile.mjs';
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
  const importInput=control(document,'textarea',{placeholder:'Paste a previously exported Ledger profile backup or legacy CV JSON'});importInput.rows=5;
  const importReview=control(document,'pre');importReview.style.whiteSpace='pre-wrap';
  const actions=control(document,'div');actions.style.display='flex';actions.style.flexWrap='wrap';actions.style.gap='0.5rem';
  const makeButton=(label,action)=>{const button=control(document,'button',{text:label,type:'button'});
    button.addEventListener('click',()=>void action().catch(e=>{status.textContent='Not saved: '+e.message}));
    actions.append(button);return button};
  let profile=null,savedRevision=null,pending=null,busy=false;
  function render(){
   overview.textContent=profile?[
    'Name: '+profile.name,'Profile revision: '+profile.revision,
    'Master: '+profile.master.name,
    'Variants: '+profile.variants.map(v=>v.name).join(', '),
    'Evidence entries: '+profile.evidence.length
   ].join('\n'):'No profile in this preview.';
  }
  async function persist(next){
   if(busy)throw Error('Operation already running');
   busy=true;
   try{
    const result=await store.save(next.id,next,savedRevision);
    profile=result.value;savedRevision=result.revision;status.textContent='Saved locally at revision '+savedRevision;render();
   }finally{busy=false}
  }
  makeButton('Create new profile',async()=>{
   if(profile&&!document.defaultView.confirm('Replace the previewed profile? Your earlier saved profile is not deleted.'))return;
   const created=createCareerProfile({displayName:displayName.value.trim()||'My career profile'});
   profile=null;savedRevision=null;await persist(created);
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
  makeButton('Export checksum backup',async()=>{
   if(!profile)throw Error('No career profile to export');
   const backup=await createCareerProfileBackup(profile);
   downloadText(document,backup,'ledger-career-profile-backup.json');
   status.textContent='Backup exported; preserve it somewhere safe.';
  });
  makeButton('Review pasted import',async()=>{
   let input;try{input=JSON.parse(importInput.value)}catch{throw Error('Import is not valid JSON')}
   pending=typeof input?.format==='string'&&input.format==='ledger-career-profile-backup'
    ?await previewCareerProfileBackup(importInput.value)
    :planLegacyProfileImport(input);
   importReview.textContent=[pending.status,...pending.warnings].join('\n');
   status.textContent=pending.status==='review-required'?
    'Preview only. No import or overwrite has occurred.':'Import blocked. Nothing was changed.';
  });
  makeButton('Approve reviewed import',async()=>{
   if(!pending||pending.status!=='review-required')throw Error('Review a valid import first');
   if(!document.defaultView.confirm('Save the reviewed profile as a new separate local record? Existing legacy CV data will remain unchanged.'))return;
   const next=pending.sourceKey?approveLegacyProfileImport(pending,{confirmed:true}):
    approveCareerProfileBackup(pending,{confirmed:true});
   if(profile?.id===next.id)throw Error('An existing profile with this identity is already open. Export it first; overwrite is not permitted here.');
   const exists=await store.load(next.id);
   if(exists)throw Error('A local profile with this ID exists; automatic overwrite is blocked.');
   profile=null;savedRevision=null;await persist(next);
   pending=null;importReview.textContent='Approved and saved. Imported claims require factual review.';
  });
  root.append(heading,note,displayName,evidence,variants,actions,status,overview,
   control(document,'h3',{text:'Manual, review-only import'}),importInput,importReview);
  host.append(root);render();
  return ()=>{root.remove();profile=null;pending=null};
 }});
}
export function createCareerProfileWorkbenchRegistry(options){
 const registry=createFeatureRegistry();
 registerCareerProfileWorkbench(registry,options);
 return registry;
}
