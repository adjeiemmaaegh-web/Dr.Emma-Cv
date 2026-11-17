import test from 'node:test';
import assert from 'node:assert/strict';
import {assessStorageHealth,collectStorageSignals,installState,connectivityMessage,backupReminder} from '../../src/features/pwa-ui/status.mjs';
import {createUpdateManager} from '../../src/features/pwa-ui/update-manager.mjs';
import {createPortablePackage,reviewPortablePackage,approvePortablePackage,createFeedbackBundle,findSecretPaths} from '../../src/features/pwa-ui/portable.mjs';
import {createCareerProfile} from '../../src/domain/profile/career-profile.mjs';
import * as D from '../../src/features/career/index.mjs';
const NOW='2026-11-17T10:00:00.000Z';
const profile=()=>createCareerProfile({id:'profileABC123',now:NOW,idFactory:()=> 'masterABC123'});
const MB=1048576;

/* ---------- status ---------- */
test('storage health is honest and escalates: denied, quota error, nearly full, not persisted, file origin',()=>{
 assert.equal(assessStorageHealth({estimate:{usage:5*MB,quota:500*MB},persisted:true,storageWritable:true,protocol:'https:'}).level,'ok');
 const denied=assessStorageHealth({storageWritable:false});assert.equal(denied.level,'critical');assert(denied.items[0].action==='export-backup'&&/blocking storage/.test(denied.items[0].message));
 const q=assessStorageHealth({lastWriteError:'QUOTA'});assert(/out of space.*backup/i.test(q.items[0].message)&&q.level==='critical');
 assert.equal(assessStorageHealth({estimate:{usage:96,quota:100}}).level,'critical');
 assert.equal(assessStorageHealth({estimate:{usage:85,quota:100}}).level,'warning');
 const np=assessStorageHealth({persisted:false});assert(np.items.some(i=>i.action==='request-persist')&&/backup is the only real protection/.test(np.items.find(i=>i.kind==='persistence').message));
 const f=assessStorageHealth({protocol:'file:'});assert(f.level==='warning'&&/exact file location/.test(f.items.find(i=>i.kind==='file-origin').message));
 assert(assessStorageHealth({}).items.some(i=>i.level==='unknown'));
 assert(!assessStorageHealth({persisted:true}).items.some(i=>/guarantee/i.test(i.message)),'never promises permanence');
});
test('signal collection survives missing or throwing browser APIs',async()=>{
 assert.deepEqual(await collectStorageSignals({}),{protocol:undefined});
 const s=await collectStorageSignals({navigator:{storage:{estimate:async()=>{throw new Error('x');},persisted:async()=>true}},location:{protocol:'https:'},localStorage:{setItem(){throw new DOMException('full','QuotaExceededError');},removeItem(){}}});
 assert.deepEqual([s.persisted,s.storageWritable,s.estimate],[true,false,undefined]);
 const ok=await collectStorageSignals({localStorage:{setItem(){},removeItem(){}},navigator:{storage:{estimate:async()=>({usage:1,quota:2})}}});assert.equal(ok.storageWritable,true);assert.equal(ok.estimate.quota,2);
});
test('install, offline and backup wording never overclaim',()=>{
 assert.equal(installState({protocol:'file:',isSecureContext:false}).mode,'file');assert(/cannot be installed/.test(installState({protocol:'file:'}).message));
 assert.equal(installState({protocol:'https:',isSecureContext:true,standalone:true}).mode,'installed');
 assert.equal(installState({protocol:'https:',isSecureContext:true,serviceWorker:true,promptAvailable:true}).canPrompt,true);
 assert.equal(installState({protocol:'http:',isSecureContext:false}).mode,'unsupported');
 assert.equal(installState({protocol:'https:',isSecureContext:true,serviceWorker:true}).mode,'browser-only');
 assert(/appear to be offline/.test(connectivityMessage({online:false,offlineReady:true}).message));
 assert(/has not finished/.test(connectivityMessage({online:true,offlineReady:false}).message));
 assert.equal(backupReminder({optedIn:false,now:1e12}).due,false,'no nagging without opt-in');
 assert.equal(backupReminder({optedIn:true}).due,true);
 const day=864e5,now=Date.parse(NOW);
 assert.equal(backupReminder({optedIn:true,lastBackupAt:now-20*day,now}).due,true);
 assert.equal(backupReminder({optedIn:true,lastBackupAt:now-20*day,now,changedSinceBackup:false}).due,false);
 assert.equal(backupReminder({optedIn:true,lastBackupAt:now-3*day,now}).due,false);
});

