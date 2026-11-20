import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUNITY_GUIDANCE,guidanceFor} from '../../src/features/experience/workspace/community-guide.mjs';

test('UK and UAE advice is complete, immutable and explicit',()=>{
 assert.deepEqual(Object.keys(COMMUNITY_GUIDANCE),['uk','uae']);
 for(const region of ['uk','uae']){
  const g=guidanceFor(region);
  assert.equal(Object.isFrozen(g),true);
  assert.equal(Object.isFrozen(g.items),true);
  assert(g.items.length>=4);
  assert(g.items.every(x=>typeof x==='string'&&x.length>20));
 }
 assert.equal(guidanceFor('other'),COMMUNITY_GUIDANCE.uk);
 assert.match(guidanceFor('uae').items.join(' '),/Emirates ID/);
 assert.match(guidanceFor('uk').items.join(' '),/photo/);
});
