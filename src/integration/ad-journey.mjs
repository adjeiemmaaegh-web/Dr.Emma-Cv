/**
 * Development-only A-D synthetic journey. No live CV content, remote requests
 * or writes to legacy application localStorage keys.
 */
import {createCareerProfile} from '../domain/profile/career-profile.mjs';
import {createMemoryRevisionStore} from '../domain/storage/revision-store.mjs';
import {createCareerProfileBackup,previewCareerProfileBackup,approveCareerProfileBackup,
 prepareCareerProfileImportAsNewRecord} from '../domain/storage/profile-backup.mjs';
import {createDocumentRenderer} from '../features/documents/index.mjs';
import {runAtsChecks,parseJobText,compareToDocument,
 buildTailoringSuggestions,applyApprovedSuggestions} from '../features/intelligence/index.mjs';
import {createLetterDraft,reviseLetter,checkLetterFacts,exportLetter,tracker,
 exportBook,reviewBookImport,approveBookImport} from '../features/career/index.mjs';

const NOW='2026-11-17T10:00:00.000Z';
const ID=()=>globalThis.crypto.randomUUID().replace(/-/g,'');
export const SYNTHETIC_JOB=String.raw`Retail Operations Manager
Requirements
- Manage shop stock control and inventory
- Lead and train store teams
Preferred
- Scheduling team shifts`;
export function syntheticDocument(){
 return {
  personalInfo:{firstName:'Alex',lastName:'Example',title:'Retail Operations Manager',
   email:'alex@example.test',phone:'+1 202 555 0101',city:'Example City'},
  summary:'Retail operations manager supporting store teams and stock control.',
  experience:[{id:'roleSYNTH001',title:'Operations Manager',employer:'Example Shops',
   start:'Jan 2021',end:'',current:true,
   description:'<ul><li>Managed stock control for store operations.</li><li>Trained new team members.</li><li>Planned weekly staff schedules.</li></ul>'}],
  education:[{id:'educationSYNTH001',degree:'Business Diploma',school:'Example College',start:'2018',end:'2020'}],
  skills:[{name:'Team scheduling'},{name:'Stock control'},{name:'Staff training'}],
  languages:[],certifications:[],projects:[],accomplishments:[],customSections:[],
  hobbies:'',references:''
 };
}
const requireCase=(condition,message)=>{if(!condition)throw Error('Synthetic A-D integration failed: '+message)};
export async function runSyntheticJourney({repository=createMemoryRevisionStore(),now=NOW,serial=ID()}={}){
 const profileId='profile'+serial,masterId='master'+serial,variantId='variant'+serial;
 const profile=createCareerProfile({id:profileId,idFactory:()=>masterId,
  displayName:'Synthetic career profile',document:syntheticDocument(),now});
 const initial=await repository.save(profile.id,profile,null);
 const reloaded=await repository.load(profile.id);
 requireCase(reloaded?.revision===0&&reloaded.value.master.id===masterId,'Group A profile persistence');
 const render=createDocumentRenderer();
 const original=reloaded.value.master;
 const request=format=>({sourceVariantId:original.id,sourceRevision:original.revision,
  document:original.document,appearance:original.appearance,format});
 const pdf=await render.render(request('pdf')),docx=await render.render(request('docx'));
 requireCase(pdf.bytes.length>200&&docx.bytes.length>200,'Group B PDF/DOCX bytes');
 requireCase(pdf.text.includes('Example Shops'),'Group B exported source facts');
 const parsed=parseJobText(SYNTHETIC_JOB,{id:'job'+serial,
  role:'Retail Operations Manager',employer:'Example Employer'});
 const job=parsed.job;
 requireCase(job.requirements.length>=2,'Group C job requirements');
 const ats=runAtsChecks({document:original.document,appearance:original.appearance,artifact:pdf,now:new Date(now)});
 requireCase(ats.rulesFailed.length===0,'Group C ATS rules executed');
 const comparison=compareToDocument(job,original.document);
 requireCase(comparison.results.length===job.requirements.length,'Group C evidence comparison');
 const proposals=buildTailoringSuggestions({document:original.document,job,comparison});
 const decisions=Object.fromEntries(proposals.suggestions.map(s=>[s.id,s.unsupportedFact?'rejected':'approved']));
 const tailored=applyApprovedSuggestions(reloaded.value,{job,suggestions:proposals.suggestions,decisions,
  expectedRevision:reloaded.revision,now,idFactory:()=>variantId});
 requireCase(tailored.profile.master.document.summary===original.document.summary,'Group C master unchanged');
 requireCase(tailored.profile.variants.length===1,'Group C separate variant');
 const persisted=await repository.save(profileId,tailored.profile,reloaded.revision);
 const cv=persisted.value.variants[0];
 requireCase(cv.id===variantId&&cv.targetJobId===job.id,'Group C exact variant/job reference');
 const tailPdf=await render.render({sourceVariantId:cv.id,sourceRevision:cv.revision,
  document:cv.document,appearance:cv.appearance,format:'pdf'});
 requireCase(tailPdf.bytes.length>200,'Group B tailored PDF export');
 let letter=createLetterDraft({variant:cv,job,now,idFactory:()=> 'letter'+serial});
 letter=reviseLetter(letter,{body:['Managed stock control and trained team members at Example Shops.']},
  {expectedRevision:0,now});
 const letterFindings=checkLetterFacts(letter,{variant:cv,job});
 requireCase(!letterFindings.some(f=>f.severity==='error'),'Group D letter factual checks');
 const letterPdf=exportLetter(letter,{cvAppearance:cv.appearance},'pdf');
 requireCase(letterPdf.bytes.length>200,'Group D matching letter export');
 let book=tracker.emptyBook();
 book=tracker.addApplication(book,{company:'Example Employer',role:'Retail Operations Manager',
  expectedRevision:0,now,idFactory:()=> 'app'+serial});
 const appId=book.applications[0].id;
 book=tracker.linkDocuments(book,appId,{cvVariantId:cv.id,cvRevision:cv.revision,
  coverLetterId:letter.id,coverLetterRevision:letter.revision,expectedRevision:1,now});
 book=tracker.setStatus(book,appId,'Applied',{expectedRevision:2,now});
 requireCase(tracker.verifyLinks(book.applications[0],{profile:persisted.value,letters:[letter]}).length===0,
  'Group D exact document revision links');
 const review=reviewBookImport(exportBook(book),tracker.emptyBook());
 requireCase(review.status==='review-required'&&review.incoming.length===1,'Group D tracker backup preview');
 const restoredBook=approveBookImport(tracker.emptyBook(),review,{confirmed:true,expectedRevision:0});
 requireCase(restoredBook.applications[0].cvRevision===cv.revision,'Group D tracker restore');
 const backup=await createCareerProfileBackup(persisted.value,{now});
 const preview=await previewCareerProfileBackup(backup);
 requireCase(preview.status==='review-required','Group A profile backup integrity');
 const restored=approveCareerProfileBackup(preview,{confirmed:true});
 const restoreStore=createMemoryRevisionStore();
 await restoreStore.save(profileId,prepareCareerProfileImportAsNewRecord(restored),null);
 const back=await restoreStore.load(profileId);
 // Backup restores the logical profile, not its repository transaction counter.
 requireCase(back.value.master.document.summary===original.document.summary&&
  back.value.variants[0].targetJobId===job.id,'Group A full profile restore');
 return Object.freeze({
  profileId,jobId:job.id,variantId:cv.id,profileRevision:persisted.revision,
  stageA:'profile saved and restored',stageB:'PDF/DOCX and tailored PDF exported',
  stageC:'ATS + job match + approved independent variant',
  stageD:'matching letter + application link + backup/restore',
  atsRulesRun:ats.rulesRun,jobRequirements:job.requirements.length,
  suggestedChanges:proposals.suggestions.length,approvedChanges:tailored.applied.length,
  letterErrors:letterFindings.filter(x=>x.severity==='error').length,
  applicationStatus:restoredBook.applications[0].status,
  offlineByDesign:true,privateDataUsed:false
 });
}
