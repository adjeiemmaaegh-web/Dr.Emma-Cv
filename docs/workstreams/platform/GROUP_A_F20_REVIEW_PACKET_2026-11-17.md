# Group A → independent F20 verification packet

**Candidate source:** `2d4f3b7792bc20b934c87495c28f99d39b270f29` (17 Nov 2026).  
**Owner workstream:** A, Stages 0–3. **Independent reviewer:** not assigned or signed.  
**Roadmap:** [draft PR #16](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/16).  
**Candidate:** [draft PR #17](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/17), unmerged/non-deploying.

## Reproduction and positive evidence

From a clean checkout at the exact candidate source commit, with Node 22:

```sh
npm run verify:e0
npm run verify:platform
npm run build
npm run audit:e31
python -m pip install playwright==1.57.0
python -m playwright install chromium
python tests/platform/platform_browser.py
```

Automated evidence linked to this source code:
- [Group A native-profile and contract jobs](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43988235523): both **SUCCESS**; actual HTTP-origin Chromium checks include reload persistence, independently opened two-tab conflicts, workbench unsaved-draft protection and stale-tab rejected save with draft retained.
- Node platform suite: **35 passed, 0 failed**. Inherited E0 Node unit suite: **16 passed, 0 failed**. These are separate from other inherited build/audit checks.
- [E0](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43988245752) and [E20 integrity](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43988245737) were successful at source revision. E31 and E29 runs must be checked independently at this source revision; never infer results from older green commits.
- Legacy keys, hash-pinned historical sources, generated site and existing user records are unchanged by Group A test fixtures; no cloud or customer data is used. The source is still **not mounted in public E30**.

## Failure/acceptance matrix

| Risk or gate | Evidence in PR #17 | Reviewer disposition |
| --- | --- | --- |
| Stage 8 and E30 frozen source integrity | E0/E20 build-hash and platform static audits | Automated tested; independent hash audit pending |
| E31 candidate build/run | Workflow and build scripts | Automated tested on corresponding commit; public release pending |
| Independent master vs tailored variant | Immutable domain unit tests | Automated tested; full B5 UI pending |
| Snapshot restore preserves displaced current state | Domain tests + native workbench round trip | Automated tested for synthetic profile |
| IndexedDB same-transaction expected-revision CAS | Actual Chromium contention from two tabs | Automated tested on localhost only |
| Profile reload persistence | Native Chromium reload and profile reopen | Automated tested on localhost only |
| Corrupt stored record | Native schema corruption test | Automated tested on synthetic record |
| Denied/quota/invalid request failure | Node fault injection, typed errors | Automated tested; real-device quota/denial unverified |
| Unsaved draft protection and stale-tab failure | Native Chromium switch-cancel, background save and conflict draft retention | Automated tested on localhost only |
| Legacy primary/recovery/apps/damaged raw backup | Exact string tests, integrity preview, mutation double-scan | Automated tested; native legacy restore NOT performed |
| Mixed legacy read consistency | Two-pass comparison catches observed mid-read mutations | Best-effort only; no atomic multi-key guarantee |
| file:// path change → hosted-origin recovery | Origin migration rules documented | **OPEN; not tested end to end** |
| Windows/Edge/Firefox/Safari/Android/iOS | No comparable device evidence | **OPEN** |
| Real Office/PDF page/render parity | B7 and independent review own this | **OPEN** |
| Accessibility (screen reader/keyboard/mobile) | Scoped focus CSS and basic browser navigation only | **OPEN** |
| B/C/D/E integrated demo from master to job/letter/export/restore | Public ports defined; isolated workbench only | **OPEN** |
| Locked transitive dependency graph | No committed lockfile in this candidate | **OPEN** |
| Independent F20 issue triage / user benchmarks | Not started by independent reviewer | **OPEN** |

## Named handoff risks for F20 and integration owners

1. **Critical — legacy editor:** the public E30 UI still writes non-atomic localStorage. Group A's new isolated IndexedDB port cannot retrospectively protect it.
2. **High — incomplete cross-origin recovery:** user data is origin-scoped, and there is no verified user-safe transfer across file paths/hosted origins.
3. **High — no independent data restore or native Office/export signoff:** no real customer backup is used or requested by this PR.
4. **Medium — source reproducibility limitation:** E31 hash checks have been run, but the dependency tree is not fully pinned in a committed lockfile.
5. **Integration — no public feature mount:** the A workbench is a development-only route; the common cross-module synthetic workflow is not yet executable.
6. **Privacy — backups are unencrypted private data:** a checksum detects accidental mutation but does not encrypt or authenticate provenance.

## Evidence/approval separation

The *engineering* candidate can be described as **AUTOMATED_VERIFIED for the specifically listed Group A tests** when all corresponding jobs pass. **The stages are not ACCEPTED**, and F20 cannot be self-signed by the implementation author. No merge, branch protection change, real-data import, production alias modification or cloud action follows from this packet. The owner and independent F reviewer must sign the final applicable gate separately.
