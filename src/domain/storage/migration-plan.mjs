import { LEGACY_KEYS, parseStoredJSON } from './legacy-inspection.mjs';

/**
 * Produces a read-only, non-destructive snapshot proposal. No writes.
 * The returned plan is designed for preview/export; it is NOT an automatic migration.
 */
const DATA_KEYS=Object.freeze([LEGACY_KEYS.cv,LEGACY_KEYS.recovery,LEGACY_KEYS.applications,LEGACY_KEYS.damaged]);
const MAX_ENTRY_BYTES=8*1024*1024;
function utf8Bytes(text){return new TextEncoder().encode(text).byteLength;}
export function planLegacyMigration(read, {maxEntryBytes=MAX_ENTRY_BYTES}={}) {
  if(typeof read!=='function')throw new TypeError('read must be a function');
  if(!Number.isSafeInteger(maxEntryBytes)||maxEntryBytes<1||maxEntryBytes>MAX_ENTRY_BYTES)throw new RangeError('Invalid limit');
  const entries={};const warnings=[];const versions={};
  let blocked=false;
  for(const key of DATA_KEYS){
    let raw;
    try{raw=read(key);}catch{blocked=true;warnings.push('Storage access failed for '+key);continue;}
    if(raw===null){versions[key]='absent';continue;}
    if(typeof raw!=='string'){blocked=true;warnings.push('Non-string storage value for '+key);continue;}
    if(utf8Bytes(raw)>maxEntryBytes){blocked=true;warnings.push('Entry too large: '+key);continue;}
    const parsed=parseStoredJSON(raw);
    if(key===LEGACY_KEYS.applications&&parsed.ok&&!Array.isArray(parsed.value)){
      blocked=true;warnings.push('Applications data is not an array: '+key);continue;
    }
    // A damaged-primary quarantine is allowed to hold unparseable JSON on purpose.
    if(key!==LEGACY_KEYS.damaged&&!parsed.ok){
      blocked=true;warnings.push('Unreadable or invalid JSON: '+key);continue;
    }
    entries[key]=raw;
    versions[key]=parsed.ok?'parsed':'quarantined';
  }
  if(!Object.hasOwn(entries,LEGACY_KEYS.cv))warnings.push('No valid primary CV state; manual recovery review required');
  return {
    schemaVersion:1,
    format:'ledger-legacy-migration-preview',
    status:blocked||!Object.hasOwn(entries,LEGACY_KEYS.cv)?'blocked':'review-required',
    entries,versions,warnings,requiresUserConfirmation:true
  };
}
export function compareLegacySnapshot(plan,read){
  if(!plan||plan.format!=='ledger-legacy-migration-preview'||!plan.entries||typeof read!=='function')throw new TypeError('Invalid migration plan');
  for(const key of Object.keys(plan.entries))if(!DATA_KEYS.includes(key))throw new Error('Unexpected key in plan');
  const changed=[];
  for(const key of DATA_KEYS){
    const expected=Object.hasOwn(plan.entries,key)?plan.entries[key]:null;
    try{if(read(key)!==expected)changed.push(key);}
    catch{changed.push(key);}
  }
  return {unchanged:changed.length===0,changedKeys:changed};
}
