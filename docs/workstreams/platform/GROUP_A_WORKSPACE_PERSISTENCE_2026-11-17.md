# Group A continuation — new workspace persistence and data recovery
Date: 17 November 2026. Branch: `feat/group-a-workspace-persistence-2026-11-17`.

## Intended integration
This increment wires the polished five-view development workspace to the A Stage 2–3 career-profile database, preserving master and tailored revisions, CAS single-transaction save, and separate application-book CAS in its own IndexedDB. Public E31 HTML and hash-pinned historical files remain unchanged; production Git deployment remains disabled.

Changes:
- `src/core/workspace-persistence.mjs`: default new-workspace runtime; serialized and debounced profile saves, affirmative master-edit session, exact snapshot acknowledgements, bounded prior CV history, unsaved-draft export, fail-closed quota/conflict handling, guarded reopen, separate tailored versions and explicit restore.
- `src/domain/storage/application-revision-store.mjs`: new application-book IndexedDB store `ledger_cv_workspace_applications_v1`, using one readwrite transaction for expected-revision CAS; old app keys stay untouched.
- `src/features/experience/workspace/`: default `index.html` opens persistent IndexedDB, with `?sample=1` retaining the *isolated* original demo store for no-real-data screenshots. Exposes error banner, master consent, profile/versions/history/recovery/backup/import review, and user-controlled offline update when a waiting worker exists.
- Legacy transfer is **only user initiated**. Two distinct downloadable backups are required before import, legacy transfer additionally requires a complete raw four-key backup, and all proposed imported profiles are new records with collision rejection. Raw backup is never automatically applied to legacy localStorage. Profile and application records have separate transactions and backups; no atomic cross-dataset claim.
- Service-worker template no longer activates updates at install. A matching user-approved `SKIP_WAITING` message is required; Group E update manager blocks while unsaved work exists. Do not claim this is field-accepted until real hosted-origin update testing.

## Verification and release caveats
Run `.github/workflows/group-a-workspace.yml` and retain exact Actions commit/results. New tests cover real HTTP-origin Chromium IndexedDB restart, independent two-tab conflict, draft export, user-approved profile migration, protected legacy localStorage; Node tests cover repeated save, revision restoration, application CAS, denial/quota and import rejection; service-worker unit checks do not constitute real update lifecycle acceptance.

NOT COMPLETE as independent *release acceptance*: real customer restore, cross-device Windows/Edge/Firefox/Safari/iOS/Android, `file://` → hosted origin migration, actual offline update switching with dirty data, human accessibility and independent Group F signoff. Template/print/AI accuracy gates remain assigned to B/C/F.

## Rollback
This source adds a separate opt-in workspace and separate app database, does not remove or mutate legacy data. Revert this PR or disable workspace route without deleting stored data. Do not auto-delete orphaned IndexedDB on rollback. Backups are unencrypted: protect files and do not upload to GitHub.
