# UI workspace merge review — 17 November 2026

**Intended target:** `main` of `adjeiemmaaegh-web/Dr.Emma-Cv`; no production site change.

**Source UI commit:** `d63b06011b9d7de0b02158f7752a6d8aa25fe64e` on `ccr-ab0ff4bd-xasuiz`.
**Current verified A-D main parent:** `bd2a8be1d394a08151530784f799f51d395a239f`.
UI source branch was 41 commits behind and five ahead of main. Direct merging was rejected in favor of cherry-picking **30 new paths** (Group E modules, accessibility, PWA controls, five-view workspace, original browser tests, screenshots, docs) onto exact current main.

## Kept from current main
- Group A contracts, composition, backup and atomic IndexedDB revision store.
- Group B's async save race fix and async renderer adapter.
- Group C's edited-fact verification, safe reordering, aggregate revision invariants and AI allowlist.
- Group D's strict backup validation and protected import.
- Existing public E30/E31 builders, frozen source pins and `vercel.json` deployment policy: `git.deploymentEnabled.main=false`.

## Integration adjustments
- New onboarding and PWA status FeatureModules accept Group A's actual DOM `host`, as well as their previous `host.element` adapter; browser tests now assert Group A's direct host.
- Group B editor wrapper receives the `ledger-a11y` class so shared WCAG layout styles apply.
- Added dedicated no-deploy CI for all A–E Node tests plus real native Chromium onboarding, PWA, editor, accessibility negative control, five workspace views at 390/820/1440 widths in light/dark, editor export/reload and A–D browser regression.
- Exported `npm run test:experience` and `npm run test:ui-workspace` convenience scripts.

## Preview only — unaccepted release gates
- Workspace `src/features/experience/workspace/index.html` uses `ledger_workspace_preview_v1` **separate localStorage**; its UI is not connected to Group A's persistent storage or bundled into the public site. Real user content entered here stays only in this preview storage. Do not treat this as a production data migration.
- It does **not** replace the frozen legacy public UI; A's production composition and UI integration, storage/error/conflict controls, and review-first migration remain separate development work.
- Group E PWA update UI is not wired into the actual public service worker, which still uses automatic `skipWaiting`; do not claim update deferral is effective until a reviewed worker change and actual offline acceptance.
- Letters, interview and LinkedIn routes are not yet implemented inside the preview workspace. Stage 19 extension is not included.
- Native PDF/Word fidelity, full regional/RTL support, actual device browsers, human accessibility/screen reader testing, independent Group F validation and release signoff remain OPEN.

## Review and verification
See `.github/workflows/ui-workspace-integration.yml` and the PR's attached Actions results. Passing synthetic tests establishes only the listed tests; do not claim public release or full WCAG 2.2 AA conformance.
