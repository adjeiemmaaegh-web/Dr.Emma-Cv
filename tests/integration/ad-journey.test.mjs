import test from 'node:test';
import assert from 'node:assert/strict';
import {runSyntheticJourney} from '../../src/integration/ad-journey.mjs';
import {createMemoryRevisionStore} from '../../src/domain/storage/revision-store.mjs';

test('A-D synthetic profile to export to vacancy to tailored CV to letter to tracked application and restore',async()=>{
 const result=await runSyntheticJourney({serial:'ABCDEF123456'});
 assert.equal(result.stageA,'profile saved and restored');
 assert.match(result.stageB,/PDF\/DOCX/);
 assert.equal(result.applicationStatus,'Applied');
 assert(result.atsRulesRun>=30);
 assert(result.jobRequirements>=2);
 assert.equal(result.letterErrors,0);
 assert.equal(result.offlineByDesign,true);
 assert.equal(result.privateDataUsed,false);
});
test('A-D run is repeatable using isolated repositories without touching any browser legacy data',async()=>{
 const a=await runSyntheticJourney({serial:'ABCDEF123457',repository:createMemoryRevisionStore()});
 const b=await runSyntheticJourney({serial:'ABCDEF123458',repository:createMemoryRevisionStore()});
 assert.notEqual(a.profileId,b.profileId);
 assert.equal(a.applicationStatus,b.applicationStatus);
});
