# Ledger CV Studio E20 — engineering completion evidence (6 November 2026)

**Development increment: prepared for review. Production release: NO-GO.**

This document supplements, and does **not** overwrite or close, the owner's original `RELEASE_GATES.csv`. Its purpose is to distinguish what was directly reproduced on GitHub Actions from older simulated evidence and from hardware/authorization requirements that remain open.

## Immutable application and privacy

- E20 offline-first standalone HTML SHA-256: `e95d851702931d1c4d0b4b3445d4db9d9a6051014529abf067e672576982848f`.
- The four supplied E20 artifacts remain byte-identical to the original uploads. There were no runtime app, CV schema, migration, DOCX generation, OCR, external API, or Pages entry-point changes.
- All browser tests create **synthetic** CV / application / calendar data in a disposable isolated Chromium profile or simulated localStorage; none use real applicant data, connected accounts, credentials, or cloud requests.

## New independent tests in this review branch

1. `tests/e20-artifact.test.mjs` — exact frozen four-file SHA-256 matches, QA pin, embedded scripts parse, standalone JS/CSS boundary, original NO-GO text.
2. `tests/e20_native_file_smoke.py` — **real** Linux Chromium `file://` boot, built-in demo CV remains across full browser restart, QA capabilities, actual app hash, isolated localStorage+IndexedDB restart probe, zero external HTTP(S) requests.
3. `tests/e20_native_calendar_acceptance.py` — real file-origin `.ics` selection, review-only/cancel, opt-in selective approval, recurrence exclusion, HTML inertness, local task creation, duplicate UID idempotency, real two-tab stale-write protection, quota-denial preservation, browser-process restart with imported tasks surviving, zero HTTP(S) requests.
4. `tests/e20_native_document_acceptance.py` — A4 and US Letter built-in synthetic CV export through the actual app; ZIP CRC and OOXML section dimensions and name/role/experience fields; native Chromium-generated PDFs checked for correct size, selectable text, and all required synthetic content. **This is not Microsoft Word, visual user acceptance, or a 30-template audit.**
5. Original inherited E0 baseline tests and credential guard still run. A pre-existing false-positive credential guard in the E0 script was fixed without weakening its intended scan.

## Current acceptance interpretation

| Area | New evidence | Release gate |
| --- | --- | --- |
| Source integrity / no unexpected remote assets | GitHub Actions SHA-256 + inline parser and browser request observation | Development PASS; production requirements unchanged |
| Real browser boot | Linux headless Chromium genuine `file://`, not `about:blank` | Windows Chrome+Edge **OPEN** |
| Application storage | Isolated real Chromium demo CV saved/restarted; standalone QA IndexedDB/localStorage restart | Cross-browser real-user, crash/reload and recovery **OPEN** |
| Calendar import | Real file origin with consent/cancel/duplicate/cross-tab/quota/restart cases | External Google/Apple/Outlook exported-file interoperability **OPEN** |
| PDF + DOCX | Synthetic A4/Letter native Chromium PDF extraction and DOCX package XML | Windows native Word + visual print/template approval **OPEN** |
| Accessibility / localization / devices | Prior synthetic coverage only | NVDA/VoiceOver/mobile/RTL native signoff **OPEN** |
| Optical character recognition | Experimental Latin recognizer only | Reliable trained offline OCR & measured real-scanned corpus **OPEN** |
| BYOK provider | No credentials or network permissions used | Authorized real-provider interoperability **OPEN** |

**The historical E20 669/669 Node suite has not been independently rerun** because the source ZIP and entire historical test suite were not provided. The newly added checks do not replace it.

## Release control

- Keep `main` unchanged and do not change the GitHub Pages entrypoint without a separate explicit release decision. Development candidate files live under `development/e20/`.
- Do not assert that GitHub CI automatically certifies Windows, Apple, live provider use or physical screen-reader compatibility.
- **No deployment, payment activation, online CV storage, external API enablement, or production launch is performed by these checks.**
- Never overwrite the only real CV records while testing. Use a disposable browser profile and original HTML path, and make a manual JSON backup before switching files (because `file://` storage identity is browser/location dependent).

## Remaining owner-controlled signoff

The owner must still provide or run hardware/browser acceptance for Windows 11 Chrome and Edge, actual CV save/reload and cross-tab/drill, native Word and full print/template inspection, and screen reader/mobile/Arabic/French/Spanish review. Only explicitly approved disposable credentials may be used for the optional provider check. There is currently no independently scored corpus establishing acceptable OCR accuracy. These are genuine blockers, not documentation chores that can safely be marked passed without evidence.

**Conclusion: source-preserving E20 review candidate with additional real Linux Chromium evidence; production NO-GO.**
