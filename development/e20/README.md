# E20 Offline Calendar Import — development candidate (2026-11-06)

**Production NO-GO.** This folder retains byte-for-byte copies of the four owner-provided E20 artifacts. It is not a production release, hosted application, new GitHub Pages deployment, or claim that the source tree from the E20 development handover is present.

## Files

| File | SHA-256 |
| --- | --- |
| Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html | e95d851702931d1c4d0b4b3445d4db9d9a6051014529abf067e672576982848f |
| Ledger_CV_Studio_E20_Offline_QA_2026-11-06.html | 32a3828b1591e63f06623726a1d3af82b1cbb713e6b58b4941241668f887949f |
| ENGINEERING_HANDOVER.md | d89b5b1f4005b77f8fdc4c29d56382b05f0200d37a15a266e2f2ac406d805c1c |
| RELEASE_GATES.csv | 46ab1c9179ccaabb3dac6407105f85148106880eb3bcbfee3f85e5416c1d8918 |

## Scope and safe use

E20 adds opt-in bounded local .ics calendar import into **unlinked** career tasks after human review. It does not synchronize calendars or silently overwrite tasks. Normal use is offline-first, free and requires no Node, CMD or installation. The separate QA HTML runs isolated probes and records manual browser signoffs.

Use **synthetic test data**, not your only real CV. Save a backup before switching files: browser file:// storage depends on the browser, profile and file URL, and automatic migration between locations has not been proven. This candidate does not alter the existing Stage 8 HTML or Pages setup.

## Evidence boundary

The E20 handover reports 669/669 Node tests and five synthetic Chromium workflows. These are historical handover results, **not tests rerun in this repository**: the full E20 source ZIP, scripts and test suite were not provided. This repository independently checks only the four artifacts' hashes, QA pin, JS syntax and standalone asset boundary using:

    node --test tests/e20-artifact.test.mjs

Critical gates remain open: see ENGINEERING_HANDOVER.md and RELEASE_GATES.csv for Windows Chrome/Edge file:// boot, persisted CV storage and recovery, native PDF/DOCX, assistive technology/mobile/RTL and approved live BYOK provider checks. No production deploy, paywall, cloud, account system or external provider operation is authorized by this update.

## Native browser development evidence

A separate GitHub-hosted Linux Chromium run used genuine `file://` navigation, verified the app-created synthetic demo CV after a full browser-process restart, and checked the isolated QA localStorage/IndexedDB restart probes. See [native-browser evidence](NATIVE_BROWSER_EVIDENCE.md). This is **not Windows/Edge acceptance, real CV comprehensive recovery, or production signoff**. Both the E0 and E20 integrity checks passed on the review branch.
