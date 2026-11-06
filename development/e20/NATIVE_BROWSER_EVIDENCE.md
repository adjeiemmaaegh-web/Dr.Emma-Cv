# E20 native-file Chromium development evidence — 2026-11-06

**Status: Linux Chromium development smoke PASS; production NO-GO.** No new deployment or release acceptance is authorized.

## Exact test provenance

- Repository: adjeiemmaaegh-web/Dr.Emma-Cv
- Review pull request: https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/1
- Tested source commit: `5f7c29c3f6128b7ce906d9aeec78d6859c161cb2`
- Workflow: `.github/workflows/e20-native-file.yml`
- Script: `tests/e20_native_file_smoke.py`
- Passing test run: https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/42226203810
- Browser: Playwright Chromium 1.57.0 on GitHub-hosted Ubuntu Linux; dedicated temporary persistent browser profile, deleted afterwards.
- Application SHA-256: `e95d851702931d1c4d0b4b3445d4db9d9a6051014529abf067e672576982848f` (unchanged owner-uploaded E20 HTML).

## Observed passing checks (test log)

1. Loaded the standalone E20 HTML directly by genuine `file://` URL, verified title/visible app shell and no page-level uncaught JavaScript exceptions.
2. Created an app-native **synthetic Store Manager demo CV** through the application UI in a clean browser profile.
3. Confirmed the synthetic CV remained visible after fully closing Chromium and relaunching with the same test profile and application file URL.
4. Independently checked a random QA-only localStorage key survived that browser restart; removed it afterwards.
5. Ran the separate offline QA page from a genuine local file URL, obtained no failing capability probes and verified its selected app hash/feature markers.
6. Ran the QA page's dedicated localStorage + IndexedDB restart-persistence drill. Its synthetic records survived browser restart and were cleaned up.
7. Observed no HTTP(S) requests from the app or QA in the instrumented pages.

## What this does NOT verify

This is **not** a Windows 11 Chrome/Edge execution, actual user-created CV exhaustive field-by-field persistence test, two-tab contention, power-loss/crash scenario, quota or denied-storage failure, native print/PDF/DOCX or calendar-client interoperability test, mobile/screen-reader/RTL signoff, reliable trained OCR, or authorized live BYOK provider compatibility.

The QA probe is isolated from real CV records; the native demo CV uses the application in a disposable browser profile. All original release gates stay OPEN pending the appropriate acceptance evidence.

The historical handover reports 669 Node tests and five synthetic Chromium workflows, but the complete E20 reproducible development source/test package was not supplied, so these historical tests were **not** rerun here.

See `ENGINEERING_HANDOVER.md` and `RELEASE_GATES.csv` for the unchanged release-gate definitions.