/* ---------- update manager ---------- */
function fakeEnv({waiting=true,controller=true}={}){
 const reg=new EventTarget();reg.waiting=waiting?{posted:[],postMessage(m){this.posted.push(m);}}:null;reg.installing=null;reg.update=async()=>{};
 const sw=new EventTarget();sw.controller=controller?{}:null;return {reg,sw};
}
test('updates apply only on user request, never over unsaved work, and reload exactly once',()=>{
 const {reg,sw}=fakeEnv(),events=[];let reloads=0,dirty=true;
 const um=createUpdateManager({registration:reg,serviceWorker:sw,hasUnsavedWork:()=>dirty,onChange:s=>events.push(s.status),reload:()=>reloads++});
 assert.equal(um.getState().status,'available');assert.equal(reg.waiting.posted.length,0,'nothing is activated automatically');
 assert.deepEqual(um.apply(),{ok:false,reason:'unsaved'});assert.equal(um.getState().blockedReason,'unsaved');assert.equal(reg.waiting.posted.length,0);
 sw.dispatchEvent(new Event('controllerchange'));assert.equal(reloads,0,'foreign controller change must not reload');
 um.later();assert.equal(um.getState().status,'deferred');
 assert.deepEqual(um.apply(),{ok:false,reason:'no-update'},'deferred update needs it to be offered again');
 const {reg:r2,sw:s2}=fakeEnv(),u2=createUpdateManager({registration:r2,serviceWorker:s2,hasUnsavedWork:()=>false,reload:()=>reloads++});
 assert.deepEqual(u2.apply(),{ok:true});assert.deepEqual(r2.waiting.posted,[{type:'SKIP_WAITING'}]);
 s2.dispatchEvent(new Event('controllerchange'));s2.dispatchEvent(new Event('controllerchange'));assert.equal(reloads,1);
});
test('first install (no controller yet) is not offered as an update; updatefound surfaces a new worker',()=>{
 const {reg,sw}=fakeEnv({waiting:false,controller:true}),seen=[];
 const um=createUpdateManager({registration:reg,serviceWorker:sw,onChange:s=>seen.push(s.status)});
 assert.equal(um.getState().status,'idle');
 const w=new EventTarget();w.state='installing';reg.installing=w;reg.dispatchEvent(new Event('updatefound'));
 reg.waiting={postMessage(){}};w.state='installed';w.dispatchEvent(new Event('statechange'));
 assert.equal(um.getState().status,'available');
 const first=createUpdateManager({registration:fakeEnv({waiting:true,controller:false}).reg,serviceWorker:fakeEnv({controller:false}).sw});assert.equal(first.getState().status,'idle');
});

/* ---------- portable package ---------- */
const SECTIONS=()=>({profile:profile(),applications:D.tracker.addApplication(D.tracker.emptyBook(),{company:'Acme',role:'Manager',expectedRevision:0,now:NOW,idFactory:()=> 'appAAAA0001'}),
 letters:[],interview:D.emptySession({id:'sessionAAA01'}),settings:{locale:'en',paper:'A4'}});
