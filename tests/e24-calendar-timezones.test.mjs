import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const prior=read('development/e23/Ledger_CV_Studio_E23_Calendar_Import_Safety.html');
const latest=read('development/e24/Ledger_CV_Studio_E24_Offline_Calendar_Timezones.html');
const module=read('src/features/calendar/ics-import.inline.js');

function makeEngine(src){
 const start=src.indexOf('/* E20 career calendar import:');
 const end=src.indexOf('/* E3 career workspace.',start);
 assert(start!==-1&&end>start);
 const s={Intl,Date,TextEncoder,ledgerE3Core:{
   date(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw Error('Invalid date');
    const d=new Date(iso+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==iso)throw Error('Invalid date');return iso},
   validateStore(x){if(!x||!Array.isArray(x.tasks)||!Array.isArray(x.records)||!Number.isSafeInteger(x.revision))throw Error('Invalid career');return structuredClone(x)}
 }};
 vm.runInNewContext(src.slice(start,end),s,{timeout:10000});
 return s.ledgerE20Calendar;
}
const older=makeEngine(prior),fresh=makeEngine(latest);
const event=(dt='DTSTART;VALUE=DATE:20261116',name='Synthetic follow-up',uid='synthetic-e24')=>
 ['BEGIN:VEVENT','UID:'+uid,dt,'SUMMARY:'+name,'END:VEVENT'];
const ics=(items=[event()],header=[])=>['BEGIN:VCALENDAR','VERSION:2.0',...header,...items.flat(),'END:VCALENDAR'].join('\r\n');
const inspect=(data)=>fresh.parse(data);
function withZone(zone,fn){
 const original=process.env.TZ;process.env.TZ=zone;
 try{return fn()}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
}

