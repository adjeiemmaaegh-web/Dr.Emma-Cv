# Stage 20 — F independent acceptance handoff and evidence index
**Baseline:** `adjeiemmaaegh-web/Dr.Emma-Cv` / `main` `d8f639770f547f2863b105980c6df01e430ae1ec`.
**Assigned owner:** Group F independent QA. **Scope:** QA-only, not a new A–E feature set.

## Boundaries and reproducibility
F owns `tests/integration/f20-*`, `tests/e2e/f20-*`, `benchmarks/f20/**`, `qa/f20/**`, and `docs/release/**`. A minimal `.github/workflows/ws-f-stage-20.yml` is the **A-owned CI integration exception** requiring the technical integrator's review. This branch never edits source features, builds, legacy checksum-pinned HTML, configuration, data or deployment settings.

- Node independent negative tests: invented claims, edited prompts, stale patches, missing evidence, backup tampering, profile/job/application CAS conflict, exact linked revision, tracker import approval, ATS metadata and Unicode disclosure.
- Native parser matrix: 30 templates × 2 papers × PDF/DOCX = **120 synthetic documents**; checksum manifest, Poppler PDF extraction and independent Python DOCX XML extraction. Baseline target: all eight synthetic critical facts preserved per artifact, valid page dimensions and original job order. The results report percentages **only for the labeled synthetic corpus**.
- Actual hosted site: real Playwright Chromium, Firefox, WebKit loaded from the emitted `site/` folder, on a local HTTP origin. Check new A–E routes, consented editing/restart, PDF/Word bytes, job+letter+app, backup, no injected HTML execution, offline PWA, no external requests and legacy E31 fallback. These engines on Linux CI **are not physical Windows/macOS/iOS/Android acceptance**.
- Automated A–E regression suite is rerun; all failures, skips and incomplete jobs must be recorded.
- Competitor: official 27 categories mapped conservatively; direct 6, partial 13, not assessed 8. No head-to-head experiment run. Live competitor user account and blinded 120-participant study are separate manual gates.
- Complete open defect list: `qa/f20/DEFECT_LEDGER.md`; device, Office, crash and assistive sign-off `qa/f20/MANUAL_ACCEPTANCE_PROTOCOL.md`; comparative study `benchmarks/f20/COMPARATIVE_PROTOCOL.md`.

## Commands from a clean Node 22 checkout
```sh
npm install --no-save --ignore-scripts --no-audit --no-fund
node --test tests/integration/f20-*.test.mjs
npm run build && npm run audit:hosted
F20_OUTPUT=./f20-native node benchmarks/f20/generate-export-matrix.mjs
F20_OUTPUT=./f20-native python3 benchmarks/f20/check-native-parsers.py
F20_REPORT_DIR=./f20-evidence node benchmarks/f20/evaluate-claims.mjs
# install playwright@1.57.0 test-only; npx playwright install --with-deps chromium firefox webkit
F20_BROWSER=chromium F20_REPORT=./f20-chromium.json node tests/e2e/f20-published-browser.mjs
```
Requires installed system `pdftotext` / `pdfinfo` for native PDF extraction; CI does not require Word or Enhancv credentials. All generated CVs are invented. No private files are committed to repository or published Vercel output.

## Stage status and release decision
**Current state: F20 automation implemented and PARTIALLY VERIFIED; final F20 acceptance BLOCKED.** The published-site WebKit offline-reload gate remains INCOMPLETE; automated/browser QA is not owner or physical-device acceptance. Native Office, real-device accessibility and storage recovery, competitor blind study, authenticated vendor comparison, and owner signoff remain **NOT RUN**. Release recommendation: **NO-GO** until S1 blockers and owner acceptance close. Vercel Hobby quota blocked the previous requested deployment; F does not retry automatically or enable Vercel production auto-deployment.

Each CI run emits machine-readable native-parser, browser and comparative-inventory evidence plus emitted build integrity SHA-256. Link exact GitHub Actions run IDs and hashes in the PR after CI. Historical source hashes are not acceptance of new UI.

## Independent CI checkpoint — 17 November 2026

- **Source commit:** `92cc2438ff0487669c36efaf46be87eb1d094da5` on F's review branch.
- **GitHub Actions run:** [44012137434](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/44012137434).
- `independent-node-and-native`: **PASS**. F20 tests 11/11; combined A–E Node tests 173 passed, 1 skipped, 0 failed. All 120 synthetic files passed native parser checks, with 960/960 labeled synthetic critical fields preserved.
- `published-browser-matrix (chromium)`: **PASS** on the exact generated hosted `site/` artifact, including established A–E browser journeys and offline reload.
- `published-browser-matrix (firefox)`: **PASS** on the emitted hosted artifact, including offline reload.
- `published-browser-matrix (webkit)`: **INCOMPLETE / REQUIRED JOB RED**. Ten tested checks passed (basic workflow, PDF/DOCX download, backup, offline-origin control, responsive a11y, privacy and E31 legacy fallback). WebKit Inspector could not verify actual offline reload; even offline cached fetch gave `TypeError: Load failed`. Failure is recorded in [issue #25](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/issues/25), **not quietly waived**. No real macOS/iOS Safari result exists.
- **Overall CI:** 3 of 4 jobs passed, 1 intentionally fails closed on a missing mandatory offline evidence gate. This is an accurate **F20 NO-GO**, not an app-wide failure classification.
- **Comparative evidence:** Only publicly advertised Enhancv checker taxonomy compared to named local rule inventory; **6 directly mapped, 13 partial, 8 not assessed**. Actual side-by-side vendor quality comparison, accuracy, 120-participant blinded study and winner/tie/loser are **UNVERIFIED**.
- **Hosted artifact fingerprint:** deterministic workspace homepage SHA-256 `4080bed02c6de4e89b2bc7f132d4a3b83202b50e0933841e3770a8ead76298b9`; verified preserved E31 fallback SHA-256 `d378c37a8a39d6ae5df93506c63c9f7642d441fe4e522190c72a89c03820ff1c` from successful builder log.

**Production remains NO-GO**. No external deployment or automatic production release is triggered by this QA branch. Before final acceptance: resolve F20-012 by independent physical Safari/device tests, native Office/document visual fidelity, full storage/crash recovery, assistive-device matrix, legitimate Enhancv comparative study, and explicit owner sign-off. Record real results, not projected metrics.
