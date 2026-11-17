/**
 * Group E FeatureModule 'pwa-status': storage health, install, offline, safe update and backup reminders in one accessible panel.
 * services: env {navigator,location,localStorage,isSecureContext,standalone}, backup {export():Promise<void>},
 *   backupState {lastBackupAt,changedSinceBackup,optedIn,setOptedIn(bool)}, updateManager (optional), install {promptAvailable:boolean, prompt():Promise} (optional),
 *   offlineReady:boolean, lastWriteError:string|null. Writes nothing itself.
 */
import {assessStorageHealth,collectStorageSignals,installState,connectivityMessage,backupReminder} from './status.mjs';
import {createAnnouncer,el,uniqueId} from '../accessibility/a11y.mjs';
export const pwaStatusFeature=Object.freeze({
 id:'pwa-status',dependencies:[],
 async mount({host,services}){
  const root=host?.element??host;if(!root||typeof root.append!=='function')throw new TypeError('DOM host or host.element is required');
  const env=services.env||{};
  const wrap=el('section',{class:'ledger-a11y ledger-pwa','aria-labelledby':'pwa-h'});root.append(wrap);
  const ann=createAnnouncer(root);
  let offUpdate=null;const onOnline=()=>draw(),onOffline=()=>draw();
  async function draw(){
   const signals=await collectStorageSignals(env);signals.lastWriteError=services.lastWriteError||null;
   const health=assessStorageHealth(signals);
   const inst=installState({protocol:env.location?.protocol,isSecureContext:env.isSecureContext,standalone:env.standalone,serviceWorker:!!env.navigator?.serviceWorker,promptAvailable:!!services.install?.promptAvailable});
   const conn=connectivityMessage({online:env.navigator?.onLine,offlineReady:!!services.offlineReady});
   const bs=services.backupState||{},rem=backupReminder({optedIn:!!bs.optedIn,lastBackupAt:bs.lastBackupAt,changedSinceBackup:bs.changedSinceBackup!==false,now:env.now?.()??Date.now()});
   const up=services.updateManager?.getState();
   const sec=(title,...kids)=>{const id=uniqueId('pwa-s');return el('section',{'aria-labelledby':id},el('h3',{id},title),...kids);};
   const backupBtn=()=>el('button',{type:'button',on:{click:async()=>{try{await services.backup.export();ann.announce('Backup downloaded.');}catch(e){ann.announce('The backup could not be created: '+(e?.message||'unknown problem'));}}}},'Download a backup');
   wrap.replaceChildren(el('h2',{id:'pwa-h'},'App and storage'));
   const ul=el('ul',{});for(const i of health.items)ul.append(el('li',{},(i.level==='critical'?'Problem: ':i.level==='warning'?'Warning: ':'')+i.message+' '));
   const hs=sec('Your saved work',el('p',{role:health.level==='critical'?'alert':'status'},health.summary),ul);
   if(health.items.some(i=>i.action==='export-backup')&&services.backup)hs.append(backupBtn());
   if(health.items.some(i=>i.action==='request-persist')&&env.navigator?.storage?.persist)hs.append(el('button',{type:'button',on:{click:async()=>{const ok=await env.navigator.storage.persist();ann.announce(ok?'Your browser agreed to keep your data.':'Your browser did not agree. A backup is the safest protection.');draw();}}},'Ask the browser to keep my data'));
   wrap.append(hs);
   const is=sec('Install',el('p',{},inst.message));
   if(inst.canPrompt&&services.install?.prompt)is.append(el('button',{type:'button',on:{click:async()=>{await services.install.prompt();draw();}}},'Install app'));
   wrap.append(is,sec('Offline',el('p',{},conn.message)));
   if(up&&up.status!=='idle'&&up.status!=='applying'){
    const msg=el('p',{},up.status==='deferred'?'An update is waiting. It will not be applied until you choose.':'An update is ready.');
    const us=sec('Update',msg);
    us.append(el('button',{type:'button',on:{click:()=>{const r=services.updateManager.apply();if(!r.ok&&r.reason==='unsaved'){ann.announce('You have unsaved changes. Save them first, then update.');}draw();}}},'Update now'));
    if(up.status==='available')us.append(el('button',{type:'button',on:{click:()=>{services.updateManager.later();draw();}}},'Remind me later'));
    if(up.blockedReason==='unsaved')us.append(el('p',{class:'ledger-error',role:'alert'},'Save your changes before updating so nothing is lost.'));
    wrap.append(us);
   }else if(up?.status==='applying')wrap.append(sec('Update',el('p',{role:'status'},'Updating. The page will reload in a moment.')));
   if(services.backup){
    const id=uniqueId('pwa-o'),bsec=sec('Backups',el('p',{},rem.optedIn?rem.message:'Backups are the only way to move your work to another browser or recover from a problem.'),backupBtn());
    if(bs.setOptedIn)bsec.append(el('div',{class:'ledger-check'},el('input',{type:'checkbox',id,checked:rem.optedIn||undefined,on:{change:e=>{bs.setOptedIn(e.target.checked);draw();}}}),el('label',{for:id,style:'margin:0;font-weight:400'},'Remind me to download a backup every 2 weeks (only while this app is open)')));
    wrap.append(bsec);
   }
  }
  env.window?.addEventListener?.('online',onOnline);env.window?.addEventListener?.('offline',onOffline);
  if(services.updateManager&&services.onUpdateChange)offUpdate=services.onUpdateChange(()=>draw());
  await draw();
  return ()=>{env.window?.removeEventListener?.('online',onOnline);env.window?.removeEventListener?.('offline',onOffline);offUpdate?.();ann.destroy();wrap.remove();};
 }
});
