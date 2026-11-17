/** Public, browser-safe, versioned interface constants. No backend required. */
export const LEDGER_CONTRACT_VERSION=1;
export const LEDGER_PROFILE_SCHEMA=1;
export const LEDGER_STORAGE_DATABASE='ledger_cv_workspace_v1';
export const LEDGER_ERRORS=Object.freeze({
 CONFLICT:'CONFLICT',INVALID:'INVALID',UNAVAILABLE:'UNAVAILABLE',
 QUOTA:'QUOTA',CORRUPT:'CORRUPT',UNCONFIRMED:'UNCONFIRMED'
});
export const LEDGER_EVIDENCE_SOURCES=Object.freeze(['user-asserted','document','verified-by-user']);
export const LEDGER_APPLICATION_STATUSES=Object.freeze(['Saved','Applied','Interview','Offer','Rejected','Withdrawn']);
export function contractError(code,message){
 if(!Object.values(LEDGER_ERRORS).includes(code))throw new TypeError('Unknown error code');
 const error=new Error(message||code);error.code=code;return error;
}
export function isSafeId(value){
 return typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{5,79}$/.test(value);
}
export function cloneData(value){
 if(value===undefined)throw contractError('INVALID','Undefined is not stored data');
 return JSON.parse(JSON.stringify(value,(key,val)=>{
  if(typeof val==='number'&&!Number.isFinite(val))throw contractError('INVALID','Nonfinite value');
  if(typeof val==='bigint'||typeof val==='function'||typeof val==='symbol')
   throw contractError('INVALID','Unsupported stored value');
  return val;
 }));
}
export function isPlainObject(value){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
}
