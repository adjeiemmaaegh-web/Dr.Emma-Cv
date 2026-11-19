import test from 'node:test';
import assert from 'node:assert/strict';
import {
 OCCUPATION_CATEGORIES,categoryRoles,resolveOccupation,occupationContent,
 addUniqueSkill,appendUniqueDuty
} from '../../src/features/occupation/occupation-content.mjs';

test('all historic job categories and original occupation titles survive migration',()=>{
 assert.equal(OCCUPATION_CATEGORIES.length,15);
 const all=OCCUPATION_CATEGORIES.flatMap(g=>g.roles);
 assert(all.length>200,'the original broad job-title catalog should not disappear');
 for(const [query,group] of [['Cleaner','cleaning'],['Cleaning','cleaning'],['Janitor','cleaning'],
  ['Office Cleaner','cleaning'],['Security Guard','security'],['IT Support Technician','technology'],
  ['Warehouse Worker','warehouse'],['Construction Worker','construction']]){
  assert.equal(resolveOccupation(query)?.group,group,query);
 }
 assert(categoryRoles('cleaning').includes('Hotel Cleaner'));
 assert.equal(resolveOccupation('Space Penguin Commander'),null,'unknown role must not silently default to office');
 assert.equal(occupationContent({role:'Space Penguin Commander'}),null);
});
test('25 summary examples for every occupation group; cleaning has additional practical skills and duties',()=>{
 for(const group of OCCUPATION_CATEGORIES){
  const c=occupationContent({category:group.id});
  assert.equal(c.group,group.id);
  assert.equal(c.summaries.length,25,'25 examples for '+group.id);
  assert(c.skills.length>=10,'skills retained for '+group.id);
  assert(c.duties.length>=12,'responsibilities retained for '+group.id);
  for(const text of c.summaries){
   assert(text.length>=40&&text.length<800,'full-length safe example for '+group.id);
   assert(!/\{(?:n|number|title)\}/.test(text),'no unresolved placeholders');
  }
  for(const [name,values] of [['summaries',c.summaries],['skills',c.skills],['duties',c.duties]]){
   assert.equal(new Set(values.map(v=>v.toLowerCase())).size,values.length,name+' duplicates '+group.id);
  }
 }
 const c=occupationContent({role:'Cleaning'});
 assert.equal(c.summaries.length,25);
 assert(c.skills.length>=24);
 assert(c.duties.length>=24);
 assert(c.skills.includes('COSHH'));
 assert(c.duties.some(t=>/colour-coded|colour-coding/i.test(t)));
 assert.equal(c.exampleOnly,true);
});
test('multiple role titles in a category are available without modifying any CV',()=>{
 const content=occupationContent({role:'Commercial Cleaner'});
 assert.equal(content.group,'cleaning');
 assert.equal(content.role,'Commercial Cleaner');
 assert.equal(occupationContent({role:'Cleaner'}).summaries[0],content.summaries[0]);
 const override=occupationContent({role:'Custom Job Title',category:'cleaning'});
 assert.equal(override.group,'cleaning');
});
test('duplicate skill and responsibility insertions refuse rather than repeat content',()=>{
 assert.equal(addUniqueSkill([{name:'COSHH'},'Floor Care'],'coshh'),null);
 assert.equal(addUniqueSkill(['Floor Care'],'COSHH'),'COSHH');
 assert.equal(addUniqueSkill([],'  '),null);
 assert.equal(appendUniqueDuty('Prepared supplies.\nCleaned washrooms.','cleaned washrooms.'),null);
 assert.equal(appendUniqueDuty('Prepared supplies.','Cleaned washrooms.'),'Prepared supplies.\nCleaned washrooms.');
 assert.equal(appendUniqueDuty('','Completed cleaning checklist.'),'Completed cleaning checklist.');
 assert.equal(appendUniqueDuty('Prepared supplies.',''),null);
});
