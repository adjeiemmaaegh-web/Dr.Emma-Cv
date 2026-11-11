/* E20 career calendar import: bounded, inert .ics parser. No network or storage. */
(function(global){
 'use strict';
 const MAX_BYTES=1024*1024,MAX_LINES=12000,MAX_EVENTS=300;
 const textValue=v=>String(v).replace(/\\([nN,;\\])/g,(_,a)=>a==='n'||a==='N'?'\n':a);
 const day=v=>{
  if(!/^\d{8}$/.test(v))return null;
  const iso=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8);
  try{global.ledgerE3Core.date(iso);return iso}catch{return null}
 };
 // E24: all calendar parsing remains local. Support unambiguous IANA TZID
 // values from ordinary exported invitations; never invent a timezone offset.
 const MAX_ZONE_CACHE=20;
 const zoneFormatters=new Map();
 const pad2=n=>String(n).padStart(2,'0');
 const deviceDate=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 function zoneClock(date,formatter){
  const parts=Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  return [parts.year,parts.month,parts.day,parts.hour,parts.minute,parts.second];
 }
 function zonedDate(iso,hh,mm,ss,zone){
  let formatter=zoneFormatters.get(zone);
  if(!formatter){
   if(zoneFormatters.size>=MAX_ZONE_CACHE)return {skip:'too many different time zones in the calendar'};
   try{
    formatter=new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn',{
     timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
     hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
    });
    formatter.formatToParts(new Date());
   }catch{return {skip:'unsupported named time zone; manually review this event'}}
   zoneFormatters.set(zone,formatter);
  }
  const naive=Date.parse(iso+'T'+pad2(hh)+':'+pad2(mm)+':'+pad2(ss)+'Z');
  const expected=[...iso.split('-').map(Number),hh,mm,ss];
  const candidates=new Set();
  // Observe offsets on both sides of any nearby daylight-saving transition.
  // A repeated wall time is intentionally skipped, not guessed.
  for(const probe of [naive-86400000,naive,naive+86400000]){
   const observed=zoneClock(new Date(probe),formatter);
   if(observed.some(n=>!Number.isInteger(n)))return {skip:'time zone clock unavailable'};
   const offset=Date.UTC(observed[0],observed[1]-1,observed[2],observed[3],observed[4],observed[5])-probe;
   const instant=naive-offset;
   if(zoneClock(new Date(instant),formatter).every((n,i)=>n===expected[i]))candidates.add(instant);
  }
  if(candidates.size!==1)return {skip:candidates.size?'ambiguous local time during daylight-saving transition':'invalid local time in named time zone'};
  return {date:deviceDate(new Date([...candidates][0])),
   notice:'Named time zone '+zone+' was converted to this device’s local date; the exact appointment time is not saved'};
 }
 function startDate(property){
  const colon=property.indexOf(':');
  if(colon<0)return {skip:'malformed start date'};
  const head=property.slice(0,colon).split(';'),value=property.slice(colon+1);
  if(head.shift().toUpperCase()!=='DTSTART')return {skip:'missing start date'};
  let dateType='',zone='';const used=new Set();
  for(const item of head){
   const equals=item.indexOf('=');
   if(equals<1)return {skip:'unsupported start-date property'};
   const name=item.slice(0,equals).toUpperCase(),raw=item.slice(equals+1);
   if(used.has(name))return {skip:'duplicate start-date parameter'};
   used.add(name);
   if(name==='VALUE')dateType=raw.toUpperCase();
   else if(name==='TZID')zone=/^"[^"\r\n]{1,100}"$/.test(raw)?raw.slice(1,-1):raw;
   else return {skip:'unsupported start-date parameter'};
  }
  if(dateType&&!['DATE','DATE-TIME'].includes(dateType))return {skip:'unsupported calendar date type'};
  if(/^[0-9]{8}$/.test(value)&&dateType!=='DATE-TIME'&&!zone){
   const iso=day(value);return iso?{date:iso}:{skip:'invalid calendar date'};
  }
  if(dateType==='DATE'||!/^\d{8}T\d{6}Z?$/.test(value))return {skip:'unsupported or missing start date'};
  const iso=day(value.slice(0,8)),hh=+value.slice(9,11),mm=+value.slice(11,13),ss=+value.slice(13,15);
  if(!iso||hh>23||mm>59||ss>59)return {skip:'invalid calendar date or time'};
  if(value.endsWith('Z')){
   if(zone)return {skip:'UTC start date cannot also specify a named time zone'};
   const utc=new Date(iso+'T'+pad2(hh)+':'+pad2(mm)+':'+pad2(ss)+'Z');
   return {date:deviceDate(utc),notice:'UTC appointment converted to this device’s local date; exact time not saved'};
  }
  if(zone){
   if(!/^[A-Za-z0-9_+./-]{1,100}$/.test(zone))return {skip:'unsupported named time zone'};
   return zonedDate(iso,hh,mm,ss,zone);
  }
  return {date:iso,notice:'floating local time — date used as written; exact time not saved'};
 }
 function parse(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Calendar file exceeds the 1 MB limit');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw))throw Error('Calendar file contains control characters');
  if(/\r(?!\n)/.test(raw))throw Error('Calendar lines must use LF or CRLF');
  // E23: tolerate a UTF-8 BOM only at the start of an imported calendar.
  // The original byte-size and control-character checks still run first.
  if(raw.charCodeAt(0)===0xFEFF)raw=raw.slice(1);
  const physical=raw.replace(/\r\n/g,'\n').split('\n');
  if(physical.length>MAX_LINES)throw Error('Too many calendar lines');
  const lines=[];
  for(const line of physical){
   if(line.length>5000)throw Error('Calendar line is too long');
   if(/^[ \t]/.test(line)){
    if(!lines.length)throw Error('Calendar starts with an orphan fold');
    lines[lines.length-1]+=line.slice(1);
   }else if(line)lines.push(line);
   if(lines.at(-1)?.length>5000)throw Error('Unfolded calendar line is too long');
  }
  if(lines[0]!=='BEGIN:VCALENDAR'||lines.at(-1)!=='END:VCALENDAR')throw Error('Expected a complete VCALENDAR file');
  const stack=[],events=[],warnings=[],uids=new Set();let rows=null,seenCalendar=0,rawEvents=0,cancelledCalendar=false;
  const warn=(message)=>{if(warnings.length<60)warnings.push(message)};
  function event(rows,index){
   const props=new Map();
   for(const row of rows){const colon=row.indexOf(':');if(colon<1)continue;
    const k=row.slice(0,colon).split(';')[0].toUpperCase();
    if(!props.has(k))props.set(k,[]);props.get(k).push(row);
   }
   const get=k=>props.get(k)?.[0]?.slice(props.get(k)[0].indexOf(':')+1)||'';
   const once=k=>!props.has(k)||props.get(k).length===1;
   if(['UID','SUMMARY','DTSTART'].some(k=>!once(k))){warn('Event '+index+': duplicate required field');return}
   if(['RRULE','RDATE','EXDATE','RECURRENCE-ID'].some(k=>props.has(k))){warn('Event '+index+': recurring event skipped (no recurrence expansion)');return}
   if(get('STATUS').toUpperCase()==='CANCELLED'){warn('Event '+index+': cancelled event skipped');return}
   const uid=textValue(get('UID')).trim();
   if(!uid||uid.length>250){warn('Event '+index+': missing or overlong UID');return}
   if(uids.has(uid)){warn('Event '+index+': duplicate UID skipped');return}
   uids.add(uid);
   const title=textValue(get('SUMMARY')).replace(/[\r\n]+/g,' ').trim();
   if(!title||title.length>220){warn('Event '+index+': missing or overlong summary');return}
   const start=props.get('DTSTART')?.[0];
   const d=start?startDate(start):{skip:'missing start date'};
   if(d.skip){warn('Event '+index+': '+d.skip);return}
   if(d.notice)warn('Event '+index+': '+d.notice);
   const description=textValue(get('DESCRIPTION')).trim();
   if(description.length>800)warn('Event '+index+': description shortened to 800 characters');
   events.push({uid,date:d.date,title,description:description.slice(0,800)});
  }
  for(const line of lines){
   // E23: cancellation notices must not become new career follow-up tasks.
   if(stack.length===1&&stack[0]==='VCALENDAR'&&line.toUpperCase()==='METHOD:CANCEL')cancelledCalendar=true;
   if(line.startsWith('BEGIN:')){
    const kind=line.slice(6).toUpperCase();
    if(!stack.length){if(kind!=='VCALENDAR'||++seenCalendar!==1)throw Error('Invalid calendar envelope')}
    if(kind==='VEVENT'){
     if(stack.length!==1||stack[0]!=='VCALENDAR')throw Error('Nested or misplaced VEVENT');
     if(++rawEvents>MAX_EVENTS)throw Error('Too many calendar events');
     rows=[];
    }
    stack.push(kind);if(stack.length>8)throw Error('Calendar nesting is too deep');
    continue;
   }
   if(line.startsWith('END:')){
    const kind=line.slice(4).toUpperCase();
    if(stack.pop()!==kind)throw Error('Mismatched calendar component');
    if(kind==='VEVENT'){event(rows,rawEvents);rows=null}
    continue;
   }
   if(stack.at(-1)==='VEVENT')rows.push(line);
  }
  if(stack.length||seenCalendar!==1)throw Error('Unclosed calendar component');
  if(cancelledCalendar){
   warnings.unshift('Calendar-wide METHOD:CANCEL notice: no events were imported as new tasks');
   if(warnings.length>60)warnings.pop();
   return {events:[],warnings,scanned:rawEvents,skipped:rawEvents};
  }
  return {events,warnings,scanned:rawEvents,skipped:rawEvents-events.length};
 }
 // Stable 128-bit non-cryptographic event identifier for idempotent imports.
 // A collision causes a skip, never replacement of an existing task.
 function taskId(uid){let a=0xcbf29ce484222325n,b=0x84222325cbf29cen,prime=0x100000001b3n,mask=(1n<<64n)-1n;
  for(const cp of uid){const v=BigInt(cp.codePointAt(0));a=((a^v)*prime)&mask;b=((b^(v+7n))*prime)&mask}
  return 'e3ics_'+a.toString(16).padStart(16,'0')+b.toString(16).padStart(16,'0');
 }
 function merge(store,events,selected,now){
  const C=global.ledgerE3Core;
  if(!C?.validateStore)throw Error('Career validator unavailable');
  const base=C.validateStore(store),chosen=new Set(selected);
  if(!Array.isArray(events)||!Array.isArray(selected)||events.length>MAX_EVENTS)throw Error('Invalid calendar selection');
  const existing=new Set(base.tasks.map(t=>t.id));let added=0,skipped=0;
  const tasks=[...base.tasks];
  for(let i=0;i<events.length;i++){
   if(!chosen.has(i))continue;
   const e=events[i],id=taskId(e.uid);
   if(existing.has(id)){skipped++;continue}
   const note='Imported from a local calendar file. '+e.description;
   tasks.push({id,title:e.title,due:e.date,notes:note.slice(0,1000),applicationId:'',status:'open',createdAt:now,updatedAt:now});
   existing.add(id);added++;
  }
  const next=C.validateStore({...base,revision:base.revision+(added?1:0),tasks});
  return {next,added,skipped};
 }
 global.ledgerE20Calendar={parse,merge,taskId};
})(typeof window!=='undefined'?window:globalThis);

