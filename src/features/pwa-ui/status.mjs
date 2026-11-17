/**
 * Group E Stage 18: honest storage / install / offline / backup status. Pure functions over injected signals.
 * The service worker, cache and build belong to Group A; this only reports and asks.
 */
const MB=1024*1024;
const fmt=b=>b>=1024*MB?(b/1024/MB).toFixed(1)+' GB':(b/MB).toFixed(b>=10*MB?0:1)+' MB';
/** signals: {estimate?:{usage,quota}, persisted?:boolean|null, storageWritable?:boolean, lastWriteError?:'QUOTA'|'UNAVAILABLE'|'CORRUPT'|null, protocol?:string} */
export function assessStorageHealth(sig={}){
 const items=[];let level='ok';
 const raise=l=>{if(l==='critical'||(l==='warning'&&level==='ok'))level=l;};
 if(sig.storageWritable===false){items.push({kind:'unavailable',level:'critical',message:'This browser is blocking storage, so nothing you do can be saved here (private browsing or blocked site data are common causes).',action:'export-backup'});raise('critical');}
 if(sig.lastWriteError==='QUOTA'){items.push({kind:'quota-error',level:'critical',message:'Your last change could not be saved because the browser is out of space. Download a backup now before closing this page.',action:'export-backup'});raise('critical');}
 else if(sig.lastWriteError){items.push({kind:'write-error',level:'critical',message:'Your last change may not have been saved ('+sig.lastWriteError.toLowerCase()+'). Download a backup now.',action:'export-backup'});raise('critical');}
 const e=sig.estimate;
 if(e&&e.quota>0&&Number.isFinite(e.usage)){
  const pct=e.usage/e.quota*100;
  if(pct>=95){items.push({kind:'space',level:'critical',message:'Browser storage is almost full ('+fmt(e.usage)+' of '+fmt(e.quota)+').',action:'export-backup'});raise('critical');}
  else if(pct>=80){items.push({kind:'space',level:'warning',message:'Browser storage is getting full ('+fmt(e.usage)+' of '+fmt(e.quota)+').',action:'export-backup'});raise('warning');}
  else items.push({kind:'space',level:'ok',message:'Using '+fmt(e.usage)+' of about '+fmt(e.quota)+' available.'});
 }else items.push({kind:'space',level:'unknown',message:'Your browser does not report how much storage is left.'});
 if(sig.persisted===false){items.push({kind:'persistence',level:'warning',message:'Your browser may delete this data if the device runs low on space. You can ask it to keep the data, but a backup is the only real protection.',action:'request-persist'});raise('warning');}
 else if(sig.persisted===true)items.push({kind:'persistence',level:'ok',message:'Your browser has agreed to keep this data.'});
 if(sig.protocol==='file:'){items.push({kind:'file-origin',level:'warning',message:'You opened this as a file. Saved data belongs to this exact file location: moving, renaming or opening it from another folder will look empty. Download a backup before moving it.',action:'export-backup'});raise('warning');}
 return {level,items,summary:level==='ok'?'Storage looks healthy.':level==='warning'?'Storage needs attention.':'Action needed to avoid losing work.'};
}
/** Gathers signals defensively; every probe may be missing or throw. */
export async function collectStorageSignals({navigator:nav,location:loc,localStorage:ls}={}){
 const out={protocol:loc?.protocol};
 try{if(nav?.storage?.estimate)out.estimate=await nav.storage.estimate();}catch{}
 try{if(nav?.storage?.persisted)out.persisted=await nav.storage.persisted();}catch{}
 try{if(ls){const k='__ledger_probe__';ls.setItem(k,'1');ls.removeItem(k);out.storageWritable=true;}}catch{out.storageWritable=false;}
 return out;
}
/** Install status: never claims a file can be installed. */
export function installState({protocol,isSecureContext,standalone,serviceWorker,promptAvailable}={}){
 if(protocol==='file:')return {mode:'file',canPrompt:false,message:'Opened as a file: it works offline, but it cannot be installed as an app. Use the hosted website to install.'};
 if(standalone)return {mode:'installed',canPrompt:false,message:'Running as an installed app.'};
 if(!isSecureContext||!serviceWorker)return {mode:'unsupported',canPrompt:false,message:'This browser or address cannot install the app or keep it available offline.'};
 if(promptAvailable)return {mode:'installable',canPrompt:true,message:'You can install this app on your device. It will open like a normal app and work offline.'};
 return {mode:'browser-only',canPrompt:false,message:'Use your browser menu ("Install" or "Add to Home Screen") if you want an app icon. Some browsers do not offer it.'};
}
/** navigator.onLine is unreliable; wording stays honest. */
export function connectivityMessage({online,offlineReady}={}){
 if(online===false)return {state:'offline',message:'You appear to be offline. '+(offlineReady?'Everything you saved stays on this device and the app keeps working.':'Saved work stays on this device, but parts of the app may not load until you reconnect.')};
 return {state:'online',message:offlineReady?'The app is saved on this device and will also work offline.':'The app has not finished saving itself for offline use yet.'};
}
/** Opt-in only. Never nags a user who has not opted in. */
export function backupReminder({optedIn=false,lastBackupAt,now=Date.now(),intervalDays=14,changedSinceBackup=true}={}){
 if(!optedIn)return {due:false,message:'',optedIn:false};
 const last=Number.isFinite(lastBackupAt)?lastBackupAt:null;
 if(last===null)return {due:true,optedIn:true,message:'You have not downloaded a backup yet.'};
 const days=Math.floor((now-last)/864e5);
 if(days>=intervalDays&&changedSinceBackup)return {due:true,optedIn:true,message:'Your last backup was '+days+' days ago and you have made changes since.'};
 return {due:false,optedIn:true,message:'Last backup: '+days+' day'+(days===1?'':'s')+' ago.'};
}
