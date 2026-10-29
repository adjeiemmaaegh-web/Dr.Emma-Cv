# E0 migration preview safeguards

The new pure `planLegacyMigration` API reads known storage entries without mutating browser storage. It captures exact text for a future **explicit, user-reviewed** backup/restore migration, flags invalid/oversized/blocked entries, allows corrupt quarantined text, and refuses to describe missing primary data as ready.

`compareLegacySnapshot` detects changed captured data before a future write. It is **not** an atomic lock: localStorage remains nontransactional. A separate tested application-level backup/export + restore UI and a transactional destination will be needed before migrations can be enabled.

No application code invokes the planner yet. Never log or upload the plan: `entries` contain private CV content. Diagnostic report code must only expose statuses, not entries. Tests use synthetic data only.

The current implementation intentionally does not:
- Automatically overwrite any customer data
- Change the Stage 8 HTML or any storage key
- Claim that parsing JSON proves the internal CV schema is valid
- Restore data or supply a cloud server
- Store AI keys or transmit CV content

Review all current schema shapes and test real browser behavior prior to activating migration.

## Schema preflight update (2026-10-30)

The planner now checks primary and recovery CV structure against the Stage 8 `ledgerValidStoredPayload` shape, including required document fields, appearance object, and bounded version list. It rejects parseable but incompatible CV JSON instead of treating parsing as sufficient. The separate Stage 6 application record is expected to be an array. The damaged-primary quarantine remains permissive so unreadable original bytes can be retained. The check is read-only and not a migration or a browser acceptance test.

Four new schema unit assertions were run in Node 22 locally and passed. The updated combined migration-planner suite and GitHub Actions workflow have not yet been independently executed in this environment; those gates remain open.

## Application record preflight (2026-10-30)

New `src/domain/storage/application-shape.mjs` extracts the legacy Stage 6 application validation constraints into a pure module: bounded record count, unique valid identifiers, required text fields and lengths, statuses, date syntax, and HTTP(S) URL syntax. The E0 migration planner now rejects parseable application arrays with invalid records. The unchanged Stage 8 application continues using its original validator; this module currently protects only migration planning.

The three dedicated new validation tests passed under local Node 22.16.0 in a faithful source copy. Complete repository verification and CI results still require independent execution, and the migration planner still performs no data writes.