test('E24 contains only replacement calendar module; prior E23 preserved',()=>{
 const tag='/* E20 career calendar import:',tail='/* E3 career workspace.';
 const a=prior.indexOf(tag),b=prior.indexOf(tail,a);
 assert(a>0&&b>a);
 assert.equal(latest,prior.slice(0,a)+module+prior.slice(b));
 assert.match(module,/E24: all calendar parsing remains local/);
 assert.match(module,/global\.ledgerE20Calendar=\{parse,merge,taskId\}/);
});
test('previous E23 skipped named IANA zone; E24 imports it',()=>withZone('UTC',()=>{
 const sample=ics([event('DTSTART;TZID=America/New_York:20261116T093000')]);
 assert.equal(older.parse(sample).events.length,0);
 const data=inspect(sample);
 assert.equal(data.events.length,1);
 assert.equal(data.events[0].date,'2026-11-16');
 assert.match(data.warnings.join(' '),/exact appointment time is not saved/);
}));
test('accepts quoted and reordered IANA timezone parameters',()=>withZone('UTC',()=>{
 for(const d of [
  'DTSTART;VALUE=DATE-TIME;TZID=America/New_York:20261116T093000',
  'DTSTART;TZID="America/New_York";VALUE=DATE-TIME:20261116T093000',
  'dtstart;tzid=America/New_York:20261116T093000'
 ])assert.equal(inspect(ics([event(d)])).events[0].date,'2026-11-16',d);
}));
test('local day correctly moves backward in a timezone far west of the meeting',()=>withZone('Pacific/Honolulu',()=>{
 const d=inspect(ics([event('DTSTART;TZID=America/New_York:20260101T001500')]));
 assert.equal(d.events[0].date,'2025-12-31');
}));
test('named zone date can move forward for western late-evening meeting',()=>withZone('UTC',()=>{
 const d=inspect(ics([event('DTSTART;TZID=America/Los_Angeles:20261116T234500')]));
 assert.equal(d.events[0].date,'2026-11-17');
}));
test('daylight-saving repeated hour is ambiguous and therefore not guessed',()=>withZone('UTC',()=>{
 const d=inspect(ics([event('DTSTART;TZID=America/New_York:20261101T013000')]));
 assert.equal(d.events.length,0);assert.equal(d.skipped,1);
 assert.match(d.warnings.join(' '),/ambiguous local time/);
}));
test('daylight-saving nonexistent hour is skipped for manual review',()=>withZone('UTC',()=>{
 const d=inspect(ics([event('DTSTART;TZID=America/New_York:20260308T023000')]));
 assert.equal(d.events.length,0);
 assert.match(d.warnings.join(' '),/invalid local time/);
}));
test('unsupported Windows/custom TZID and invalid dates remain review-only',()=>{
 for(const d of [
  'DTSTART;TZID=Eastern Standard Time:20261116T093000',
  'DTSTART;TZID=Unknown/Planet:20261116T093000',
  'DTSTART;TZID=America/New_York:20261316T093000',
  'DTSTART;TZID=America/New_York:20261116T253000',
  'DTSTART;TZID=America/New_York:20261116T093070',
  'DTSTART;TZID=America/New_York;VALUE=DATE:20261116',
  'DTSTART;TZID=America/New_York:20261116T093000Z'
 ]){
  const r=inspect(ics([event(d)]));
  assert.equal(r.events.length,0,d);
  assert.equal(r.skipped,1);
 }
});
test('duplicate parameter and unsupported VALUE type are rejected',()=>{
 for(const d of [
  'DTSTART;TZID=America/New_York;TZID=Europe/London:20261116T093000',
  'DTSTART;VALUE=PERIOD:20261116T093000',
  'DTSTART;X-EXTRA=foo:20261116T093000',
  'DTSTART;VALUE=DATE-TIME:20261116'
 ])assert.equal(inspect(ics([event(d)])).events.length,0,d);
});
test('all-day, floating local, UTC and BOM import still supported',()=>withZone('UTC',()=>{
 for(const d of ['DTSTART:20261116','DTSTART;VALUE=DATE:20261116',
 'DTSTART:20261116T093000','DTSTART;VALUE=DATE-TIME:20261116T093000Z']){
  assert.equal(inspect('\ufeff'+ics([event(d)])).events[0].date,'2026-11-16',d);
 }
}));
test('calendar-wide cancellation and per-event cancellation still cannot become tasks',()=>{
 for(const data of [ics([event()],['METHOD:CANCEL']),ics([[
  'BEGIN:VEVENT','UID:synthetic-x','STATUS:CANCELLED','DTSTART;VALUE=DATE:20261116','SUMMARY:Cancelled','END:VEVENT'
 ]])])assert.equal(inspect(data).events.length,0);
});
test('unknown zone does not force remote lookup or change user career store',()=>{
 const data=inspect(ics([event('DTSTART;TZID=Unknown/Planet:20261116T093000')]));
 assert.equal(data.events.length,0);
 const existing={format:'test',version:1,revision:0,records:[],tasks:[]};
 const before=JSON.stringify(existing);
 const result=fresh.merge(existing,data.events,[], '2026-11-11T08:00:00Z');
 assert.equal(result.added,0);
 assert.equal(JSON.stringify(existing),before);
});
test('resolved IANA event merges idempotently, preserving existing tasks',()=>withZone('UTC',()=>{
 const d=inspect(ics([event('DTSTART;TZID=America/New_York:20261116T093000')]));
 const s={format:'test',version:1,revision:0,records:[],tasks:[{
  id:'existing',title:'Preserved prior task',due:'2026-11-20',notes:'',applicationId:'',status:'open',createdAt:'x',updatedAt:'x'
 }]};
 const copy=JSON.stringify(s);
 const once=fresh.merge(s,d.events,[0],'2026-11-11T08:00:00Z');
 assert.equal(once.added,1);
 assert.equal(once.next.tasks.length,2);
 assert.equal(once.next.tasks[0].id,'existing');
 const twice=fresh.merge(once.next,d.events,[0],'2026-11-11T08:00:00Z');
 assert.equal(twice.added,0);assert.equal(twice.skipped,1);
 assert.equal(JSON.stringify(s),copy);
}));
test('input bounds and unsupported recurrence are retained',()=>{
 assert.throws(()=>inspect('A'.repeat(1024*1024+1)),/1 MB/);
 assert.throws(()=>inspect(ics()+'\0'),/control/);
 const r=inspect(ics([[
 'BEGIN:VEVENT','UID:synthetic-recurring','DTSTART;TZID=America/New_York:20261116T093000',
 'RRULE:FREQ=DAILY;COUNT=5','SUMMARY:Recurring','END:VEVENT'
 ]]));
 assert.equal(r.events.length,0);assert.match(r.warnings.join(' '),/recurring/);
});
test('multiple events import independently, skipping only unknown and ambiguous zones',()=>withZone('UTC',()=>{
 const r=inspect(ics([
  event('DTSTART;TZID=America/New_York:20261116T093000','Supported','good'),
  event('DTSTART;TZID=Invalid/Zone:20261116T093000','Unsupported','bad'),
  event('DTSTART;TZID=America/New_York:20261101T013000','Ambiguous','fold'),
 ]));
 assert.equal(r.events.length,1);
 assert.equal(r.scanned,3);
 assert.equal(r.skipped,2);
 assert.equal(r.events[0].title,'Supported');
}));
