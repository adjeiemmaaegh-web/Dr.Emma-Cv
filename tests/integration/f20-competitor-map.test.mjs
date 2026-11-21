import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RULES} from '../../src/features/ats/rules.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../../benchmarks/f20/enhancv-check-map.json',import.meta.url),'utf8'));
test('F20 maps every one of 27 publicly listed Enhancv checklist categories without inventing parity',()=>{
 assert.equal(data.criteria.length,27);
 const ids=new Set(RULES.map(r=>r.id)),seen=new Set();
 for(const c of data.criteria){
  assert(!seen.has(c.id));seen.add(c.id);
  assert(c.category&&c.criterion);
  assert(['automated-local','partial','not-assessed'].includes(c.assessment));
  assert.equal(c.competitorHandsOn,'unverified');
  assert.equal(c.qualityEquivalence,'unverified');
  for(const id of c.localRuleIds)assert(ids.has(id),'Missing local ATS rule mapping '+id);
 }
 assert.equal(data.criteria.filter(x=>x.qualityEquivalence!=='unverified').length,0);
});
