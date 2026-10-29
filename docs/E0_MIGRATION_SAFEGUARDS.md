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
