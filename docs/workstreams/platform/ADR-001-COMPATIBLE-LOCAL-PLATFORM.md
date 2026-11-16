# ADR-001 — Additive frontend contracts and local-only persistence

**Date:** 2026-11-17  
**Status:** Engineering candidate for owner + independent Group F review

## Context

E20–E31 are hash-pinned layered HTML build artifacts. Direct parallel editing would invalidate frozen snapshots and risk browser user data. The roadmap in draft PR #16 is an upstream proposal, not a merged authorization.

## Decision

1. Preserve the legacy HTML, 30 templates, print/export pipeline and browser storage unchanged. All platform features are opt-in and mounted in isolated DOM slots.
2. Contract v1 in `src/contracts/platform.d.ts` and `platform.mjs` is the published shape: evidence, profile, variant, job, application, import review, proposed patches, documents/renderer, storage and registration. Changes require a reviewed ADR, migration/adapter plan, independent tests and coordination with contract consumers.
3. `createFrontendComposition` serializes navigation, gives each module its own section and focus target, and calls registered cleanup before a new route. It does not assume React or expose private feature DOM.
4. New profile data uses an independent IndexedDB origin-scoped database with one write transaction for expected-revision CAS. It cannot make old localStorage atomic and may be unavailable on some origins; fail visibly.
5. Backup uses SHA-256, a size ceiling, pure review, and explicit user approval. Import never alters existing `ledger_cv_state_v2` or other legacy keys and cannot replace an existing new-profile record without a separate reviewed procedure.
6. For content integrity, variant edits retain the 12 most recent prior complete document snapshots. Older backups without `history` remain readable. The snapshot limit is not a permanent audit vault.

## Consequences and dependencies

- Feature teams can build against the contracts with mock ports while integration waits for A/F review. B owns export fidelity, C owns ATS/factual analysis, D owns tracker linkage, E owns onboarding/offline UX, F owns independent acceptance.
- A may amend the adapter, but cannot imply that E31 public HTML now consumes the new storage. Real browser origin and physical-device recovery tests remain mandatory.
- The PR is deliberately a non-deploying draft; keeping it unmerged is the immediate rollback strategy.
