import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const base=load('development/e22/Ledger_CV_Studio_E22_Monogram_Print_Pagination.html');
const candidate=load('development/e23/Ledger_CV_Studio_E23_Calendar_Import_Safety.html');
const patches=JSON.parse(load('development/e23/source/calendar_patch.json'));

function importer(html){
 const start=html.indexOf('/* E20 career calendar import:');
 const end=html.indexOf('/* E3 career workspace.',start);
 assert(start>=0&&end>start,'Calendar source region missing');
 const sandbox={TextEncoder,ledgerE3Core:{
  date(v){const d=new Date(v+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('Invalid date');return v;},
  validateStore(s){if(!s||!Array.isArray(s.tasks)||!Array.isArray(s.records)||!Number.isSafeInteger(s.revision))throw Error('Invalid career store');return structuredClone(s);}
 }};
 vm.runInNewContext(html.slice(start,end),sandbox,{timeout:5000});
 assert(sandbox.ledgerE20Calendar,'Expected calendar parser');
 return sandbox.ledgerE20Calendar;
}
const e22=importer(base),e23=importer(candidate);
const invitation=(uid='synthetic-fixture-001')=>[
 'BEGIN:VEVENT','UID:'+uid,'DTSTART;VALUE=DATE:20261116',
 'SUMMARY:Interview follow-up','DESCRIPTION:Public synthetic test text','END:VEVENT'
];
const calendar=(extra=[],endExtra=[])=>[
 'BEGIN:VCALENDAR','VERSION:2.0',...extra,...invitation(),...endExtra,'END:VCALENDAR'
].join('\r\n');

test('E23 is exactly the four documented changes applied to frozen E22',()=>{
 let result=base;
 assert.equal(patches.length,4);
 for(const p of patches){assert.equal(result.split(p.find).length,2,p.id);result=result.replace(p.find,p.replace);}
 assert.equal(candidate,result);
 assert.equal(candidate.slice(0,1000),base.slice(0,1000));
});
test('UTF-8 BOM in common Windows exports was rejected by E22 and now imports',()=>{
 const sample='\uFEFF'+calendar();
 assert.throws(()=>e22.parse(sample),/VCALENDAR/);
 const parsed=e23.parse(sample);
 assert.equal(parsed.events.length,1);
 assert.equal(parsed.events[0].title,'Interview follow-up');
 assert.equal(parsed.events[0].date,'2026-11-16');
});
test('plain, folded and case-variant valid calendars still work',()=>{
 assert.equal(e23.parse(calendar()).events.length,1);
 const folded=calendar().replace('SUMMARY:Interview follow-up','SUMMARY:Interview follow-\r\n up');
 assert.equal(e23.parse(folded).events[0].title,'Interview follow-up');
 const lower='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nMETHOD:REQUEST\r\n'+invitation().join('\r\n')+'\r\nEND:VCALENDAR';
 assert.equal(e23.parse(lower).events.length,1);
});
test('calendar-wide METHOD:CANCEL never creates new tasks',()=>{
 const cancelled=calendar(['METHOD:CANCEL']);
 assert.equal(e22.parse(cancelled).events.length,1,'reproduces prior incorrect acceptance');
 const parsed=e23.parse(cancelled);
 assert.equal(parsed.events.length,0);
 assert.equal(parsed.scanned,1);
 assert.equal(parsed.skipped,1);
 assert.match(parsed.warnings.join(' '),/METHOD:CANCEL/);
});
test('METHOD:CANCEL after a VEVENT is still respected',()=>{
 const parsed=e23.parse(calendar([],['METHOD:CANCEL']));
 assert.equal(parsed.events.length,0);
 assert.equal(parsed.skipped,1);
});
test('only top-level METHOD:CANCEL cancels a calendar',()=>{
 const falseAlarm=calendar(['METHOD:REQUEST']).replace('DESCRIPTION:Public synthetic test text','DESCRIPTION:METHOD:CANCEL was typed in notes');
 assert.equal(e23.parse(falseAlarm).events.length,1);
 const insideEvent=calendar().replace('SUMMARY:Interview follow-up','METHOD:CANCEL\r\nSUMMARY:Interview follow-up');
 assert.equal(e23.parse(insideEvent).events.length,1);
});
test('individual STATUS:CANCELLED is still ignored',()=>{
 const source=calendar().replace('SUMMARY:Interview follow-up','STATUS:CANCELLED\r\nSUMMARY:Interview follow-up');
 assert.equal(e23.parse(source).events.length,0);
});
test('BOM does not weaken strict size, control, or calendar envelope limits',()=>{
 assert.throws(()=>e23.parse('\uFEFF'+'A'.repeat(1024*1024)),/1 MB/);
 assert.throws(()=>e23.parse('\uFEFF'+calendar()+'\0'),/control/);
 assert.throws(()=>e23.parse('\uFEFFNOT A CALENDAR'),/VCALENDAR/);
});
test('valid event merge is deterministic and does not mutate the original store',()=>{
 const parsed=e23.parse(calendar());
 const original={format:'ledger-career-store',version:1,revision:0,records:[],tasks:[]};
 const snapshot=JSON.stringify(original);
 const first=e23.merge(original,parsed.events,[0],'2026-11-11T08:00:00.000Z');
 assert.equal(first.added,1);
 assert.equal(first.next.tasks[0].due,'2026-11-16');
 const repeat=e23.merge(first.next,parsed.events,[0],'2026-11-11T08:00:00.000Z');
 assert.equal(repeat.added,0);
 assert.equal(repeat.skipped,1);
 assert.equal(JSON.stringify(original),snapshot);
});
