/** Pure preflight shape checks, matched to Stage 8 ledgerValidStoredPayload. */
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const ARRAY_FIELDS = ['experience','education','skills','languages','certifications','projects','accomplishments','customSections'];
export function validLegacyDocument(doc) {
  return isRecord(doc) && isRecord(doc.personalInfo) &&
    ARRAY_FIELDS.every(k => Array.isArray(doc[k]) && doc[k].every(isRecord)) &&
    ['summary','hobbies','references'].every(k => typeof doc[k] === 'string');
}
export function validLegacyCVState(value) {
  return isRecord(value) && validLegacyDocument(value.document) && isRecord(value.appearance) &&
    (value.versions === undefined || (Array.isArray(value.versions) && value.versions.length <= 30 &&
      value.versions.every(v => isRecord(v) && validLegacyDocument(v.document))));
}
export function validateLegacyEntry(key, value) {
  if (key === 'ledger_cv_state_v2' || key === 'ledger_cv_recovery_v24')
    return validLegacyCVState(value);
  if (key === 'ledger_cv_stage6_applications_v1')
    return Array.isArray(value);
  return isRecord(value) || Array.isArray(value);
}
