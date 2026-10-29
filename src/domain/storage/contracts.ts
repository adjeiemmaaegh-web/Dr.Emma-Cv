/** Documentation-only, future migration contract. No legacy data is rewritten by E0. */
export const LEGACY_KEYS = Object.freeze({
  cv: 'ledger_cv_state_v2',
  recovery: 'ledger_cv_recovery_v24',
  damaged: 'ledger_cv_damaged_primary_v1',
  applications: 'ledger_cv_stage6_applications_v1',
  storageProbe: 'ledger_cv_storage_test_v28'
} as const);
export type LegacyStorageKey = typeof LEGACY_KEYS[keyof typeof LEGACY_KEYS];
export type ReadResult<T> =
  | {ok:true; value:T; raw:string}
  | {ok:false; reason:'absent'|'unreadable'|'invalid'; raw?:string};
export interface RecoveryManifest {
  schemaVersion: 1;
  capturedAt: string;
  entries: Partial<Record<LegacyStorageKey, string>>;
  sha256?: string;
}
export interface MigrationProposal {
  fromVersion: string;
  toVersion: string;
  sourceHash: string;
  sourceData: unknown;
  warnings: string[];
  requiresUserConfirmation: true;
}
