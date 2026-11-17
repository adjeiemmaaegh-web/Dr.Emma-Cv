import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistentWorkspaceStore} from '../../src/core/workspace-persistence.mjs';
import {createMemoryRevisionStore} from '../../src/domain/storage/revision-store.mjs';
import {createMemoryApplicationStore} from '../../src/domain/storage/application-revision-store.mjs';
import {createCareerProfileBackup,previewCareerProfileBackup,approveCareerProfileBackup,prepareCareerProfileImportAsNewRecord} from '../../src/domain/storage/profile-backup.mjs';
import {addApplication} from '../../src/features/tracker/tracker.mjs';
import {contractError} from '../../src/contracts/platform.mjs';
const local=()=>{const m=new Map([['ledger_cv_state_v2','SENSITIVE_UNCHANGED'],
 ['ledger_cv_stage6_applications_v1','SENSITIVE_APPS_UNCHANGED']]);
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),keys:()=>[...m.keys()]};};
const setup=(opts={})=>{
 const profileRepository=opts.profileRepository||createMemoryRevisionStore();
 const applicationRepository=opts.applicationRepository||createMemoryApplicationStore();
 const storage=opts.storage||local();
 return {profileRepository,applicationRepository,storage,
  open:()=>createPersistentWorkspaceStore({profileRepository,applicationRepository,storage,saveDelay:1})};
};
test('first opening stores only new A profiles and applications; no legacy reads/writes',async()=>{
 const a=setup(),read=[];const storage={getItem:k=>{read.push(k);return a.storage.getItem(k)},setItem:(k,v)=>a.storage.setItem(k,v)};
 const st=await createPersistentWorkspaceStore({profileRepository:a.profileRepository,applicationRepository:a.applicationRepository,storage,saveDelay:1});
 assert.equal(st.mode,'persistent');assert.equal(st.profile.revision,0);
 assert.equal(st.applications.revision,0);
 assert.equal(st.hasUnsavedWork(),false);
 assert(!read.some(k=>k.startsWith('ledger_cv_state')||k.startsWith('ledger_cv_stage6')));
 assert.equal(a.storage.getItem('ledger_cv_state_v2'),'SENSITIVE_UNCHANGED');
 assert.equal(a.storage.getItem('ledger_cv_stage6_applications_v1'),'SENSITIVE_APPS_UNCHANGED');
 assert.deepEqual(a.storage.keys().filter(k=>k.startsWith('ledger_')).sort(),
  ['ledger_cv_stage6_applications_v1','ledger_cv_state_v2','ledger_workspace_active_cv_v1','ledger_workspace_active_profile_v1']);
 st.close();
});
test('master editing requires explicit confirmation, persists one revision and survives restart',async()=>{
 const a=setup(),st=await a.open();
 st.editor.setPersonal('firstName','Ada');
 await assert.rejects(st.saveNow(),e=>e.code==='UNCONFIRMED');
 assert.equal(st.status.error,'UNCONFIRMED');
 assert.equal(st.editor.snapshot().document.personalInfo.firstName,'Ada');
 assert.equal((await a.profileRepository.load(st.profile.id)).revision,0);
 st.confirmMasterEditing(true);
 await st.saveNow();
 assert.equal(st.status.state,'saved');
 assert.equal(st.profile.revision,1);
 assert.equal(st.profile.master.revision,1);
 assert.equal(st.profile.master.history.length,1);
 st.close();
 const reopened=await a.open();
 assert.equal(reopened.editor.snapshot().document.personalInfo.firstName,'Ada');
 assert.equal(reopened.profile.master.revision,1);
 assert.equal(reopened.editor.snapshot().dirty,false);
 reopened.close();
});
test('two independent tabs reject stale profile CAS and preserve unsaved draft',async()=>{
 const a=setup(),first=await a.open(),second=await a.open();
 first.confirmMasterEditing(true);second.confirmMasterEditing(true);
 first.editor.setPersonal('title','First saved');
 await first.saveNow();
 second.editor.setPersonal('title','Unmerged second tab');
 await assert.rejects(second.saveNow(),e=>e.code==='CONFLICT');
 assert.equal(second.status.error,'CONFLICT');
 assert.equal(second.editor.snapshot().document.personalInfo.title,'Unmerged second tab');
 assert.match(second.exportDraft(),/Unmerged second tab/);
 assert.equal((await a.profileRepository.load(first.profile.id)).value.master.document.personalInfo.title,'First saved');
 await second.reopenSaved({confirmed:true});
 assert.equal(second.editor.snapshot().document.personalInfo.title,'First saved');
 first.close();second.close();
});
test('tailored version remains separate and retains bounded history and exact prior revision',async()=>{
 const a=setup(),s=await a.open();
 s.confirmMasterEditing(true);s.editor.setPersonal('firstName','Ada');await s.saveNow();
 const originalMaster=s.profile.master.document.personalInfo.firstName;
 const variantId=await s.createVariant('Retail');
 assert.equal(s.selectedCV.id,variantId);assert.equal(s.profile.variants.length,1);
 s.editor.setPersonal('firstName','Ada tailored');await s.saveNow();
 assert.equal(s.profile.master.document.personalInfo.firstName,originalMaster);
 assert.equal(s.selectedCV.revision,1);
 assert.equal(s.selectedCV.history.length,1);
 await s.restoreRevision(0,{confirmed:true});
 assert.equal(s.selectedCV.revision,2);
 assert.equal(s.selectedCV.document.personalInfo.firstName,'Ada');
 assert.equal(s.selectedCV.history.at(-1).document.personalInfo.firstName,'Ada tailored');
 await s.switchCV(s.profile.master.id);
 assert.equal(s.editor.snapshot().document.personalInfo.firstName,'Ada');
 s.close();
});
test('application book CAS protects two tabs without modifying legacy application key',async()=>{
 const a=setup(),s1=await a.open(),s2=await a.open();
 s1.setApplications(addApplication(s1.applications,{company:'Alpha',role:'Engineer',expectedRevision:0}));
 await s1.saveNow();
 assert.equal(s1.applicationStatus.state,'saved');
 assert.equal((await a.applicationRepository.load()).applications.length,1);
 s2.setApplications(addApplication(s2.applications,{company:'Beta',role:'Manager',expectedRevision:0}));
 await assert.rejects(s2.saveNow(),e=>e.code==='CONFLICT');
 assert.equal(s2.applicationStatus.error,'CONFLICT');
 assert.match(s2.exportDraft(),/Beta/);
 assert.equal((await a.applicationRepository.load()).applications[0].company,'Alpha');
 assert.equal(a.storage.getItem('ledger_cv_stage6_applications_v1'),'SENSITIVE_APPS_UNCHANGED');
 s1.close();s2.close();
});
test('denied quota writer fails visibly and retains draft; explicit reopen discards it',async()=>{
 const original=createMemoryRevisionStore(),a=setup({
  profileRepository:{
   listIds:()=>original.listIds(),load:id=>original.load(id),
   save:(id,value,rev)=>rev===null?original.save(id,value,rev):Promise.reject(contractError('QUOTA','Simulated full disk')),
   close(){}
  }
 });
 const s=await a.open();s.confirmMasterEditing(true);s.editor.setText('summary','Must not vanish');
 await assert.rejects(s.saveNow(),e=>e.code==='QUOTA');
 assert.equal(s.status.error,'QUOTA');
 assert.match(s.exportDraft(),/Must not vanish/);
 assert.equal((await original.load(s.profile.id)).value.master.document.summary,'');
 await assert.rejects(s.reopenSaved(),e=>e.code==='UNCONFIRMED');
 await s.reopenSaved({confirmed:true});
 assert.equal(s.editor.snapshot().document.summary,'');
 s.close();
});
test('checksum backup import is review-only and an existing identity is never overwritten',async()=>{
 const a=setup(),s=await a.open();
 const raw=await createCareerProfileBackup(s.profile);
 const review=await previewCareerProfileBackup(raw);
 assert.equal(review.status,'review-required');
 const imported=prepareCareerProfileImportAsNewRecord(approveCareerProfileBackup(review,{confirmed:true}));
 await assert.rejects(s.importProfile(imported,{confirmed:true}),e=>e.code==='CONFLICT');
 assert.equal((await a.profileRepository.listIds()).length,1);
 const p=structuredClone(imported);
 p.id='ledger_'+crypto.randomUUID().replaceAll('-','');
 p.master.id='ledger_'+crypto.randomUUID().replaceAll('-','');
 p.master.masterId=p.master.id;
 await assert.rejects(s.importProfile(p),e=>e.code==='UNCONFIRMED');
 const x=await s.importProfile(p,{confirmed:true});
 assert.equal(x.id,p.id);
 assert.equal((await a.profileRepository.listIds()).length,2);
 assert.equal(a.storage.getItem('ledger_cv_state_v2'),'SENSITIVE_UNCHANGED');
 s.close();
});

