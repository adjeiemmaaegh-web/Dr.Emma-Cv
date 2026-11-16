import test from 'node:test';
import assert from 'node:assert/strict';
import {blankCareerDocument,createCareerProfile,validateCareerProfile,createCVVariant,
 updateCVVariant,replaceMasterDocument,addCareerEvidence,planLegacyProfileImport,approveLegacyProfileImport
} from '../../src/domain/profile/career-profile.mjs';
const date='2026-11-17T10:00:00.000Z';
const seed=()=>createCareerProfile({id:'profileABC123',now:date,idFactory:()=> 'masterABC123'});
test('creates a valid blank career profile without touching legacy data',()=>{
 const p=seed();assert.equal(validateCareerProfile(p),true);
 assert.equal(p.revision,0);assert.equal(p.master.masterId,p.master.id);
 assert.equal(p.master.document.experience.length,0);
});
test('tailored variants are detached from the master and revision checked',()=>{
 const p=seed();
 const v=createCVVariant(p,{id:'variantABC123',name:'Regional store manager',expectedRevision:0,now:date});
 assert.equal(p.variants.length,0);
 assert.equal(v.variants.length,1);
 const changed=blankCareerDocument();changed.summary='Verified responsibilities, not invented numbers';
 const edited=updateCVVariant(v,{variantId:'variantABC123',document:changed,expectedRevision:1,now:date});
 assert.equal(edited.master.document.summary,'');
 assert.equal(edited.variants[0].document.summary,changed.summary);
 assert.equal(v.variants[0].document.summary,'');
 assert.throws(()=>updateCVVariant(v,{variantId:'variantABC123',document:changed,expectedRevision:0}),/revision changed/);
 assert.throws(()=>updateCVVariant(v,{variantId:'masterABC123',document:changed,expectedRevision:1}),/explicit master-edit/);
});
test('explicit approval is required for master changes',()=>{
 const p=seed();const doc=blankCareerDocument();doc.summary='Added by applicant';
 assert.throws(()=>replaceMasterDocument(p,{document:doc,expectedRevision:0}),/confirmation/);
 const changed=replaceMasterDocument(p,{document:doc,expectedRevision:0,confirmed:true,now:date});
 assert.equal(changed.master.document.summary,'Added by applicant');
 assert.equal(p.master.document.summary,'');
});
test('evidence provenance cannot silently call an imported claim verified',()=>{
 const p=seed();
 assert.throws(()=>addCareerEvidence(p,'Revenue up 30%',{id:'evidenceABC123',
 source:'user-asserted',verifiedByUser:true,expectedRevision:0,now:date}),/Invalid or duplicate evidence/);
 const next=addCareerEvidence(p,'Managed eight colleagues',{id:'evidenceABC123',
 source:'user-asserted',expectedRevision:0,now:date});
 assert.equal(next.evidence[0].verifiedByUser,false);
 const verified=addCareerEvidence(next,'Managed eight colleagues',{id:'evidenceDEF123',
 source:'verified-by-user',verifiedByUser:true,expectedRevision:1,now:date});
 assert.equal(verified.evidence[1].verifiedByUser,true);
 assert.equal(p.evidence.length,0);
});
test('legacy proposal preserves exact document while requiring review',()=>{
 const doc=blankCareerDocument();doc.personalInfo={firstName:'Synthetic',lastName:'Applicant'};
 doc.experience=[{employer:'Example plc',title:'Analyst',description:'Verified by applicant only'}];
 const legacy={document:doc,appearance:{color:'#123456'},
 versions:[{id:'legacyABC123',name:'Original variant',document:doc,appearance:{columns:2}}]};
 const plan=planLegacyProfileImport(legacy,{now:date,idFactory:(()=>{let n=0;return ()=>n++===0?'profileABC123':'masterABC123'})()});
 assert.equal(plan.status,'review-required');
 assert.equal(plan.proposed.variants.length,1);
 assert.equal(plan.proposed.master.document.experience[0].employer,'Example plc');
 assert.equal(plan.proposed.variants[0].appearance.columns,2);
 assert.throws(()=>approveLegacyProfileImport(plan),/approval/);
 const approved=approveLegacyProfileImport(plan,{confirmed:true});
 approved.master.document.experience[0].employer='Changed';
 assert.equal(legacy.document.experience[0].employer,'Example plc');
});
test('blocked legacy proposals cannot be approved',()=>{
 const p=planLegacyProfileImport({document:{},appearance:{}});
 assert.equal(p.status,'blocked');
 assert.throws(()=>approveLegacyProfileImport(p,{confirmed:true}),/approval/);
});
test('duplicate variant and evidence identities are rejected',()=>{
 const p=seed();
 const v=createCVVariant(p,{id:'variantABC123',expectedRevision:0,now:date});
 assert.throws(()=>createCVVariant(v,{id:'variantABC123',expectedRevision:1,now:date}),/duplicate/);
 const e=addCareerEvidence(p,'Claim one',{id:'evidenceABC123',expectedRevision:0,now:date});
 assert.throws(()=>addCareerEvidence(e,'Claim two',{id:'evidenceABC123',expectedRevision:1,now:date}),/duplicate/);
});

test('edited variants and masters retain bounded, detached document snapshots',()=>{
 let p=seed();
 p=createCVVariant(p,{id:'variantABC123',expectedRevision:0,now:date});
 for(let n=0;n<15;n++){
  const doc=blankCareerDocument();doc.summary='Evidence revision '+n;
  p=updateCVVariant(p,{variantId:'variantABC123',document:doc,expectedRevision:p.revision,now:date});
 }
 const history=p.variants[0].history;
 assert.equal(p.variants[0].revision,15);
 assert.equal(history.length,12);
 assert.equal(history[0].revision,3);
 assert.equal(history.at(-1).revision,14);
 assert.equal(history.at(-1).document.summary,'Evidence revision 13');
 const edited=blankCareerDocument();edited.summary='Master update';
 const master=replaceMasterDocument(p,{document:edited,confirmed:true,expectedRevision:p.revision,now:date});
 assert.equal(master.master.history.length,1);
 assert.equal(master.master.history[0].document.summary,'');
 assert.equal(p.master.history.length,0);
 assert.throws(()=>validateCareerProfile({...master,master:{...master.master,
   history:[{revision:99,document:blankCareerDocument(),appearance:{},updatedAt:date}]}}),
   e=>e.code==='INVALID');
});
test('empty variant edits and missing master document fail closed',()=>{
 const p=createCVVariant(seed(),{id:'variantABC123',expectedRevision:0,now:date});
 assert.throws(()=>updateCVVariant(p,{variantId:'variantABC123',expectedRevision:1,now:date}),e=>e.code==='INVALID');
 assert.throws(()=>replaceMasterDocument(p,{confirmed:true,expectedRevision:1,now:date}),e=>e.code==='INVALID');
});
