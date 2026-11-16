# Group A — Platform & Shared Contracts, Stages 0–3

**Engineering handoff — 17 November 2026.** Source: draft PR [#17](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/17). Authoritative proposed roadmap is **separate**, draft PR [#16](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/16), not yet merged into main. Do not treat this report as independent Group F acceptance or release approval.

## Stage 0: reproducible source, integrity and rollback

| Artifact/state | Engineering reference | Interpretation |
| --- | --- | --- |
| Main at start of Group A | `a561e3dd4384e4544f8b8056252e5b0498c0c67a` | Existing default branch; no direct edits |
| Frozen E30 output | SHA-256 `1dd5b058bc10e058825e37ec0de706f42efe2ac89c602a87909672f948dc546c`; 16,010,305 bytes | Read-only legacy reference |
| Standalone E31 candidate | SHA-256 `6061f2722dd9f6e2053aa17cf66c6b6a1e89e7f2ea69893df4e00ce753494eb7`; 16,013,266 bytes | Separate candidate path |
| E31 unified assembled site | SHA-256 `d378c37a8a39d6ae5df93506c63c9f7642d441fe4e522190c72a89c03820ff1c`; 16,030,042 bytes | **Development artifact only**, built from frozen E30; verified in initial Group A CI |
| Group A source | Branch `feat/ws-a-stages-00-03-foundation-2026-11-17`, draft PR #17 | Nonproduction, reviewable changes |
| Public hosted site (checked 17 Nov 2026) | Vercel production alias `ledger-cv-studio.vercel.app` points to READY deployment `dpl_31KP9yusL1pmYxY8Mi1ihtSQFJYY` from **E30 commit** `90ead4d177ef261aa77ef7a0bcf76aedc47859e0`; deployment build logs emitted the frozen E30 HTML SHA-256 `1dd5b058bc10e058825e37ec0de706f42efe2ac89c602a87909672f948dc546c` | E30 hosted build, **not E31 or this Group A branch**; independent end-user acceptance is still open |
| Group A Vercel status check | Reported failed/rate-limited (build quota) for PR branch | Separate hosting limitation; **not a passing deployment check and no Group A deployment authorized** |

To build/check in a clean checkout of the Group A branch: use Node 22, `npm install --no-save --ignore-scripts --no-audit --no-fund`, then `npm run verify:e0`, `npm run verify:platform`, `npm run build`, `node tools/audit-e31-candidate.mjs`, and `npm run audit:e31`. Native browser verification additionally needs Python 3.12, Playwright 1.57.0 and its Chromium binary; run `python tests/platform/platform_browser.py`. Public deployment, real customer files, passwords, cloud synchronization, payment and API credentials are not part of this work.

Initial engineering evidence: [Group A CI](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43975386909), [E31 CI](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43975386779), [E29 hosted regression](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43975386705) and [E20 integrity](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43975386574) passed at the original PR #17 commit. **Final source-code head before this documentation correction:** `23b71ddc63ded01be0895a8b1ab6506d1d9617b4`, with [Group A contracts and native Chromium](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43980175864), [E31 candidate](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43980176071), [E0](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43980175901), and [E20 integrity](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43980175970) all **SUCCESS**. [E29 hosted inherited](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43980175885) was still in progress at documentation edit. Test failures encountered while extending corruption checks were corrected with the memory-row identity fix; retain failed runs in the audit trail. Each later change requires fresh checks; prior green checks are not evidence for changed source.

Rollback: do not merge or deploy PR #17 until reviewed. Revert the additive Group A PR or disable new feature registration; the legacy `ledger_cv_state_v2` and recovery/application keys are never changed by new production source. Existing E30 pinned bytes and Stage 8 HTML are kept untouched. A different `file://` path can have different browser storage and must not be silently migrated.

## Stage 1: contract and file ownership

- **Versioned public boundary:** `src/contracts/platform.d.ts`, `platform.mjs` (contract v1); the feature registry and `src/core/composition-root.mjs` provide explicit, serialized, scoped route mount/unmount, focus and cleanup. Feature authors register modules, not edits to `docs/index.html`.
- **Design boundary:** `src/ui/system/tokens.css` is scoped to `.ledger-platform-root`. It intentionally does not restyle the 30 legacy document templates or replace E30 print geometry.
- **Owner A:** `src/core/**`, `src/contracts/**`, `src/domain/profile/**`, `src/domain/storage/**`, `src/ui/system/**`, `hosting/**`, `tools/**`, `package.json`, `vercel.json`, `.github/workflows/**`, `tests/platform/**`, `docs/workstreams/platform/**`.
- **Owner B:** editor/templates/documents/import/export/OCR feature folders. **Owner C:** ATS/job-match/tailoring/writing/intelligence. **Owner D:** career tracker/letters/interview/LinkedIn/career region. **Owner E:** onboarding/accessibility/PWA experience/extension. **Owner F:** integration, e2e, benchmarks, independent QA.
- **Shared legacy/frozen:** `Ledger_CV_Studio_Stage8_Free_Finalization.html`, `development/e20/**` through `development/e31/**`, `source/legacy/**`, legacy `src/features/ui/**` and `src/legacy-unified-ux/**` are reserved/frozen unless assigned in an explicit reviewed ADR. Generated `docs/index.html` and `site/**` belong to A's integration build only.

**ADR-001:** Opt-in ESM module registration and a versioned JS/TypeScript structural contract are the integration seam. Reject direct B–E imports of A's private storage internals; use documented ports. Revisions, schema changes or new legacy adapters require an ADR, consumer fixture, and A+F approval. New modules currently run **only** in the isolated [profile workbench](../../../development/group-a/profile-workbench.html), not in the public legacy editor.

## Stage 2: storage, recovery and negative cases

- Independent profile-only IndexedDB `ledger_cv_workspace_v1` with atomic expected-revision read/write **in one transaction**. The in-memory test port is not a cross-tab guarantee. IndexedDB can be denied by browser privacy settings; no fallback to legacy localStorage.
- `load` checks row identity, saved revision and profile schema before returning content; corruption produces `CORRUPT` instead of silent overwrite. `listIds` supports reopening local records after refresh. Failed transaction/collision does not report saved state. Quota and unavailable errors are distinct, and failures must surface to the user.
- Raw legacy backups also capture the four customer-owned primary/recovery/applications/damaged keys byte-for-byte (including malformed JSON and explicit null for absent keys) using `src/domain/storage/legacy-backup.mjs`. Checksum preview and explicit approval return a **manual restore plan only**, not a multi-key writer; users must never assume localStorage writes across those keys are atomic. These raw snapshots contain private unencrypted data and must never be committed or uploaded.
- Checksum-verified profile backups are previews until an explicit approval action. Legacy `ledger_cv_state_v2` import is a pure, read-only proposal pasted by the user; primary, recovery, damaged-primary and application keys remain untouched. `docs/STORAGE_MIGRATION_INVENTORY.md` lists legacy keys and non-atomic limitations.
- **No automatic restore into legacy state and no invisible migration.** A new profile backup contains profile variants, provenance and bounded previous-document snapshots, but it is **not** a complete backup of all legacy application datasets.

## Stage 3: master CV, variants and evidence

- Immutable master and independent tailored variants; edits require expected profile revision and master edits require explicit confirmation.
- Each edited CV retains at most 12 prior full document/appearance snapshots with independent monotonically increasing variant revisions; all snapshots are checksum-backed in full profile export. This history cap is documented and must be shown to the user before relying on it for archival retention.
- Imported facts remain user assertions. Evidence retains source, optional reference/path and the explicit owner-confirmation bit. No claim is auto-labelled independently verified.
- Pure conversion preserves compatible legacy CV document/appearance and versions for review, without reading or writing any legacy key itself.

## Stage gates / outstanding verification

| Gate | Engineering implementation | Acceptance status |
| --- | --- | --- |
| G0: E31 build and frozen rollback | CI scripts, frozen checksum gate and isolated build path | **Implemented; release/device acceptance pending** |
| G1: contracts, route composition, shared tokens | Additive ESM/TypeScript ports and workbench | **Implemented; integration by B–E not yet independently accepted** |
| G2: local data and profile isolation | Atomic IndexedDB, checksum preview, profile snapshots, synthetic tests | **Implemented; cross-device/real customer data acceptance pending** |
| Real-world release | Windows/Edge/Chrome/Safari/mobile, Word/PDF fidelity, storage denial/quota/interruption, accessibility/security, actual restoration | **Open; NO-GO** |

**Known limitations / not disguised as completion:** the existing legacy UI still owns its own non-atomic localStorage data path; this Stage A port does not repair all legacy editing failures. No actual customer backup was restored. Clean checkout CI does not prove all transitive dependency versions are locked because no lockfile is committed. `file://`, private browsing, storage eviction, mobile browsers and origin transfer need independent tests. Stage 1 UI system is intentionally an opt-in module seam, not a full replacement of every legacy control. Stage 20 Group F benchmarking and owner release authorization remain separate.
