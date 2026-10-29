# E0 legacy browser-storage inventory

Reviewed against the committed Stage 8 HTML. **Do not rename these keys until migration with user-validated backup and restore is implemented.**

| Key | Role |
|---|---|
| `ledger_cv_state_v2` | Primary user CV state; legacy name must be preserved |
| `ledger_cv_recovery_v24` | Recovery copy; preserved across damaged-state operations |
| `ledger_cv_damaged_primary_v1` | Quarantine for unreadable primary JSON |
| `ledger_cv_stage6_applications_v1` | Separate job-application records |
| `ledger_cv_storage_test_v28` | Diagnostic marker, not customer data |
| `ledger_s4_session_probe` | Session diagnostic marker |
| `ledger_s4_probe_<random>` | Temporary local persistence probe |

Stage 7 encrypted transfer selects primary CV, recovery, and applications keys; it is **not** proof of a complete automatic multi-key backup or restoration. Existing job application records remain stored separately from CVs.

The legacy CV write path uses a read-before-write check, saved backup and read-back verification, but localStorage does **not** provide atomic compare-and-swap, so simultaneous tab writes remain risky. File URL storage can change on file rename/move across browsers. Stage 8 remains the recoverable baseline.

## Migration principles

- No implicit destructive migration and no automatic promotion to IndexedDB.
- Pre-migration export and integrity verification must include all customer-owned datasets.
- Parse and validate candidate data without mutating existing storage.
- Capture a user-accessible recovery snapshot before writes.
- Make one explicit user-approved import/upgrade action; detect concurrent changes and abort.
- Verify after write, keep original recovery material, and document remaining non-atomic risks.
- Test browser restart, two-tab edits, quota failures and damaged JSON on actual devices during formal acceptance.

## E0 safeguards

`src/domain/storage/legacy-inspection.mjs` provides a pure read-only health inspection that never includes CV content in its report. `tests/unit/legacy-inspection.test.mjs` exercises absence, corruption, private-content redaction and denied storage access. These helpers are **not yet wired into the running Stage 8 app**.