test('approved job-specific tailoring commits once and never changes the master CV',async()=>{
 const a=setup(),s=await a.open();
 s.confirmMasterEditing(true);
 s.editor.setPersonal('title','Retail manager');
 s.editor.setText('summary','My current summary');
 s.editor.addItem('skills',{name:'Stock control'});
 await s.saveNow();
 const first=s.profile,source=first.master.document;
 const job={id:'jobJourney001',role:'Retail manager',originalText:'Stock control',requirements:[]};
 const suggestion={id:'summaryApproved01',path:'summary',before:source.summary,
  after:'Retail manager with skills in Stock control.',explanation:'From existing CV facts.',
  evidenceIds:[],unsupportedFact:false,status:'proposed',
  operation:{type:'set-summary',text:'Retail manager with skills in Stock control.'}};
 await assert.rejects(s.applyJobTailoring({job,suggestions:[suggestion],decisions:{}}),e=>e.code==='UNCONFIRMED');
 const result=await s.applyJobTailoring({job,suggestions:[suggestion],decisions:{summaryApproved01:'approved'}});
 assert.equal(result.applied.length,1);
 assert.equal(s.profile.revision,first.revision+1,'one CAS increment');
 assert.equal(s.profile.master.document.summary,'My current summary','master unchanged');
 assert.equal(s.selectedCV.targetJobId,job.id);
 assert.match(s.selectedCV.document.summary,/Stock control/);
 assert.equal((await a.profileRepository.load(s.profile.id)).revision,s.profile.revision);
 s.close();
});
