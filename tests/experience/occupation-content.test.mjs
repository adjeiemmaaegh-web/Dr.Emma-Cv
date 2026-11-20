import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceShellCacheKey} from '../../tools/workspace-shell-cache-key.mjs';
import {
 OCCUPATION_CATEGORIES,categoryRoles,resolveOccupation,occupationContent,
 addUniqueSkill,appendUniqueDuty,mergeSummary,hasSuggestedSummary,removeSuggestedSummary,hasSuggestedDuty,removeSuggestedDuty
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

test('summary selection can replace or combine up to the reviewed length limit',()=>{
 assert.equal(mergeSummary('Draft','A verified example.'),'A verified example.');
 assert.equal(mergeSummary('Draft','A verified example.',{append:true}),'Draft A verified example.');
 assert.equal(mergeSummary('Draft A verified example.','A verified example.',{append:true}),null);
 assert.equal(mergeSummary('x'.repeat(790),'a'.repeat(30),{append:true}),null);
 assert.equal(mergeSummary('','  '),null);
});

test('offline workspace cache invalidates on changed emitted JS/CSS even when index.html is identical',()=>{
 const files={
  '/src/features/experience/workspace/views.mjs':'export const page="old editor";',
  '/src/features/experience/workspace/workspace.css':'.lw{color:black}'
 };
 const paths=Object.keys(files);
 const build=(html='<html>unchanged shell</html>',list=paths)=>
  workspaceShellCacheKey({html,assetPaths:list,readAsset:name=>files[name]});
 const before=build();
 assert.match(before,/^ledger-workspace-[a-f0-9]{14}$/);
 assert.equal(build(undefined,[...paths].reverse()),before,'file traversal order must not affect identity');
 files[paths[0]]='export const page="editor with Smart content library";';
 assert.notEqual(build(),before,'a JavaScript-only release must invalidate the old cache');
 const afterJs=build();
 files[paths[1]]='.lw{color:teal}';
 assert.notEqual(build(),afterJs,'CSS-only changes must also invalidate the cache');
 assert.notEqual(build('<html>new shell</html>'),build(),'HTML changes must invalidate the cache');
 assert.throws(()=>workspaceShellCacheKey({html:'x',assetPaths:['/private/cv.json'],readAsset:()=>''}),
  /Unexpected public cache path/,'only emitted public sources may enter this cache identity');
});

test('Add/Remove summary cards detect exact selected wording and preserve unrelated text',()=>{
 const one='Reliable cleaning professional with excellent attention to detail.';
 const two='Detail-focused cleaner who maintains safe and tidy workspaces.';
 const draft='My own introduction.';
 assert.equal(hasSuggestedSummary(draft,one),false);
 assert.equal(hasSuggestedSummary(one,one),true);
 assert.equal(removeSuggestedSummary(one,one),'');
 const combined=draft+' '+one+' '+two;
 assert.equal(hasSuggestedSummary(combined,one),true);
 assert.equal(hasSuggestedSummary(combined,two),true);
 assert.equal(removeSuggestedSummary(combined,one),draft+' '+two);
 assert.equal(removeSuggestedSummary(combined,two),draft+' '+one);
 assert.equal(removeSuggestedSummary(draft,one),null,'unselected examples must never erase user text');
 assert.equal(hasSuggestedSummary('Some '+one+'extra',one),false,'partial word is not a selected card');
 assert.equal(removeSuggestedSummary('Some '+one+'extra',one),null);
});
test('Add/Remove duty cards remove only one complete matching responsibility line',()=>{
 const a='Maintained safe cleaning supplies.';
 const b='Completed daily cleaning checklists.';
 const doc='Prepared the area.\\n'+a+'\\n'+b;
 assert.equal(hasSuggestedDuty(doc,a),true);
 assert.equal(hasSuggestedDuty(doc,'Cleaned windows.'),false);
 assert.equal(removeSuggestedDuty(doc,a),'Prepared the area.\\n'+b);
 assert.equal(removeSuggestedDuty(doc,b),'Prepared the area.\\n'+a);
 assert.equal(removeSuggestedDuty(doc,'cleaning'),null);
 assert.equal(removeSuggestedDuty('Prepared the area.\\n'+a+' with a supervisor.',a),null,
  'edited duty must not be silently removed');
 assert.equal(hasSuggestedDuty('• '+a,a),true);
});
