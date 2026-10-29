/** Pure, read-only browser-independent legacy storage inspection.
 * Never mutates a Storage instance, to preserve the customer's baseline.
 */
export const LEGACY_KEYS = Object.freeze({
  cv:'ledger_cv_state_v2',
  recovery:'ledger_cv_recovery_v24',
  damaged:'ledger_cv_damaged_primary_v1',
  applications:'ledger_cv_stage6_applications_v1',
  storageProbe:'ledger_cv_storage_test_v28'
});
export function parseStoredJSON(raw) {
  if (raw === null) return {ok:false, reason:'absent'};
  try {
    const value=JSON.parse(raw);
    if (value===null || typeof value!=='object' || Array.isArray(value))
      return {ok:false,reason:'invalid'};
    return {ok:true,value};
  } catch {
    return {ok:false,reason:'unreadable'};
  }
}
export function inspectLegacyStorage(read) {
  const report={};
  for (const [name,key] of Object.entries(LEGACY_KEYS)) {
    if(name==='storageProbe')continue;
    let raw;
    try { raw=read(key); }
    catch {report[name]={status:'access-denied'};continue;}
    if(raw===null){report[name]={status:'absent'};continue;}
    const parsed=parseStoredJSON(raw);
    // No personal content or raw stored values in diagnostics.
    report[name]={status:parsed.ok?'json-valid':parsed.reason,bytes:new TextEncoder().encode(raw).length};
  }
  return report;
}
