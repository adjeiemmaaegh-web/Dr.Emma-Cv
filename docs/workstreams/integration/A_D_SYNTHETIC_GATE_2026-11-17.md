# Group A–D integration: synthetic engineering gate (17 November 2026)

**Current artifact type:** versioned source and an HTTP-origin development preview. **Not a production or single-file end-user release.**
**Verified source commit:** `ead05374ee3b3efca5a8e1842eb0ef4f46fe414c`.
**Draft PR:** [#18](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/18), base `feat/ws-a-stages-00-03-foundation-2026-11-17` (Group A [draft PR #17](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/17)).
**Source parents:** A `8ba3284bb2d15dd22bacf753e21826807f0581b5`; 39 B/C/D-only file blobs taken from `ccr-ab0ff4bd-xasuiz`. **Eleven diverged shared paths were NOT overlaid onto A.** All prior A files remained from the newer verified baseline; B/C/D modules were additive.

## Scope and acceptance evidence

| Gate | Checked result | Status |
| --- | --- | --- |
| A contracts + isolated profile repo | Actual Chromium on HTTP localhost, revision conflict, cross-tab, corrupt records, backup and reload | **PASS** |
| B editor follows A mount API | `createFrontendComposition` mounts `editorFeature` using a real DOM host; UI edits persist after reload | **PASS** |
| B async save race | Later edits remain dirty after an earlier save completes; responsive 320 px + 1280 px tests | **PASS** |
| B versioned DocumentRenderer | Asynchronous PDF/DOCX/HTML adapter returns source variant and revision | **PASS (synthetic)** |
| C ATS, vacancy and evidence comparison | Rules execute against exported artifact and parsed vacancy; review-only matching; no ATS success probability | **PASS (synthetic)** |
| C tailoring | Only explicitly approved suggestions, source-only bullet reconstruction, strict fresh edited-fact checks and one aggregate CAS increment | **PASS (synthetic)** |
| C external AI permission boundary | HTTPS and exact allowed host required, single-use consent and ephemeral key | **PASS (adapter tests; no provider integration)** |
| D cover letter and application | Letter facts checked against CV/job; PDF export; exact CV/letter revision reference; application import requires review/confirmation | **PASS (synthetic)** |
| A/D profile recovery | Approved career backup rebased to repository revision zero only when creating a new record; variant document revisions, history, facts remain unchanged | **PASS (synthetic)** |
| No legacy user-data write | Browser sentinel `ledger_cv_state_v2` is unchanged by development preview | **PASS on fixture** |
| Combined Node tests | 133 enumerated, **132 passed, 0 failed, 1 skipped** | **PASS WITH SKIP** |
| Browser checks | Actual localhost Chromium: A IndexedDB, B 320/1280 editor, and A–D full journey/reload | **PASS** |
| Frozen E0/E20 integrity | Existing CI green on source head | **PASS automated** |
| Independent native Office/poppler export check | Test `exports are valid files for independent tools...` skips when those tools are absent | **OPEN (one skipped)** |
| Full public E30/E31 user integration | Demo only; no production shell mount | **OPEN** |
| F independent acceptance | No F reviewer or real device evidence | **OPEN** |

**Evidence:**
- [No-deploy A–D workflow #43992212317](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43992212317): contracts and native-browser jobs **SUCCESS**, Node test counts above, native Chromium success logs.
- [Independent duplicate A–D workflow #43992204015](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43992204015): successful.
- Existing Group A E0/E20 checks at this source revision are success; recheck E29 status on the exact later documentation commit as needed.

## User-visible synthetic development preview

Run on an **isolated development checkout only**; do not use actual customer CVs.

```sh
npm run test:ad-integration
npm install --no-save --ignore-scripts playwright@1.57.0
node tests/documents/editor-browser.mjs
node tests/integration/ad-browser.mjs
python -m http.server 8765
# Open http://127.0.0.1:8765/development/integration/ad-workbench.html
```

The preview has three actions: run the synthetic A–D pipeline, open the *composed* B editor connected to a separate IndexedDB profile store, or reopen that saved synthetic profile. It is an engineering demonstration, **not** evidence that customer-facing Stage 4, 5, 13–16 screens exist. Files are not packed into a single distributable HTML here.

## Corrected integration findings

1. **Host:** B formerly expected `host.element` while A supplied `host`; the integration candidate now uses A's contract unchanged.
2. **Renderer:** B's original `renderDocumentArtifact` remains supported; `createDocumentRenderer().render(request, signal)` adds A's async port. HTML is minimal semantic text HTML, not print-faithful output.
3. **Save race:** B accepts only the exact persisted snapshot; typing during async save remains dirty.
4. **Factual safety:** C revalidates all summary user edits, rejects forged ordering and source mismatches, and rebuilds bullet order from existing source.
5. **Single CAS write:** C's create+tailor command advances aggregate profile revision **once**, preserving variant-specific revisions.
6. **AI transport:** endpoint configuration is HTTPS and allowlisted; transport is injected and actual provider-specific HTTP compliance is **not proven** by this adapter.
7. **D import:** record status, core field types, valid dates, tasks, histories and linked CV/letter versions are checked before proposal and again before commit. An entry skipped for invalid data is disclosed in review warnings.
8. **Backup:** separately approved imported profiles reset only the local aggregate CAS counter before first save to an empty record; existing records remain overwrite-protected.

## Remaining plan gaps, ranked

**Blockers before calling Groups A–D accepted:**
- No single production-integrated UI or complete user-led create/edit/job/review/letter/application flow; a one-click synthetic pipeline does not establish UX readiness.
- Existing public E30 CV storage still uses non-atomic localStorage; independent browser/device and file-to-hosted migration require review.
- Group B: editor only exposes subset of fields, two-column templates are flattened, Unicode/RTL PDF is lossy, no labelled import corpus, no native Word/F20 layout signoff.
- Group C: no validated mapping to all **27 Enhancv check types**, no labelled matching corpus, heuristic factual guard is insufficient as a proof of truth, provider-specific AI calls and secure consent UI pending.
- Group D: no integrated letter/tracker/interview/LinkedIn user-facing screens or durable A-owned storage port for all D records; exact prior exported artifact snapshots not retained; region advice and translations unverified.
- Group E Stage 4/17–19 and Group F Stage 20 must be done in their assigned workstreams, not silently claimed by A–D.

**Governance:** keep PRs #17 and #18 draft/unmerged. No owner authorization for public release, Vercel promotion, customer data import, cloud storage, provider credentials or payments. The `development/` preview uses synthetic records only and is excluded from the public build path. Real Chrome/Edge/Firefox/Safari, mobile OS, accessibility, native Office, privacy, and actual owner acceptance remain unverified.

**Status:** `AUTOMATED_VERIFIED` for specifically enumerated synthetic engineering behaviors; **IMPLEMENTED_UNVERIFIED** or **OPEN** for all stage exit criteria outside that evidence; product release **NO-GO**. No external deployment was performed by this work.