test('portable package round-trips with per-section integrity and is review-first',async()=>{
 const text=await createPortablePackage(SECTIONS(),{now:NOW,appVersion:'0.31.0'});
 const rv=await reviewPortablePackage(text,{current:{}});
 assert.equal(rv.status,'review-required');assert.deepEqual([rv.summary.profile.name,rv.summary.applications.count,rv.summary.interview.stories,rv.summary.settings.keys],['My career profile',1,0,2]);
 assert.throws(()=>approvePortablePackage(rv,{}),e=>e.code==='UNCONFIRMED');
 const out=approvePortablePackage(rv,{confirmed:true});assert.deepEqual(Object.keys(out).sort(),['applications','interview','letters','profile','settings']);
 assert.deepEqual(out.profile,SECTIONS().profile);
 assert.deepEqual(Object.keys(approvePortablePackage(rv,{confirmed:true,sections:['settings']})),['settings']);
 assert.throws(()=>approvePortablePackage(rv,{confirmed:true,sections:['nope']}),e=>e.code==='INVALID');
 assert.equal(Buffer.from(text).includes('verifiedBy'),false===true);
});
test('tampered, damaged or foreign packages are blocked; conflicts need an explicit decision',async()=>{
 const text=await createPortablePackage(SECTIONS(),{now:NOW}),d=JSON.parse(text);
 const tampered=JSON.parse(text);tampered.payload.settings=JSON.stringify({locale:'fr'});
 const r1=await reviewPortablePackage(JSON.stringify(tampered));assert.equal(r1.status,'blocked');assert(/integrity/.test(r1.warnings[0]));
 for(const bad of ['nope','{}',JSON.stringify({...d,version:2}),JSON.stringify({...d,kind:'other'}),'x'.repeat(17*MB)])assert.equal((await reviewPortablePackage(bad)).status,'blocked');
 const rv=await reviewPortablePackage(text,{current:{profile:profile(),applications:SECTIONS().applications}});
 assert(rv.conflicts.some(c=>c.section==='profile')&&rv.conflicts.some(c=>c.section==='applications'));
 assert.throws(()=>approvePortablePackage(rv,{confirmed:true}),/conflicts with existing data/);
 assert(approvePortablePackage(rv,{confirmed:true,sections:['settings','interview']}).settings,'non-conflicting sections can go ahead');
 assert(approvePortablePackage(rv,{confirmed:true,replaceConflicts:true}).profile);
 const bad=JSON.parse(text);bad.payload.profile=JSON.stringify({...profile(),schemaVersion:9});bad.manifest.profile.sha256=await (async()=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bad.payload.profile)))].map(x=>x.toString(16).padStart(2,'0')).join(''))();
 assert(/invalid/i.test((await reviewPortablePackage(JSON.stringify(bad))).warnings[0]),'valid checksum but invalid content is still blocked');
});
test('credentials are never exported or imported',async()=>{
 const s=SECTIONS();s.settings={locale:'en',aiProvider:{apiKey:'sk-live-12345678'}};
 await assert.rejects(()=>createPortablePackage(s),/credentials.*apiKey/);
 assert.deepEqual(findSecretPaths({a:{password:'x',b:[{Authorization:'Bearer z'}]},ok:1}),['$.a.password','$.a.b.0.Authorization']);
 assert.deepEqual(findSecretPaths({token:''}),[],'empty values are not secrets');
 const text=await createPortablePackage(SECTIONS(),{now:NOW}),d=JSON.parse(text);
 d.payload.settings=JSON.stringify({apiKey:'sk-live-12345678'});d.manifest.settings.sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(d.payload.settings)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 assert(/credentials/.test((await reviewPortablePackage(JSON.stringify(d))).warnings[0]));
 await assert.rejects(()=>createPortablePackage({}),e=>e.code==='INVALID');
 await assert.rejects(()=>createPortablePackage({bogus:1}),e=>e.code==='INVALID');
});
test('feedback bundle is local, allow-listed and warns about personal data',()=>{
 const f=createFeedbackBundle({message:'The save button did nothing.',includeDiagnostics:true,now:NOW,
  diagnostics:{appVersion:'0.31',browser:'Chrome 130',viewport:'390x844',cv:{secret:'my CV'},email:'a@b.co',storageLevel:'ok'}});
 assert.deepEqual(f.includedDiagnostics,['appVersion','browser','viewport','storageLevel']);assert(!f.text.includes('a@b.co')&&!f.text.includes('my CV'));
 assert(/has not been sent anywhere/.test(f.notice));assert.equal(f.filename,'ledger-feedback-2026-11-17.txt');
 assert.equal(createFeedbackBundle({message:'hi'}).includedDiagnostics.length,0);
 assert(createFeedbackBundle({message:'Call me on +44 20 7946 0000 or ada@example.test'}).warnings.length===1);
 assert.throws(()=>createFeedbackBundle({message:'  '}),e=>e.code==='INVALID');assert.throws(()=>createFeedbackBundle({message:'x'.repeat(4001)}),e=>e.code==='INVALID');
 const saved=globalThis.fetch;globalThis.fetch=()=>{throw new Error('network');};try{createFeedbackBundle({message:'ok'});}finally{globalThis.fetch=saved;}
});
