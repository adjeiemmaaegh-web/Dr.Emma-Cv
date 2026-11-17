import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCareerJourneyStore,emptyCareerJourney} from '../../src/domain/storage/career-journey-store.mjs';
import {createLetterDraft,reviseLetter} from '../../src/features/cover-letter/letter.mjs';
import {emptySession,addStory} from '../../src/features/interview/interview.mjs';
import {parseJobText} from '../../src/features/job-match/job-parser.mjs';
import {blankCareerDocument} from '../../src/domain/profile/career-profile.mjs';

const id='profileJourney001';
const job=()=>parseJobText('Retail lead\nRequirements\n- Strong customer service\n- Stock counts',{id:'jobJourney001',role:'Retail lead',employer:'Example'}).job;
test('career journey repository is separate, revisioned and survives new consumer loads',async()=>{
 const repo=createMemoryCareerJourneyStore();
 assert.equal(await repo.load(id),null);
 const first=await repo.save(id,emptyCareerJourney(id),null);
 assert.equal(first.revision,0);assert.equal(first.value.job,null);
 const next={...first.value,job:job()};
 const saved=await repo.save(id,next,0);
 assert.equal(saved.revision,1);
 assert.equal((await repo.load(id)).value.job.role,'Retail lead');
 assert.equal(first.value.job,null);
 await assert.rejects(repo.save(id,emptyCareerJourney(id),0),e=>e.code==='CONFLICT');
 await assert.rejects(repo.save(id,emptyCareerJourney(id),null),e=>e.code==='CONFLICT');
});
test('job, letter and interview session round trip with exact CV/job linkage',async()=>{
 const repo=createMemoryCareerJourneyStore(),target=job(),doc=blankCareerDocument();
 doc.personalInfo={firstName:'Ada',lastName:'Example',title:'Retail Lead'};
 const v={id:'cvJourney001',revision:3,document:doc,appearance:{}};
 const l=createLetterDraft({variant:v,job:target,idFactory:()=> 'letterJourney001'});
 const changed=reviseLetter(l,{body:['Managed retail store operations.']},{expectedRevision:0});
 const session=addStory(emptySession({id:'sessionJourney001',jobTargetId:target.id}),
  {title:'Customer issue',context:'C',task:'T',actions:'A',results:'R',expectedRevision:0,idFactory:()=> 'storyJourney001'});
 const snap={profileId:id,job:target,letter:changed,session};
 await repo.save(id,snap,null);
 const read=await repo.load(id);
 assert.deepEqual(read.value,JSON.parse(JSON.stringify(snap)),'JSON persistence omits undefined optional properties');
 assert.equal(read.value.letter.cvRevisionAtDraft,3);
 assert.equal(read.value.session.jobTargetId,target.id);
});
test('career journey store rejects corrupt/oversized records before write',async()=>{
 const repo=createMemoryCareerJourneyStore(),valid=emptyCareerJourney(id);
 for(const v of [{...valid,profileId:'profileOther01'}, {...valid,job:{id:'wrong'}},
  {...valid,letter:{id:'wrong'}},{...valid,session:{id:'wrong'}}])
  await assert.rejects(repo.save(id,v,null),e=>e.code==='INVALID');
 assert.equal(await repo.load(id),null);
});
